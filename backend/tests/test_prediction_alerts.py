import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from app import create_app
from app.utils.database import db
from app.models.service import Service, ServiceStatus
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.agents.alert_agent import AlertAgent


@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_prediction_creates_and_resolves_alerts(app):
    with app.app_context():
        # Create a test service
        svc = Service(
            name="Test Prediction Service",
            base_url="http://localhost:5000/health",
            status=ServiceStatus.HEALTHY,
            response_time_threshold=500.0,
            cpu_threshold=80.0,
            ram_threshold=80.0
        )
        db.session.add(svc)
        db.session.commit()

        alert_agent = AlertAgent()

        # 1. High risk prediction (85%) -> Should trigger CRITICAL alert
        high_pred = {
            'service_id': svc.id,
            'service_name': svc.name,
            'sla_breach_probability': 0.85,
            'predicted_response_time': 1200.0,
            'server_overload_probability': 0.90,
            'confidence_score': 85.0
        }
        alert_agent.sync_prediction_alerts(svc, high_pred)

        active_breach_alert = Alert.query.filter_by(
            service_id=svc.id,
            status=AlertStatus.ACTIVE,
            metric_name='predicted_sla_breach'
        ).first()
        assert active_breach_alert is not None
        assert active_breach_alert.severity == AlertSeverity.CRITICAL
        assert active_breach_alert.metric_value == 85.0

        active_overload_alert = Alert.query.filter_by(
            service_id=svc.id,
            status=AlertStatus.ACTIVE,
            metric_name='predicted_server_overload'
        ).first()
        assert active_overload_alert is not None
        assert active_overload_alert.severity == AlertSeverity.CRITICAL

        # 2. Risk subsides (<35%) -> Alerts should auto-resolve
        low_pred = {
            'service_id': svc.id,
            'service_name': svc.name,
            'sla_breach_probability': 0.10,
            'predicted_response_time': 150.0,
            'server_overload_probability': 0.15,
            'confidence_score': 90.0
        }
        alert_agent.sync_prediction_alerts(svc, low_pred)

        active_after = Alert.query.filter_by(
            service_id=svc.id,
            status=AlertStatus.ACTIVE
        ).all()
        assert len(active_after) == 0

        resolved_breach = Alert.query.filter_by(
            service_id=svc.id,
            status=AlertStatus.RESOLVED,
            metric_name='predicted_sla_breach'
        ).first()
        assert resolved_breach is not None
