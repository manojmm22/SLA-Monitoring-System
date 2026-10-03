"""
Alert Agent – evaluates alert rules against live metrics, creates alerts,
sends email notifications, and stores in-app notification records.
"""
from datetime import datetime, timedelta
from app.agents.base_agent import BaseAgent
from app.models.alert import Alert, AlertRule, AlertSeverity, AlertStatus, AlertChannel
from app.models.log import ApiLog, PerformanceLog
from app.models.service import Service
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationChannel
from app.utils.database import db
from app.utils.logger import logger


class AlertAgent(BaseAgent):
    """Monitors metric thresholds and triggers alerts with notifications."""

    def __init__(self):
        super().__init__("Alert Agent", "alerting")

    def execute(self, service_id=None):
        rules = AlertRule.query.filter_by(is_active=True)
        if service_id:
            rules = rules.filter(
                (AlertRule.service_id == service_id) | (AlertRule.service_id.is_(None))
            )
        rules = rules.all()

        created = []
        for rule in rules:
            alert = self._evaluate_rule(rule)
            if alert:
                created.append(alert)

        # Services without custom alert rules still need to be visible on the
        # dashboard when their live health check reports a problem.
        services = Service.query.filter_by(is_active=True).all()
        if service_id:
            services = [service for service in services if service.id == service_id]
        for service in services:
            if service.status.value in ('degraded', 'critical', 'down'):
                alert = self._create_health_alert(service)
                if alert:
                    created.append(alert)

            # Sync alerts according to live AI predictions
            pred_alerts = self.sync_prediction_alerts(service)
            created.extend(pred_alerts)

        return created

    def sync_prediction_alerts(self, service, prediction=None):
        """
        Synchronize active alerts according to live AI predictions.
        If breach risk is high (>=70%) or medium (>=40%), create/update predictive alerts.
        If breach risk subsides (<35%), auto-resolve active predictive alerts.
        """
        if not prediction:
            from app.agents.prediction_agent import PredictionAgent
            prediction = PredictionAgent()._generate_predictions(service)

        synced_alerts = []
        sla_prob = float(prediction.get('sla_breach_probability', 0.0))
        pred_resp = float(prediction.get('predicted_response_time', 0.0))
        overload_prob = float(prediction.get('server_overload_probability', 0.0))

        # ── 1. SLA Breach Probability Alert ──────────────────────
        existing_sla_alert = Alert.query.filter(
            Alert.service_id == service.id,
            Alert.status == AlertStatus.ACTIVE,
            Alert.metric_name == 'predicted_sla_breach'
        ).first()

        if sla_prob >= 0.40:
            severity = AlertSeverity.CRITICAL if sla_prob >= 0.70 else AlertSeverity.HIGH
            pct = int(round(sla_prob * 100))
            level_str = "Critical Risk" if sla_prob >= 0.70 else "High Risk"
            title = f"{level_str}: Predicted SLA Breach for {service.name}"
            description = (
                f"Live AI Prediction forecasts a {pct}% probability of SLA breach within 15 minutes. "
                f"Predicted response time: {round(pred_resp, 1)}ms (threshold: {service.response_time_threshold}ms)."
            )

            if existing_sla_alert:
                existing_sla_alert.severity = severity
                existing_sla_alert.title = title
                existing_sla_alert.description = description
                existing_sla_alert.metric_value = round(sla_prob * 100, 1)
                existing_sla_alert.threshold_value = 70.0 if sla_prob >= 0.70 else 40.0
                existing_sla_alert.updated_at = datetime.utcnow()
                db.session.commit()
                synced_alerts.append(existing_sla_alert.to_dict())
            else:
                new_alert = Alert(
                    service_id=service.id,
                    title=title,
                    description=description,
                    severity=severity,
                    status=AlertStatus.ACTIVE,
                    channel=AlertChannel.DASHBOARD,
                    metric_name='predicted_sla_breach',
                    metric_value=round(sla_prob * 100, 1),
                    threshold_value=70.0 if sla_prob >= 0.70 else 40.0,
                )
                db.session.add(new_alert)
                db.session.commit()
                self._create_notifications(new_alert, service)
                synced_alerts.append(new_alert.to_dict())
        elif existing_sla_alert and sla_prob < 0.35:
            existing_sla_alert.status = AlertStatus.RESOLVED
            existing_sla_alert.resolved_at = datetime.utcnow()
            db.session.commit()

        # ── 2. Server Overload Probability Alert ─────────────────
        existing_overload_alert = Alert.query.filter(
            Alert.service_id == service.id,
            Alert.status == AlertStatus.ACTIVE,
            Alert.metric_name == 'predicted_server_overload'
        ).first()

        if overload_prob >= 0.70:
            severity = AlertSeverity.CRITICAL if overload_prob >= 0.85 else AlertSeverity.HIGH
            pct = int(round(overload_prob * 100))
            title = f"Predicted Server Overload for {service.name}"
            description = f"Live AI Prediction forecasts a {pct}% risk of server CPU/RAM overload."

            if existing_overload_alert:
                existing_overload_alert.severity = severity
                existing_overload_alert.title = title
                existing_overload_alert.description = description
                existing_overload_alert.metric_value = round(overload_prob * 100, 1)
                existing_overload_alert.threshold_value = 70.0
                existing_overload_alert.updated_at = datetime.utcnow()
                db.session.commit()
                synced_alerts.append(existing_overload_alert.to_dict())
            else:
                new_alert = Alert(
                    service_id=service.id,
                    title=title,
                    description=description,
                    severity=severity,
                    status=AlertStatus.ACTIVE,
                    channel=AlertChannel.DASHBOARD,
                    metric_name='predicted_server_overload',
                    metric_value=round(overload_prob * 100, 1),
                    threshold_value=70.0,
                )
                db.session.add(new_alert)
                db.session.commit()
                self._create_notifications(new_alert, service)
                synced_alerts.append(new_alert.to_dict())
        elif existing_overload_alert and overload_prob < 0.50:
            existing_overload_alert.status = AlertStatus.RESOLVED
            existing_overload_alert.resolved_at = datetime.utcnow()
            db.session.commit()

        return synced_alerts

    def _create_health_alert(self, service):
        """Create one active health alert per unhealthy service without duplicates."""
        existing = Alert.query.filter(
            Alert.service_id == service.id,
            Alert.status == AlertStatus.ACTIVE,
            Alert.metric_name == 'service_health'
        ).first()
        if existing:
            return None

        severity = AlertSeverity.MEDIUM
        if service.status.value in ('critical', 'down'):
            severity = AlertSeverity.CRITICAL

        alert = Alert(
            service_id=service.id,
            title=f'{service.name} is {service.status.value}',
            description='Live health checks reported an unhealthy service state.',
            severity=severity,
            status=AlertStatus.ACTIVE,
            channel=AlertChannel.DASHBOARD,
            metric_name='service_health',
        )
        db.session.add(alert)
        db.session.commit()
        self._create_notifications(alert, service)
        return alert.to_dict()

    def _evaluate_rule(self, rule):
        """Check if a rule's threshold is breached and create alert + notifications."""
        service = Service.query.get(rule.service_id) if rule.service_id else None
        if rule.service_id and not service:
            return None

        metric_value = self._get_metric_value(rule, service)
        if metric_value is None:
            return None

        if not self._is_threshold_breached(rule, metric_value):
            return None

        # Cooldown check – avoid duplicate alerts
        since = datetime.utcnow() - timedelta(minutes=rule.cooldown_period)
        existing = Alert.query.filter(
            Alert.rule_id == rule.id,
            Alert.status == AlertStatus.ACTIVE,
            Alert.created_at >= since
        )
        if service:
            existing = existing.filter_by(service_id=service.id)
        if existing.first():
            return None

        # ── Create the alert ──────────────────────────────────────
        alert = Alert(
            service_id=service.id if service else rule.service_id,
            rule_id=rule.id,
            title=f"{rule.name} threshold breached",
            description=(
                rule.description or
                f"{rule.metric_name} is {metric_value:.2f} (threshold: {rule.threshold})"
            ),
            severity=rule.severity or AlertSeverity.MEDIUM,
            status=AlertStatus.ACTIVE,
            channel=AlertChannel.DASHBOARD,
            metric_name=rule.metric_name,
            metric_value=round(metric_value, 2),
            threshold_value=rule.threshold,
        )
        db.session.add(alert)
        db.session.commit()

        alert_dict = alert.to_dict()

        # ── Create in-app notifications for all admin users ───────
        try:
            self._create_notifications(alert, service)
        except Exception as e:
            logger.error(f"Failed to create notifications for alert {alert.id}: {str(e)}")

        # ── Send email if channel includes email ──────────────────
        channels = (rule.channels or 'dashboard').split(',')
        if 'email' in channels:
            try:
                self._send_email_notification(alert_dict, service)
            except Exception as e:
                logger.error(f"Failed to send email for alert {alert.id}: {str(e)}")

        return alert_dict

    def _create_notifications(self, alert, service):
        """Create in-app notification records for admin and engineer users."""
        admin_users = User.query.filter(
            User.is_active == True
        ).all()

        # Admin-only system: notify only administrators.
        for user in admin_users:
            role_names = [r.name for r in user.roles]
            if 'Admin' in role_names:
                notification = Notification(
                    user_id=user.id,
                    title=alert.title,
                    message=(
                        f"{alert.description} | "
                        f"Service: {service.name if service else 'N/A'} | "
                        f"Severity: {alert.severity.value}"
                    ),
                    notification_type=NotificationType.ALERT,
                    channel=NotificationChannel.IN_APP,
                    related_id=alert.id,
                    related_type='alert',
                )
                db.session.add(notification)

        db.session.commit()

    def _send_email_notification(self, alert_dict, service):
        """Send email notification via the email service."""
        try:
            from app.utils.email_service import EmailService

            alert_dict['service_name'] = service.name if service else 'Unknown'
            # Send to all admin users with emails
            admins = User.query.filter(User.is_active == True).all()
            for user in admins:
                role_names = [r.name for r in user.roles]
                if 'Admin' in role_names and user.email:
                    EmailService.send_alert_email(user.email, alert_dict)
        except Exception as e:
            logger.error(f"Email notification failed: {str(e)}")

    def _get_metric_value(self, rule, service):
        """Fetch the current value of the metric being monitored."""
        since = datetime.utcnow() - timedelta(minutes=rule.duration)
        metric = rule.metric_name

        if metric == 'response_time' and service:
            logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since,
                ApiLog.is_success == True
            ).all()
            if logs:
                return sum(log.response_time for log in logs) / len(logs)

        elif metric == 'availability' and service:
            logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since
            ).all()
            if logs:
                return (sum(1 for log in logs if log.is_success) / len(logs)) * 100

        elif metric == 'error_rate' and service:
            logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since
            ).all()
            if logs:
                errors = sum(1 for log in logs if log.status_code and log.status_code >= 400)
                return (errors / len(logs)) * 100

        elif metric == 'cpu' and service:
            logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).all()
            if logs:
                return sum(log.cpu_usage for log in logs) / len(logs)

        elif metric == 'ram' and service:
            logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).all()
            if logs:
                return sum(log.ram_usage for log in logs) / len(logs)

        elif metric == 'disk' and service:
            logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).all()
            if logs:
                return sum(log.disk_usage for log in logs) / len(logs)

        elif metric in ('predicted_sla_breach', 'sla_breach_probability', 'predicted_response_time', 'predicted_server_overload') and service:
            try:
                from app.agents.prediction_agent import PredictionAgent
                pred = PredictionAgent()._generate_predictions(service)
                if metric in ('predicted_sla_breach', 'sla_breach_probability'):
                    return pred.get('sla_breach_probability', 0.0) * 100.0
                elif metric == 'predicted_response_time':
                    return pred.get('predicted_response_time', 0.0)
                elif metric == 'predicted_server_overload':
                    return pred.get('server_overload_probability', 0.0) * 100.0
            except Exception as e:
                logger.error(f"Error evaluating predictive rule metric {metric}: {str(e)}")
                return None

        return None

    def _is_threshold_breached(self, rule, value):
        """Compare metric value against threshold using the configured operator."""
        op = rule.operator or '>'
        if op == '>':
            return value > rule.threshold
        if op == '>=':
            return value >= rule.threshold
        if op == '<':
            return value < rule.threshold
        if op == '<=':
            return value <= rule.threshold
        if op == '==':
            return value == rule.threshold
        if op == '!=':
            return value != rule.threshold
        return value > rule.threshold
