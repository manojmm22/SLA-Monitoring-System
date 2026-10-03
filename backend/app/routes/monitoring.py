from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.models.log import ApiLog, PerformanceLog
from app.models.service import Service
from app.utils.response import success_response, paginated_response
from app.utils.system_metrics import collect_host_metrics
from datetime import datetime, timedelta

monitoring_bp = Blueprint('monitoring', __name__)


@monitoring_bp.route('/live', methods=['GET'])
@jwt_required()
def live_monitoring():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    status = request.args.get('status')
    search = request.args.get('search')

    query = Service.query.filter_by(is_active=True)
    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(Service.name.ilike(f'%{search}%'))

    pagination = query.paginate(page=page, per_page=per_page)
    host_metrics = collect_host_metrics()
    results = []
    for service in pagination.items:
        latest_log = ApiLog.query.filter_by(service_id=service.id).order_by(ApiLog.timestamp.desc()).first()
        latest_perf = PerformanceLog.query.filter_by(service_id=service.id).order_by(PerformanceLog.timestamp.desc()).first()
        performance_payload = latest_perf.to_dict() if latest_perf else {}
        if performance_payload:
            performance_payload.update({
                'cpu_usage': host_metrics['cpu_usage'],
                'ram_usage': host_metrics['ram_usage'],
                'disk_usage': host_metrics['disk_usage'],
                'network_in': host_metrics['network_in_mb'],
                'network_out': host_metrics['network_out_mb'],
                'process_count': host_metrics['process_count'],
                'thread_count': host_metrics['thread_count'],
                'timestamp': host_metrics['timestamp'],
            })
        results.append({
            'service': service.to_dict(),
            'latest_log': latest_log.to_dict() if latest_log else None,
            'latest_performance': performance_payload or {
                'cpu_usage': host_metrics['cpu_usage'],
                'ram_usage': host_metrics['ram_usage'],
                'disk_usage': host_metrics['disk_usage'],
                'network_in': host_metrics['network_in_mb'],
                'network_out': host_metrics['network_out_mb'],
                'process_count': host_metrics['process_count'],
                'thread_count': host_metrics['thread_count'],
                'timestamp': host_metrics['timestamp'],
            }
        })
    return paginated_response(results, pagination)


@monitoring_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    service_id = request.args.get('service_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    query = ApiLog.query
    if service_id:
        query = query.filter_by(service_id=service_id)
    pagination = query.order_by(ApiLog.timestamp.desc()).paginate(page=page, per_page=per_page)
    return paginated_response([log.to_dict() for log in pagination.items], pagination)


@monitoring_bp.route('/metrics/<int:service_id>', methods=['GET'])
@jwt_required()
def get_metrics(service_id):
    hours = request.args.get('hours', 24, type=int)
    since = datetime.utcnow() - timedelta(hours=hours)
    logs = ApiLog.query.filter(ApiLog.service_id == service_id, ApiLog.timestamp >= since).all()
    perf_logs = PerformanceLog.query.filter(PerformanceLog.service_id == service_id, PerformanceLog.timestamp >= since).all()
    return success_response({
        'api_logs': [log.to_dict() for log in logs],
        'performance_logs': [p.to_dict() for p in perf_logs]
    })
