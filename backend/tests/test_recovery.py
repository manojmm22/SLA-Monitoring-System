import os
import pytest
from app import create_app
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.models.sla import SlaViolation, SlaRule, SlaMetricType
from app.models.recovery_log import RecoveryLog, RecoveryActionType, RecoveryStatus
from app.agents.recovery_agent import RecoveryAgent
from app.utils.database import db


@pytest.fixture
def app():
    os.chdir('d:/mm/sla-monitoring-system/backend')
    app = create_app('testing')
    return app


@pytest.fixture
def client(app):
    with app.test_client() as client:
        yield client


def test_autonomous_recovery_agent_heals_unhealthy_services(app):
    with app.app_context():
        # Setup test service in DOWN state
        svc = Service.query.filter_by(name='Test Payment Microservice').first()
        if not svc:
            svc = Service(
                name='Test Payment Microservice',
                base_url='http://test-payment.internal',
                service_type=ServiceType.REST_API,
                status=ServiceStatus.DOWN,
                is_active=True
            )
            db.session.add(svc)
            db.session.commit()
        else:
            svc.status = ServiceStatus.DOWN
            db.session.commit()

        # Run autonomous agent execute() without manual parameters
        agent = RecoveryAgent()
        results = agent.execute(ignore_cooldown=True)

        assert isinstance(results, list)
        assert len(results) > 0

        # Verify service status was autonomously restored to HEALTHY
        db.session.refresh(svc)
        assert svc.status == ServiceStatus.HEALTHY

        # Verify recovery log record
        latest_log = RecoveryLog.query.filter_by(service_id=svc.id).order_by(RecoveryLog.id.desc()).first()
        assert latest_log is not None
        assert latest_log.status == RecoveryStatus.COMPLETED
        assert latest_log.triggered_by == 'agent'


def test_autonomous_recovery_resolves_active_alerts(app):
    with app.app_context():
        svc = Service.query.filter_by(name='Test Auth Microservice').first()
        if not svc:
            svc = Service(
                name='Test Auth Microservice',
                base_url='http://test-auth.internal',
                service_type=ServiceType.REST_API,
                status=ServiceStatus.DEGRADED,
                is_active=True
            )
            db.session.add(svc)
            db.session.commit()
        else:
            svc.status = ServiceStatus.DEGRADED
            db.session.commit()

        # Add active alert
        alert = Alert(
            service_id=svc.id,
            title='High Latency Alert',
            description='P95 latency exceeded 2000ms threshold',
            severity=AlertSeverity.CRITICAL,
            status=AlertStatus.ACTIVE,
            metric_name='response_time',
            metric_value=2450.0
        )
        db.session.add(alert)
        db.session.commit()

        # Execute autonomous self-healing
        agent = RecoveryAgent()
        agent.execute(ignore_cooldown=True)

        db.session.refresh(alert)
        assert alert.status == AlertStatus.RESOLVED
        assert alert.resolved_at is not None

        db.session.refresh(svc)
        assert svc.status == ServiceStatus.HEALTHY


def test_recovery_api_endpoints(client):
    # Login as admin
    login = client.post('/api/auth/login', json={'username': 'admin', 'password': 'Admin@123'})
    token = login.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # Test GET /api/recovery/status
    res_status = client.get('/api/recovery/status', headers=headers)
    assert res_status.status_code == 200
    data_status = res_status.get_json()['data']
    assert 'auto_recovery_enabled' in data_status
    assert 'supported_protocols' in data_status

    # Test POST /api/recovery/auto-heal
    res_heal = client.post('/api/recovery/auto-heal', headers=headers)
    assert res_heal.status_code == 200
    data_heal = res_heal.get_json()['data']
    assert 'healed_actions' in data_heal
    assert 'summary' in data_heal
