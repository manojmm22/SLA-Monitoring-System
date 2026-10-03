from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.models.log import ApiLog, PerformanceLog
from app.models.service import Service, ServiceStatus
from app.models.alert import Alert, AlertStatus
from app.models.sla import SlaViolation
from app.utils.response import success_response
from app.utils.database import db
from app.utils.system_metrics import collect_host_metrics
from app.utils.datetime_utils import to_iso_utc
from sqlalchemy import func, desc
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard_stats():
    total_services = Service.query.count()
    healthy = Service.query.filter_by(status=ServiceStatus.HEALTHY).count()
    degraded = Service.query.filter_by(status=ServiceStatus.DEGRADED).count()
    critical = Service.query.filter_by(status=ServiceStatus.CRITICAL).count()
    down = Service.query.filter_by(status=ServiceStatus.DOWN).count()
    avg_response = db.session.query(func.avg(ApiLog.response_time)).scalar() or 0
    latest_perf = PerformanceLog.query.order_by(PerformanceLog.timestamp.desc()).first()
    active_alerts = Alert.query.filter_by(status=AlertStatus.ACTIVE).count()
    host_metrics = collect_host_metrics()
    recent_violations = SlaViolation.query.order_by(SlaViolation.timestamp.desc()).limit(5).all()
    
    # 24-hour SLA compliance rate based on request success rate
    last_24h = datetime.utcnow() - timedelta(hours=24)
    total_logs_24h = ApiLog.query.filter(ApiLog.timestamp >= last_24h).count()
    success_logs_24h = ApiLog.query.filter(ApiLog.timestamp >= last_24h, ApiLog.is_success == True).count()
    if total_logs_24h > 0:
        sla_compliance = round((success_logs_24h / total_logs_24h) * 100, 2)
    elif total_services > 0:
        sla_compliance = round(((healthy + degraded * 0.7) / total_services) * 100, 2)
    else:
        sla_compliance = 99.50

    return success_response({
        'total_services': total_services,
        'healthy_services': healthy,
        'degraded_services': degraded,
        'critical_services': critical,
        'down_services': down,
        'critical_or_down_services': critical + down,
        'average_response_time': round(avg_response, 2),
        'cpu_usage': host_metrics['cpu_usage'],
        'ram_usage': host_metrics['ram_usage'],
        'disk_usage': host_metrics['disk_usage'],
        'memory_total_gb': host_metrics['memory_total_gb'],
        'memory_available_gb': host_metrics['memory_available_gb'],
        'disk_total_gb': host_metrics['disk_total_gb'],
        'disk_free_gb': host_metrics['disk_free_gb'],
        'network_in_mb': host_metrics['network_in_mb'],
        'network_out_mb': host_metrics['network_out_mb'],
        'process_count': host_metrics['process_count'],
        'thread_count': host_metrics['thread_count'],
        'active_alerts': active_alerts,
        'availability': round((healthy / total_services * 100) if total_services > 0 else 0, 2),
        'sla_compliance': sla_compliance,
        'violations': [violation.to_dict() for violation in recent_violations],
        'updated_at': to_iso_utc(datetime.utcnow()),
    })


@analytics_bp.route('/trends', methods=['GET'])
@jwt_required()
def get_trends():
    hours = request.args.get('hours', 24, type=int)
    since = datetime.utcnow() - timedelta(hours=hours)
    logs = ApiLog.query.filter(ApiLog.timestamp >= since).order_by(ApiLog.timestamp).all()
    perf_logs = PerformanceLog.query.filter(PerformanceLog.timestamp >= since).order_by(PerformanceLog.timestamp).all()
    return success_response({
        'response_time_trend': [{'timestamp': to_iso_utc(log.timestamp), 'response_time': log.response_time, 'status_code': log.status_code} for log in logs],
        'performance_trend': [{'timestamp': to_iso_utc(p.timestamp), 'cpu': p.cpu_usage, 'ram': p.ram_usage, 'disk': p.disk_usage} for p in perf_logs]
    })


@analytics_bp.route('/top-slow', methods=['GET'])
@jwt_required()
def top_slow_apis():
    since = datetime.utcnow() - timedelta(hours=24)
    results = db.session.query(
        ApiLog.service_id,
        func.avg(ApiLog.response_time).label('avg_response'),
        func.count(ApiLog.id).label('request_count')
    ).filter(ApiLog.timestamp >= since).group_by(ApiLog.service_id).order_by(desc('avg_response')).limit(10).all()
    return success_response([{
        'service_id': r.service_id,
        'service_name': Service.query.get(r.service_id).name if Service.query.get(r.service_id) else 'Unknown',
        'average_response_time': round(r.avg_response, 2),
        'request_count': r.request_count
    } for r in results])
