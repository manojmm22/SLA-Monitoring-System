from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class SlaMetricType(enum.Enum):
    RESPONSE_TIME = 'response_time'
    AVAILABILITY = 'availability'
    THROUGHPUT = 'throughput'
    ERROR_RATE = 'error_rate'
    CPU = 'cpu'
    RAM = 'ram'
    DISK = 'disk'


class SlaTimeframe(enum.Enum):
    HOURLY = 'hourly'
    DAILY = 'daily'
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'


class SlaRule(db.Model):
    __tablename__ = 'sla_rules'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    metric_type = Column(Enum(SlaMetricType), nullable=False)
    target_value = Column(Float, nullable=False)
    warning_threshold = Column(Float)  # e.g., 95% of target
    critical_threshold = Column(Float)  # e.g., 90% of target
    timeframe = Column(Enum(SlaTimeframe), default=SlaTimeframe.DAILY)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    violations = relationship('SlaViolation', back_populates='rule', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'name': self.name,
            'description': self.description,
            'metric_type': self.metric_type.value if self.metric_type else None,
            'target_value': self.target_value,
            'warning_threshold': self.warning_threshold,
            'critical_threshold': self.critical_threshold,
            'timeframe': self.timeframe.value if self.timeframe else None,
            'is_active': self.is_active,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at)
        }


class SlaViolation(db.Model):
    __tablename__ = 'sla_violations'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    rule_id = Column(Integer, ForeignKey('sla_rules.id', ondelete='CASCADE'))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    metric_type = Column(String(50))
    actual_value = Column(Float)
    target_value = Column(Float)
    deviation_percentage = Column(Float)
    severity = Column(String(20))  # warning, critical
    duration = Column(Integer)  # minutes
    resolved_at = Column(DateTime)
    resolution_note = Column(Text)

    service = relationship('Service', back_populates='sla_violations')
    rule = relationship('SlaRule', back_populates='violations')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'service_name': self.service.name if self.service else None,
            'rule_id': self.rule_id,
            'timestamp': to_iso_utc(self.timestamp),
            'metric_type': self.metric_type,
            'actual_value': self.actual_value,
            'target_value': self.target_value,
            'deviation_percentage': self.deviation_percentage,
            'severity': self.severity,
            'duration': self.duration,
            'resolved_at': to_iso_utc(self.resolved_at),
            'resolution_note': self.resolution_note
        }
