from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.utils.database import db


from app.utils.datetime_utils import to_iso_utc


class ApiLog(db.Model):
    __tablename__ = 'api_logs'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    endpoint_id = Column(Integer, ForeignKey('service_endpoints.id', ondelete='CASCADE'))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    method = Column(String(10))
    url = Column(String(1000))
    status_code = Column(Integer)
    response_time = Column(Float)  # milliseconds
    request_size = Column(Integer)  # bytes
    response_size = Column(Integer)  # bytes
    is_success = Column(Boolean)
    error_message = Column(Text)
    headers = Column(JSON)
    body = Column(Text)
    trace_id = Column(String(100), index=True)

    service = relationship('Service', back_populates='api_logs')
    endpoint = relationship('ServiceEndpoint', back_populates='api_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'endpoint_id': self.endpoint_id,
            'timestamp': to_iso_utc(self.timestamp),
            'method': self.method,
            'url': self.url,
            'status_code': self.status_code,
            'response_time': self.response_time,
            'request_size': self.request_size,
            'response_size': self.response_size,
            'is_success': self.is_success,
            'error_message': self.error_message,
            'headers': self.headers,
            'trace_id': self.trace_id
        }


class PerformanceLog(db.Model):
    __tablename__ = 'performance_logs'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    cpu_usage = Column(Float)
    ram_usage = Column(Float)
    disk_usage = Column(Float)
    network_in = Column(Float)
    network_out = Column(Float)
    process_count = Column(Integer)
    thread_count = Column(Integer)
    open_file_descriptors = Column(Integer)

    service = relationship('Service', back_populates='performance_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'timestamp': to_iso_utc(self.timestamp),
            'cpu_usage': self.cpu_usage,
            'ram_usage': self.ram_usage,
            'disk_usage': self.disk_usage,
            'network_in': self.network_in,
            'network_out': self.network_out,
            'process_count': self.process_count,
            'thread_count': self.thread_count,
            'open_file_descriptors': self.open_file_descriptors
        }


class AgentLog(db.Model):
    __tablename__ = 'agent_logs'

    id = Column(Integer, primary_key=True)
    agent_name = Column(String(50), nullable=False, index=True)
    agent_type = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String(20), default='INFO')  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'))
    agent_metadata = Column('metadata', JSON)
    execution_time = Column(Float)  # milliseconds

    def to_dict(self):
        return {
            'id': self.id,
            'agent_name': self.agent_name,
            'agent_type': self.agent_type,
            'timestamp': to_iso_utc(self.timestamp),
            'level': self.level,
            'message': self.message,
            'service_id': self.service_id,
            'metadata': self.agent_metadata,
            'execution_time': self.execution_time
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource = Column(String(50), nullable=False)
    resource_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    success = Column(Boolean, default=True)

    user = relationship('User', back_populates='audit_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'timestamp': to_iso_utc(self.timestamp),
            'action': self.action,
            'resource': self.resource,
            'resource_id': self.resource_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'success': self.success
        }
