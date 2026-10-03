"""
Notification API routes.
Provides notification history and read/unread management.
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.notification import Notification
from app.utils.database import db
from app.utils.response import success_response, error_response, paginated_response
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for the current user."""
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', '').lower() == 'true'

    query = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)

    pagination = query.order_by(Notification.created_at.desc()).paginate(
        page=page, per_page=per_page
    )
    return paginated_response(
        [n.to_dict() for n in pagination.items], pagination
    )


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    """Get count of unread notifications."""
    user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(
        user_id=user_id, is_read=False
    ).count()
    return success_response({'count': count})


@notifications_bp.route('/<int:id>/read', methods=['POST'])
@jwt_required()
def mark_read(id):
    """Mark a single notification as read."""
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(
        id=id, user_id=user_id
    ).first_or_404()
    notification.is_read = True
    db.session.commit()
    return success_response(notification.to_dict(), 'Notification marked as read')


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    """Mark all notifications as read for the current user."""
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(
        user_id=user_id, is_read=False
    ).update({'is_read': True})
    db.session.commit()
    return success_response(message='All notifications marked as read')


@notifications_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_notification(id):
    """Delete a notification."""
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(
        id=id, user_id=user_id
    ).first_or_404()
    db.session.delete(notification)
    db.session.commit()
    return success_response(message='Notification deleted')
