"""
RecoveryLog model – tracks simulated auto-recovery actions.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class RecoveryActionType(enum.Enum):
    """Types of recovery actions the system can perform."""
    RESTART_SERVICE = 'restart_service'
    CLEAR_CACHE = 'clear_cache'
    SCALE_UP = 'scale_up'
    SCALE_DOWN = 'scale_down'
    FLUSH_CONNECTIONS = 'flush_connections'
    ROTATE_LOGS = 'rotate_logs'
    RESTART_WORKERS = 'restart_workers'
    FAILOVER = 'failover'


class RecoveryStatus(enum.Enum):
    """Status of a recovery action."""
    PENDING = 'pending'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    FAILED = 'failed'
    SKIPPED = 'skipped'


class RecoveryLog(db.Model):
    """Records every auto-recovery action attempted by the system."""
    __tablename__ = 'recovery_logs'

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    action_type = Column(Enum(RecoveryActionType), nullable=False)
    description = Column(Text)
    status = Column(Enum(RecoveryStatus), default=RecoveryStatus.PENDING)
    triggered_by = Column(String(50), default='system')   # 'system', 'agent', 'manual'
    trigger_reason = Column(Text)                          # What caused the recovery
    execution_time = Column(Float)                         # milliseconds
    result_message = Column(Text)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    service = relationship('Service', backref='recovery_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'service_name': self.service.name if self.service else None,
            'action_type': self.action_type.value if self.action_type else None,
            'description': self.description,
            'status': self.status.value if self.status else None,
            'triggered_by': self.triggered_by,
            'trigger_reason': self.trigger_reason,
            'execution_time': self.execution_time,
            'result_message': self.result_message,
            'started_at': to_iso_utc(self.started_at),
            'completed_at': to_iso_utc(self.completed_at),
        }
