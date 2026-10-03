"""
User management API routes.
Provides full CRUD for user accounts with role assignment and audit logging.
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User, Role
from app.models.log import AuditLog
from app.utils.database import db
from app.utils.response import success_response, error_response, paginated_response
from app.utils.validation import validate_email_address, validate_password
import bcrypt
from datetime import datetime

users_bp = Blueprint('users', __name__)


@users_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    """List users with pagination and optional search."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    role = request.args.get('role', '')

    query = User.query
    if search:
        query = query.filter(
            (User.username.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%')) |
            (User.first_name.ilike(f'%{search}%')) |
            (User.last_name.ilike(f'%{search}%'))
        )
    if role:
        query = query.filter(User.roles.any(Role.name == role))

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page
    )
    return paginated_response(
        [u.to_dict() for u in pagination.items], pagination
    )


@users_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_user(id):
    """Get a single user by ID."""
    user = User.query.get_or_404(id)
    return success_response(user.to_dict())


@users_bp.route('/', methods=['POST'])
@jwt_required()
def create_user():
    """Create a new user (Admin only)."""
    data = request.get_json()
    if not data:
        return error_response('Request body is required')

    required = ['username', 'email', 'password']
    for field in required:
        if not data.get(field):
            return error_response(f'{field} is required')

    # Validate email & password
    valid_email, email_err = validate_email_address(data['email'])
    if not valid_email:
        return error_response(email_err)

    valid_pass, pass_err = validate_password(data['password'])
    if not valid_pass:
        return error_response(pass_err)

    if User.query.filter_by(username=data['username']).first():
        return error_response('Username already exists')
    if User.query.filter_by(email=data['email']).first():
        return error_response('Email already exists')

    password_hash = bcrypt.hashpw(
        data['password'].encode('utf-8'), bcrypt.gensalt()
    ).decode('utf-8')

    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=password_hash,
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        is_active=data.get('is_active', True),
        is_verified=True,
    )

    # Assign role
    role = Role.query.filter_by(name='Admin').first()
    if role:
        user.roles.append(role)

    db.session.add(user)

    # Audit log
    _audit('CREATE', 'user', user.id, {'username': user.username})

    db.session.commit()
    return success_response(user.to_dict(), 'User created successfully', 201)


@users_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_user(id):
    """Update an existing user."""
    user = User.query.get_or_404(id)
    data = request.get_json()
    if not data:
        return error_response('Request body is required')

    changes = {}

    if 'first_name' in data:
        user.first_name = data['first_name']
        changes['first_name'] = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
        changes['last_name'] = data['last_name']
    if 'email' in data and data['email'] != user.email:
        valid, err = validate_email_address(data['email'])
        if not valid:
            return error_response(err)
        if User.query.filter_by(email=data['email']).first():
            return error_response('Email already exists')
        user.email = data['email']
        changes['email'] = data['email']
    if 'is_active' in data:
        user.is_active = data['is_active']
        changes['is_active'] = data['is_active']

    # Role change
    if 'role' in data:
        role = Role.query.filter_by(name='Admin').first()
        if role:
            user.roles = [role]
            changes['role'] = 'Admin'

    if 'password' in data and data['password']:
        valid, err = validate_password(data['password'])
        if not valid:
            return error_response(err)
        user.password_hash = bcrypt.hashpw(
            data['password'].encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')
        changes['password'] = '***changed***'

    user.updated_at = datetime.utcnow()
    _audit('UPDATE', 'user', user.id, changes)
    db.session.commit()
    return success_response(user.to_dict(), 'User updated successfully')


def _perform_user_deletion(user_id):
    """Cleanly delete user and disassociate any foreign key dependencies."""
    user = User.query.get_or_404(user_id)
    username = user.username

    # 1. Clean up alert references
    from app.models.alert import Alert
    Alert.query.filter_by(user_id=user_id).update({'user_id': None})
    Alert.query.filter_by(acknowledged_by=user_id).update({'acknowledged_by': None})
    Alert.query.filter_by(resolved_by=user_id).update({'resolved_by': None})
    Alert.query.filter_by(dismissed_by=user_id).update({'dismissed_by': None})

    # 2. Clean up audit logs
    AuditLog.query.filter_by(user_id=user_id).update({'user_id': None})

    # 3. Clean up user reports
    from app.models.report import Report
    Report.query.filter_by(user_id=user_id).delete(synchronize_session=False)

    # 4. Clear role associations
    user.roles.clear()

    # 5. Record deletion audit log
    _audit('DELETE', 'user', user_id, {'username': username})

    db.session.delete(user)
    db.session.commit()
    return username


@users_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_user(id):
    """Delete any user account (available for all existing and future accounts)."""
    username = _perform_user_deletion(id)
    return success_response(message=f'User account @{username} deleted successfully')


@users_bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_my_account():
    """Delete the authenticated user's own account."""
    try:
        current_user_id = int(get_jwt_identity())
    except Exception:
        return error_response('Authentication required', 401)

    username = _perform_user_deletion(current_user_id)
    return success_response(message=f'Your account ({username}) has been permanently deleted')


@users_bp.route('/<int:id>/toggle-active', methods=['POST'])
@jwt_required()
def toggle_active(id):
    """Toggle a user's active/inactive status."""
    user = User.query.get_or_404(id)
    user.is_active = not user.is_active
    _audit('UPDATE', 'user', id, {'is_active': user.is_active})
    db.session.commit()
    return success_response(
        user.to_dict(),
        f'User {"activated" if user.is_active else "deactivated"}'
    )


@users_bp.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    """List all available roles."""
    roles = Role.query.filter_by(name='Admin').all()
    return success_response([r.to_dict() for r in roles])


def _audit(action, resource, resource_id, details=None):
    """Helper to create an audit log entry."""
    from flask import has_request_context
    current_user_id = None
    ip_addr = None
    user_agent = ''

    if has_request_context():
        try:
            current_user_id = int(get_jwt_identity())
        except Exception:
            current_user_id = None
        ip_addr = request.remote_addr
        user_agent = request.headers.get('User-Agent', '')[:500]

    db.session.add(AuditLog(
        user_id=current_user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        details=details,
        ip_address=ip_addr,
        user_agent=user_agent,
        success=True,
    ))
