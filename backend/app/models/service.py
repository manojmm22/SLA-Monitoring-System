from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.utils.database import db
from app.models.log import ApiLog
from app.utils.datetime_utils import to_iso_utc


class ServiceStatus(enum.Enum):
    HEALTHY = 'healthy'
    DEGRADED = 'degraded'
    CRITICAL = 'critical'
    DOWN = 'down'
    UNKNOWN = 'unknown'


class ServiceType(enum.Enum):
    REST_API = 'rest_api'
    GRAPHQL = 'graphql'
    GRPC = 'grpc'
    WEBSOCKET = 'websocket'
    CUSTOM = 'custom'


class Service(db.Model):
    __tablename__ = 'services'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    base_url = Column(String(500), nullable=False)
    service_type = Column(Enum(ServiceType), default=ServiceType.REST_API)
    status = Column(Enum(ServiceStatus), default=ServiceStatus.UNKNOWN)
    is_active = Column(Boolean, default=True)
    health_check_enabled = Column(Boolean, default=True)

    # SLA Thresholds
    response_time_threshold = Column(Integer, default=2000)  # ms
    cpu_threshold = Column(Float, default=80.0)
    ram_threshold = Column(Float, default=85.0)
    disk_threshold = Column(Float, default=90.0)
    availability_threshold = Column(Float, default=99.9)

    # Polling
    polling_interval = Column(Integer, default=30)  # seconds
    timeout = Column(Integer, default=10)  # seconds
    retry_count = Column(Integer, default=3)

    # Metadata
    tags = Column(String(500))
    category = Column(String(50))
    owner = Column(String(100))
    team = Column(String(100))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_checked = Column(DateTime)

    endpoints = relationship('ServiceEndpoint', back_populates='service', cascade='all, delete-orphan', lazy='dynamic')
    api_logs = relationship('ApiLog', back_populates='service', lazy='dynamic')
    performance_logs = relationship('PerformanceLog', back_populates='service', lazy='dynamic')
    alerts = relationship('Alert', back_populates='service', lazy='dynamic')
    sla_violations = relationship('SlaViolation', back_populates='service', lazy='dynamic')

    @property
    def health_score(self):
        logs = self.api_logs.order_by(ApiLog.timestamp.desc()).limit(100).all()
        if not logs:
            return 0
        success_count = sum(1 for log in logs if log.status_code and log.status_code < 400)
        return round((success_count / len(logs)) * 100, 2)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'base_url': self.base_url,
            'service_type': self.service_type.value if self.service_type else None,
            'status': self.status.value if self.status else None,
            'is_active': self.is_active,
            'health_check_enabled': self.health_check_enabled,
            'response_time_threshold': self.response_time_threshold,
            'cpu_threshold': self.cpu_threshold,
            'ram_threshold': self.ram_threshold,
            'disk_threshold': self.disk_threshold,
            'availability_threshold': self.availability_threshold,
            'polling_interval': self.polling_interval,
            'timeout': self.timeout,
            'retry_count': self.retry_count,
            'tags': self.tags,
            'category': self.category,
            'owner': self.owner,
            'team': self.team,
            'health_score': self.health_score,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at),
            'last_checked': to_iso_utc(self.last_checked),
            'endpoint_count': self.endpoints.count()
        }


class ServiceEndpoint(db.Model):
    __tablename__ = 'service_endpoints'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    path = Column(String(500), nullable=False)
    method = Column(String(10), default='GET')
    description = Column(Text)
    headers = Column(Text)  # JSON string
    body = Column(Text)
    expected_status_code = Column(Integer, default=200)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    service = relationship('Service', back_populates='endpoints')
    api_logs = relationship('ApiLog', back_populates='endpoint', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'name': self.name,
            'path': self.path,
            'method': self.method,
            'description': self.description,
            'headers': self.headers,
            'body': self.body,
            'expected_status_code': self.expected_status_code,
            'is_active': self.is_active,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at)
        }
