"""
Database initialization and seed data module.
Sets up SQLAlchemy, runs migrations, and seeds sample data for development.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
import random

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    """Initialize the database with the Flask app and seed default data."""
    db.init_app(app)
    migrate.init_app(app, db)

    # Ensure reports directory exists
    reports_dir = app.config.get('REPORTS_DIR', 'reports')
    try:
        os.makedirs(reports_dir, exist_ok=True)
    except OSError:
        pass

    with app.app_context():
        import app.models  # noqa: F401 – register models before create_all
        try:
            db.create_all()
            seed_default_data()
        except Exception as e:
            app.logger.warning(f"Database init or seed error: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass


def seed_default_data():
    """Seed roles, permissions, admin user, sample services, and monitoring data."""
    from app.models.user import Role, Permission, User
    from app.models.service import Service, ServiceStatus, ServiceType, ServiceEndpoint
    from app.models.sla import SlaRule, SlaMetricType, SlaTimeframe, SlaViolation
    from app.models.alert import Alert, AlertRule, AlertSeverity, AlertStatus, AlertChannel
    from app.models.log import ApiLog, PerformanceLog
    from app.models.configuration import Configuration
    from app.models.notification import Notification, NotificationType, NotificationChannel
    from app.models.recovery_log import RecoveryLog, RecoveryActionType, RecoveryStatus
    import bcrypt
    from datetime import datetime, timedelta

    # ── 1. Roles ───────────────────────────────────────────────────
    roles_data = [
        ('Admin', 'Full system access – manage all resources', False),
        ('Engineer', 'Manage services, monitoring, and agents', False),
        ('Viewer', 'Read-only access to dashboards and reports', True),
    ]
    for name, description, is_default in roles_data:
        if not Role.query.filter_by(name=name).first():
            db.session.add(Role(name=name, description=description, is_default=is_default))
    db.session.commit()

    # ── 2. Permissions ─────────────────────────────────────────────
    permissions_data = [
        ('users.read', 'View users', 'users', 'read'),
        ('users.write', 'Manage users', 'users', 'write'),
        ('services.read', 'View services', 'services', 'read'),
        ('services.write', 'Manage services', 'services', 'write'),
        ('alerts.read', 'View alerts', 'alerts', 'read'),
        ('alerts.write', 'Manage alerts', 'alerts', 'write'),
        ('reports.read', 'View reports', 'reports', 'read'),
        ('reports.write', 'Manage reports', 'reports', 'write'),
        ('settings.read', 'View settings', 'settings', 'read'),
        ('settings.write', 'Manage settings', 'settings', 'write'),
        ('agents.read', 'View agent status', 'agents', 'read'),
        ('agents.write', 'Manage agents', 'agents', 'write'),
        ('predictions.read', 'View AI predictions', 'predictions', 'read'),
        ('recovery.read', 'View recovery logs', 'recovery', 'read'),
        ('recovery.write', 'Execute recovery actions', 'recovery', 'write'),
        ('audit.read', 'View audit logs', 'audit', 'read'),
    ]
    for name, description, resource, action in permissions_data:
        if not Permission.query.filter_by(name=name).first():
            db.session.add(Permission(
                name=name, description=description,
                resource=resource, action=action
            ))
    db.session.commit()

    # Assign all permissions to Admin
    admin_role = Role.query.filter_by(name='Admin').first()
    if admin_role and len(admin_role.permissions) < len(permissions_data):
        admin_role.permissions = Permission.query.all()
        db.session.commit()

    # Assign read permissions to Engineer
    engineer_role = Role.query.filter_by(name='Engineer').first()
    if engineer_role and not engineer_role.permissions:
        read_perms = Permission.query.filter(
            Permission.name.in_([
                'services.read', 'services.write', 'alerts.read', 'alerts.write',
                'reports.read', 'reports.write', 'agents.read', 'agents.write',
                'predictions.read', 'recovery.read', 'recovery.write',
            ])
        ).all()
        engineer_role.permissions = read_perms
        db.session.commit()

    # Assign read-only permissions to Viewer
    viewer_role = Role.query.filter_by(name='Viewer').first()
    if viewer_role and not viewer_role.permissions:
        view_perms = Permission.query.filter(
            Permission.name.in_([
                'services.read', 'alerts.read', 'reports.read',
                'predictions.read', 'recovery.read', 'audit.read',
            ])
        ).all()
        viewer_role.permissions = view_perms
        db.session.commit()

    # ── 3. Users ───────────────────────────────────────────────────
    _seed_user('admin', 'admin@slamonitor.com', 'Admin@123', 'System', 'Administrator', 'Admin')

    # ── 4. Configurations ─────────────────────────────────────────
    if not Configuration.query.first():
        configs = [
            Configuration(key='global_alerting_enabled', value='true', value_type='bool',
                          description='Enable or disable global alerting', category='alerting'),
            Configuration(key='data_retention_days', value='90', value_type='int',
                          description='Number of days to retain monitoring logs', category='general'),
            Configuration(key='max_concurrent_checks', value='10', value_type='int',
                          description='Maximum concurrent health checks', category='monitoring'),
            Configuration(key='auto_recovery_enabled', value='true', value_type='bool',
                          description='Enable automatic recovery actions', category='monitoring'),
            Configuration(key='prediction_model_retrain_hours', value='24', value_type='int',
                          description='Hours between AI model retraining', category='monitoring'),
            Configuration(key='email_notifications_enabled', value='false', value_type='bool',
                          description='Send email notifications for alerts', category='alerting'),
            Configuration(key='dashboard_refresh_interval', value='10', value_type='int',
                          description='Dashboard auto-refresh interval in seconds', category='general'),
            Configuration(key='alert_cooldown_minutes', value='30', value_type='int',
                          description='Minimum minutes between duplicate alerts', category='alerting'),
        ]
        db.session.add_all(configs)
        db.session.commit()

    # ── 5. Services & Monitoring Data ──────────────────────────────
    if not Service.query.first():
        _seed_services_and_data()


def _seed_user(username, email, password, first_name, last_name, role_name):
    """Create a user if it doesn't exist."""
    from app.models.user import User, Role
    import bcrypt

    user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    role = Role.query.filter_by(name=role_name).first()

    if not user:
        password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')
        user = User(
            username=username, email=email,
            password_hash=password_hash,
            first_name=first_name, last_name=last_name,
            is_verified=True, is_active=True,
        )
        if role:
            user.roles.append(role)
        db.session.add(user)
    else:
        # Ensure password and role are up-to-date for dev convenience
        user.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')
        user.is_verified = True
        user.is_active = True
        if role and role not in user.roles:
            user.roles.append(role)

    db.session.commit()


def _seed_services_and_data():
    """Create 5 sample services with 24 hours of realistic monitoring data."""
    from app.models.service import Service, ServiceStatus, ServiceType, ServiceEndpoint
    from app.models.sla import SlaRule, SlaMetricType, SlaTimeframe, SlaViolation
    from app.models.alert import Alert, AlertRule, AlertSeverity, AlertStatus, AlertChannel
    from app.models.log import ApiLog, PerformanceLog
    from app.models.recovery_log import RecoveryLog, RecoveryActionType, RecoveryStatus
    from datetime import datetime, timedelta

    now = datetime.utcnow()

    # ── Service definitions ────────────────────────────────────────
    services_data = [
        {
            'name': 'SLA Monitor API',
            'description': 'Primary monitoring endpoint for SLA health, alerting, and service telemetry',
            'base_url': 'https://api.example.com/monitoring',
            'service_type': ServiceType.REST_API,
            'status': ServiceStatus.DEGRADED,
            'category': 'monitoring', 'owner': 'Platform Team', 'team': 'Core Services',
            'response_time_threshold': 1500, 'cpu_threshold': 70,
            'ram_threshold': 80, 'disk_threshold': 85,
            'availability_threshold': 99.0,
            'base_response': 1200, 'response_variance': 800,
            'base_cpu': 65, 'base_ram': 72, 'base_disk': 60,
            'error_rate': 0.08,
        },
        {
            'name': 'Auth Service',
            'description': 'OAuth2 authentication and authorization service',
            'base_url': 'https://auth.example.com/api',
            'service_type': ServiceType.REST_API,
            'status': ServiceStatus.HEALTHY,
            'category': 'security', 'owner': 'Security Team', 'team': 'Platform',
            'response_time_threshold': 500, 'cpu_threshold': 60,
            'ram_threshold': 70, 'disk_threshold': 80,
            'availability_threshold': 99.9,
            'base_response': 150, 'response_variance': 200,
            'base_cpu': 25, 'base_ram': 40, 'base_disk': 35,
            'error_rate': 0.01,
        },
        {
            'name': 'User Service',
            'description': 'User profile management and CRUD operations',
            'base_url': 'https://api.example.com/users',
            'service_type': ServiceType.REST_API,
            'status': ServiceStatus.HEALTHY,
            'category': 'core', 'owner': 'Backend Team', 'team': 'Core Services',
            'response_time_threshold': 1000, 'cpu_threshold': 75,
            'ram_threshold': 80, 'disk_threshold': 85,
            'availability_threshold': 99.5,
            'base_response': 300, 'response_variance': 400,
            'base_cpu': 35, 'base_ram': 55, 'base_disk': 45,
            'error_rate': 0.03,
        },
        {
            'name': 'Notification Service',
            'description': 'Email, SMS, and push notification delivery',
            'base_url': 'https://notify.example.com/api',
            'service_type': ServiceType.REST_API,
            'status': ServiceStatus.CRITICAL,
            'category': 'messaging', 'owner': 'Messaging Team', 'team': 'Platform',
            'response_time_threshold': 2000, 'cpu_threshold': 80,
            'ram_threshold': 85, 'disk_threshold': 90,
            'availability_threshold': 98.0,
            'base_response': 800, 'response_variance': 1500,
            'base_cpu': 78, 'base_ram': 82, 'base_disk': 70,
            'error_rate': 0.15,
        },
        {
            'name': 'Search Service',
            'description': 'Elasticsearch-based full-text search service',
            'base_url': 'https://search.example.com/api',
            'service_type': ServiceType.REST_API,
            'status': ServiceStatus.HEALTHY,
            'category': 'search', 'owner': 'Data Team', 'team': 'Data Platform',
            'response_time_threshold': 800, 'cpu_threshold': 85,
            'ram_threshold': 90, 'disk_threshold': 80,
            'availability_threshold': 99.0,
            'base_response': 200, 'response_variance': 350,
            'base_cpu': 45, 'base_ram': 65, 'base_disk': 55,
            'error_rate': 0.02,
        },
    ]

    for svc_data in services_data:
        # Extract simulation params
        base_resp = svc_data.pop('base_response')
        resp_var = svc_data.pop('response_variance')
        base_cpu = svc_data.pop('base_cpu')
        base_ram = svc_data.pop('base_ram')
        base_disk = svc_data.pop('base_disk')
        error_rate = svc_data.pop('error_rate')

        service = Service.query.filter_by(name=svc_data['name']).first()
        if not service:
            service = Service(**svc_data, polling_interval=30, timeout=10, retry_count=3)
            db.session.add(service)
            db.session.flush()  # Get service.id
        else:
            for key, value in svc_data.items():
                if hasattr(service, key):
                    setattr(service, key, value)
            service.polling_interval = 30
            service.timeout = 10
            service.retry_count = 3
            db.session.flush()

        # ── SLA Rules ──────────────────────────────────────────────
        db.session.add(SlaRule(
            service_id=service.id,
            name=f'{service.name} – Availability SLA',
            description=f'Maintain availability above {service.availability_threshold}%',
            metric_type=SlaMetricType.AVAILABILITY,
            target_value=service.availability_threshold,
            warning_threshold=service.availability_threshold - 0.5,
            critical_threshold=service.availability_threshold - 1.5,
            timeframe=SlaTimeframe.DAILY, is_active=True,
        ))
        db.session.add(SlaRule(
            service_id=service.id,
            name=f'{service.name} – Response Time SLA',
            description=f'Keep avg response time below {service.response_time_threshold}ms',
            metric_type=SlaMetricType.RESPONSE_TIME,
            target_value=float(service.response_time_threshold),
            warning_threshold=float(service.response_time_threshold) * 1.1,
            critical_threshold=float(service.response_time_threshold) * 1.5,
            timeframe=SlaTimeframe.DAILY, is_active=True,
        ))

        # ── Alert Rules ────────────────────────────────────────────
        db.session.add(AlertRule(
            service_id=service.id,
            name=f'{service.name} – Availability Drop',
            description=f'Alert when availability drops below {service.availability_threshold}%',
            metric_name='availability', operator='<',
            threshold=service.availability_threshold,
            duration=5, severity=AlertSeverity.CRITICAL,
            channels='dashboard,email', is_active=True,
            cooldown_period=15, escalation_enabled=True, escalation_threshold=2,
        ))
        db.session.add(AlertRule(
            service_id=service.id,
            name=f'{service.name} – High Response Time',
            description=f'Alert when avg response time exceeds {service.response_time_threshold}ms',
            metric_name='response_time', operator='>',
            threshold=float(service.response_time_threshold),
            duration=5, severity=AlertSeverity.HIGH,
            channels='dashboard', is_active=True,
            cooldown_period=10, escalation_enabled=False,
        ))
        db.session.add(AlertRule(
            service_id=service.id,
            name=f'{service.name} – High CPU',
            description=f'Alert when CPU exceeds {service.cpu_threshold}%',
            metric_name='cpu', operator='>',
            threshold=service.cpu_threshold,
            duration=5, severity=AlertSeverity.MEDIUM,
            channels='dashboard', is_active=True,
            cooldown_period=15,
        ))

        # ── Endpoints ──────────────────────────────────────────────
        endpoint_paths = ['/health', '/status', '/v1/data']
        for path in endpoint_paths:
            db.session.add(ServiceEndpoint(
                service_id=service.id,
                name=f'{path.strip("/").replace("/", " ").title()} Endpoint',
                path=path, method='GET',
                expected_status_code=200, is_active=True,
            ))

        # ── 24 hours of API logs (every 5 minutes = 288 entries) ──
        for i in range(288):
            ts = now - timedelta(minutes=(288 - i) * 5)
            # Add time-of-day variation: busier during work hours
            hour = ts.hour
            load_factor = 1.0 + (0.3 if 9 <= hour <= 17 else -0.1)

            response_time = max(50, base_resp * load_factor + random.gauss(0, resp_var * 0.3))
            is_error = random.random() < error_rate * load_factor

            status_code = 200
            if is_error:
                status_code = random.choice([500, 502, 503, 504, 408, 429])

            db.session.add(ApiLog(
                service_id=service.id,
                url=f'{service.base_url}/v1/data',
                method='GET',
                status_code=status_code,
                response_time=round(response_time, 2),
                response_size=random.randint(200, 5000),
                timestamp=ts,
                is_success=(status_code < 400),
            ))

        # ── 24 hours of performance logs (every 5 minutes) ────────
        for i in range(288):
            ts = now - timedelta(minutes=(288 - i) * 5)
            hour = ts.hour
            load_factor = 1.0 + (0.15 if 9 <= hour <= 17 else -0.05)

            db.session.add(PerformanceLog(
                service_id=service.id,
                cpu_usage=round(min(100, max(5, base_cpu * load_factor + random.gauss(0, 8))), 2),
                ram_usage=round(min(100, max(10, base_ram * load_factor + random.gauss(0, 5))), 2),
                disk_usage=round(min(100, max(10, base_disk + random.gauss(0, 2))), 2),
                network_in=round(random.uniform(10, 500), 2),
                network_out=round(random.uniform(5, 250), 2),
                process_count=random.randint(50, 200),
                thread_count=random.randint(100, 500),
                timestamp=ts,
            ))

        # ── Sample Alerts ──────────────────────────────────────────
        if error_rate > 0.05:
            for j in range(random.randint(2, 5)):
                alert_ts = now - timedelta(hours=random.randint(1, 23))
                severity = random.choice([AlertSeverity.CRITICAL, AlertSeverity.HIGH])
                status = random.choice([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED])
                alert = Alert(
                    service_id=service.id,
                    title=f'{service.name} – availability threshold breached',
                    description=f'Service availability dropped below SLA target',
                    severity=severity, status=status,
                    channel=AlertChannel.DASHBOARD,
                    metric_name='availability',
                    metric_value=round(random.uniform(90, 98.5), 2),
                    threshold_value=service.availability_threshold,
                    created_at=alert_ts,
                )
                if status in (AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED):
                    alert.acknowledged_at = alert_ts + timedelta(minutes=random.randint(2, 30))
                if status == AlertStatus.RESOLVED:
                    alert.resolved_at = alert_ts + timedelta(minutes=random.randint(30, 120))
                db.session.add(alert)

        # ── Sample SLA Violations ──────────────────────────────────
        if error_rate > 0.05:
            for j in range(random.randint(1, 3)):
                viol_ts = now - timedelta(hours=random.randint(2, 20))
                db.session.add(SlaViolation(
                    service_id=service.id,
                    metric_type='availability',
                    actual_value=round(random.uniform(92, 98), 2),
                    target_value=service.availability_threshold,
                    deviation_percentage=round(random.uniform(1, 8), 2),
                    severity=random.choice(['warning', 'critical']),
                    timestamp=viol_ts,
                ))

        # ── Sample Recovery Logs ───────────────────────────────────
        if error_rate > 0.10:
            for j in range(random.randint(1, 3)):
                rec_ts = now - timedelta(hours=random.randint(1, 12))
                action = random.choice(list(RecoveryActionType))
                db.session.add(RecoveryLog(
                    service_id=service.id,
                    action_type=action,
                    description=f'Auto-recovery: {action.value.replace("_", " ")} for {service.name}',
                    status=RecoveryStatus.COMPLETED,
                    triggered_by='system',
                    trigger_reason='SLA violation detected',
                    execution_time=round(random.uniform(500, 5000), 2),
                    result_message='Recovery action completed successfully',
                    started_at=rec_ts,
                    completed_at=rec_ts + timedelta(seconds=random.randint(5, 60)),
                ))

    db.session.commit()
