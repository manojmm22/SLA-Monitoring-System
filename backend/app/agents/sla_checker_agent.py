from datetime import datetime, timedelta
from app.agents.base_agent import BaseAgent
from app.models.sla import SlaRule, SlaViolation
from app.models.log import ApiLog, PerformanceLog
from app.models.service import Service
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class SlaCheckerAgent(BaseAgent):
    def __init__(self):
        super().__init__("SLA Checker Agent", "compliance")

    def execute(self, service_id=None):
        rules = []
        if service_id:
            rules = SlaRule.query.filter_by(service_id=service_id, is_active=True).all()
        else:
            rules = SlaRule.query.filter_by(is_active=True).all()

        violations = []
        for rule in rules:
            result = self._check_rule(rule)
            if result['violated']:
                violations.append(result)

        return violations

    def _check_rule(self, rule):
        service = Service.query.get(rule.service_id)
        if not service:
            return {'violated': False, 'error': 'Service not found'}

        timeframe_map = {
            'hourly': timedelta(hours=1),
            'daily': timedelta(days=1),
            'weekly': timedelta(weeks=1),
            'monthly': timedelta(days=30)
        }

        since = datetime.utcnow() - timeframe_map.get(rule.timeframe.value, timedelta(days=1))

        actual_value = None
        metric_type = rule.metric_type.value

        if metric_type == 'response_time':
            logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since,
                ApiLog.is_success == True
            ).all()
            if logs:
                actual_value = sum(log.response_time for log in logs) / len(logs)

        elif metric_type == 'availability':
            logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since
            ).all()
            if logs:
                successful = sum(1 for log in logs if log.is_success)
                actual_value = (successful / len(logs)) * 100

        elif metric_type == 'error_rate':
            logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since
            ).all()
            if logs:
                errors = sum(1 for log in logs if log.status_code and log.status_code >= 400)
                actual_value = (errors / len(logs)) * 100

        elif metric_type == 'cpu':
            logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).all()
            if logs:
                actual_value = sum(log.cpu_usage for log in logs) / len(logs)

        elif metric_type == 'ram':
            logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).all()
            if logs:
                actual_value = sum(log.ram_usage for log in logs) / len(logs)

        elif metric_type == 'disk':
            logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).all()
            if logs:
                actual_value = sum(log.disk_usage for log in logs) / len(logs)

        if actual_value is None:
            return {'violated': False, 'error': 'No data available'}

        # Check violation: availability breaches when below target; other metrics breach when above target
        if metric_type == 'availability':
            violated = actual_value < rule.target_value
            deviation = round(((rule.target_value - actual_value) / rule.target_value) * 100, 2) if rule.target_value else 0
            severity = 'critical' if (rule.critical_threshold is not None and actual_value <= rule.critical_threshold) else 'warning'
        else:
            violated = actual_value > rule.target_value
            deviation = round(((actual_value - rule.target_value) / rule.target_value) * 100, 2) if rule.target_value else 0
            severity = 'critical' if (rule.critical_threshold is not None and actual_value >= rule.critical_threshold) else 'warning'

        if violated:
            # Check if violation already exists and not resolved
            existing = SlaViolation.query.filter_by(
                service_id=service.id,
                rule_id=rule.id,
                resolved_at=None
            ).first()

            if not existing:
                violation = SlaViolation(
                    service_id=service.id,
                    rule_id=rule.id,
                    metric_type=metric_type,
                    actual_value=round(actual_value, 2),
                    target_value=rule.target_value,
                    deviation_percentage=deviation,
                    severity=severity
                )
                db.session.add(violation)
                db.session.commit()

            return {
                'violated': True,
                'service_id': service.id,
                'service_name': service.name,
                'rule_id': rule.id,
                'rule_name': rule.name,
                'metric_type': metric_type,
                'actual_value': round(actual_value, 2),
                'target_value': rule.target_value,
                'deviation_percentage': deviation,
                'severity': severity,
                'timestamp': to_iso_utc(datetime.utcnow())
            }

        return {'violated': False, 'service_id': service.id, 'metric_type': metric_type}
