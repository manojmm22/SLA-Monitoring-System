"""
Audit log API routes.
Provides read-only access to system audit logs with filtering.
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.models.log import AuditLog
from app.utils.response import success_response, paginated_response
from datetime import datetime, timedelta

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """List audit logs with pagination and filters."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    resource = request.args.get('resource')
    days = request.args.get('days', type=int)

    query = AuditLog.query

    if user_id:
        query = query.filter_by(user_id=user_id)
    if action:
        query = query.filter_by(action=action.upper())
    if resource:
        query = query.filter_by(resource=resource.lower())
    if days:
        since = datetime.utcnow() - timedelta(days=days)
        query = query.filter(AuditLog.timestamp >= since)

    pagination = query.order_by(AuditLog.timestamp.desc()).paginate(
        page=page, per_page=per_page
    )
    return paginated_response(
        [log.to_dict() for log in pagination.items], pagination
    )


@audit_bp.route('/actions', methods=['GET'])
@jwt_required()
def get_audit_actions():
    """Get distinct action types for filter dropdowns."""
    actions = (
        AuditLog.query
        .with_entities(AuditLog.action)
        .distinct()
        .all()
    )
    return success_response([a[0] for a in actions if a[0]])


@audit_bp.route('/resources', methods=['GET'])
@jwt_required()
def get_audit_resources():
    """Get distinct resource types for filter dropdowns."""
    resources = (
        AuditLog.query
        .with_entities(AuditLog.resource)
        .distinct()
        .all()
    )
    return success_response([r[0] for r in resources if r[0]])
