from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class AlertSeverity(enum.Enum):
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'
    INFO = 'info'


class AlertStatus(enum.Enum):
    ACTIVE = 'active'
    ACKNOWLEDGED = 'acknowledged'
    RESOLVED = 'resolved'
    DISMISSED = 'dismissed'
    ESCALATED = 'escalated'


class AlertChannel(enum.Enum):
    EMAIL = 'email'
    SMS = 'sms'
    WEBHOOK = 'webhook'
    DASHBOARD = 'dashboard'
    SLACK = 'slack'
    PAGERDUTY = 'pagerduty'


class Alert(db.Model):
    __tablename__ = 'alerts'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    rule_id = Column(Integer, ForeignKey('alert_rules.id', ondelete='SET NULL'))

    title = Column(String(200), nullable=False)
    description = Column(Text)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE)
    channel = Column(Enum(AlertChannel), default=AlertChannel.DASHBOARD)

    metric_name = Column(String(50))  # response_time, cpu, ram, disk, availability
    metric_value = Column(Float)
    threshold_value = Column(Float)

    acknowledged_at = Column(DateTime)
    acknowledged_by = Column(Integer, ForeignKey('users.id'))
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer, ForeignKey('users.id'))
    dismissed_at = Column(DateTime)
    dismissed_by = Column(Integer, ForeignKey('users.id'))

    escalation_count = Column(Integer, default=0)
    next_escalation_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    service = relationship('Service', back_populates='alerts')
    user = relationship('User', foreign_keys=[user_id], back_populates='alerts')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'service_name': self.service.name if self.service else None,
            'user_id': self.user_id,
            'rule_id': self.rule_id,
            'title': self.title,
            'description': self.description,
            'severity': self.severity.value if self.severity else None,
            'status': self.status.value if self.status else None,
            'channel': self.channel.value if self.channel else None,
            'metric_name': self.metric_name,
            'metric_value': self.metric_value,
            'threshold_value': self.threshold_value,
            'acknowledged_at': to_iso_utc(self.acknowledged_at),
            'resolved_at': to_iso_utc(self.resolved_at),
            'dismissed_at': to_iso_utc(self.dismissed_at),
            'escalation_count': self.escalation_count,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at)
        }


class AlertRule(db.Model):
    __tablename__ = 'alert_rules'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'))

    metric_name = Column(String(50), nullable=False)  # response_time, cpu, ram, disk, availability, error_rate
    operator = Column(String(10), default='>')  # >, <, >=, <=, ==, !=
    threshold = Column(Float, nullable=False)
    duration = Column(Integer, default=5)  # minutes (must be violated for X minutes)

    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    channels = Column(String(200))  # comma-separated: email,sms,webhook

    is_active = Column(Boolean, default=True)
    cooldown_period = Column(Integer, default=60)  # minutes
    escalation_enabled = Column(Boolean, default=False)
    escalation_threshold = Column(Integer, default=3)  # escalate after X alerts

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'service_id': self.service_id,
            'metric_name': self.metric_name,
            'operator': self.operator,
            'threshold': self.threshold,
            'duration': self.duration,
            'severity': self.severity.value if self.severity else None,
            'channels': self.channels,
            'is_active': self.is_active,
            'cooldown_period': self.cooldown_period,
            'escalation_enabled': self.escalation_enabled,
            'escalation_threshold': self.escalation_threshold,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at)
        }
