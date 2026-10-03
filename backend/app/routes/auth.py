from flask import Blueprint, request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import datetime
from app.models.user import User, Role
from app.utils.database import db
from app.utils.response import success_response, error_response
from app.utils.validation import validate_email_address, validate_password
import bcrypt

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')
    email = (data.get('email') or '').strip()

    if not username or not password:
        return error_response('Username and password are required')

    if not email:
        email = f'{username}@local.local'

    valid_email, email_error = validate_email_address(email)
    if not valid_email:
        return error_response(email_error)

    valid_pass, pass_error = validate_password(password)
    if not valid_pass:
        return error_response(pass_error)

    if User.query.filter_by(username=username).first():
        return error_response('Username already exists')
    if User.query.filter_by(email=email).first():
        return error_response('Email already exists')

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        is_active=True,
        is_verified=True,
    )

    viewer_role = Role.query.filter_by(name='Viewer').first()
    if viewer_role:
        user.roles.append(viewer_role)

    db.session.add(user)
    db.session.commit()

    return success_response(user.to_dict(), 'User registered successfully', 201)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return error_response('Username or email and password are required')

    identifier = data['username'].strip()
    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()

    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return error_response('Invalid credentials', status_code=401)

    if not user.is_active:
        return error_response('Account is disabled', status_code=403)

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return success_response({
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(user_id))
    return success_response({'access_token': access_token})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return error_response('User not found', status_code=404)
    return success_response(user.to_dict())
