from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.utils.database import db
from app.utils.response import success_response, paginated_response
from datetime import datetime

alerts_bp = Blueprint('alerts', __name__)


@alerts_bp.route('/', methods=['GET'])
@jwt_required()
def get_alerts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    severity = request.args.get('severity')
    service_id = request.args.get('service_id', type=int)

    query = Alert.query
    if status:
        try:
            query = query.filter_by(status=AlertStatus(status.lower()))
        except ValueError:
            pass
    if severity:
        try:
            query = query.filter_by(severity=AlertSeverity(severity.lower()))
        except ValueError:
            pass
    if service_id:
        query = query.filter_by(service_id=service_id)

    pagination = query.order_by(Alert.created_at.desc()).paginate(page=page, per_page=per_page)
    return paginated_response([a.to_dict() for a in pagination.items], pagination)


@alerts_bp.route('/<int:id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(id):
    alert = Alert.query.get_or_404(id)
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = int(get_jwt_identity())
    db.session.commit()
    return success_response(alert.to_dict(), 'Alert acknowledged')


@alerts_bp.route('/<int:id>/resolve', methods=['POST'])
@jwt_required()
def resolve_alert(id):
    alert = Alert.query.get_or_404(id)
    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = int(get_jwt_identity())
    db.session.commit()
    return success_response(alert.to_dict(), 'Alert resolved')


@alerts_bp.route('/<int:id>/dismiss', methods=['POST'])
@jwt_required()
def dismiss_alert(id):
    alert = Alert.query.get_or_404(id)
    alert.status = AlertStatus.DISMISSED
    alert.dismissed_at = datetime.utcnow()
    alert.dismissed_by = int(get_jwt_identity())
    db.session.commit()
    return success_response(alert.to_dict(), 'Alert dismissed')


@alerts_bp.route('/stats', methods=['GET'])
@jwt_required()
def alert_stats():
    total = Alert.query.count()
    active = Alert.query.filter_by(status=AlertStatus.ACTIVE).count()
    critical = Alert.query.filter_by(severity=AlertSeverity.CRITICAL).count()
    return success_response({
        'total': total,
        'active': active,
        'critical': critical,
        'resolved': Alert.query.filter_by(status=AlertStatus.RESOLVED).count()
    })
