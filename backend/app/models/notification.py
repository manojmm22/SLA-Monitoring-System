"""
Notification model – tracks in-app and email notifications per user.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class NotificationType(enum.Enum):
    """Types of notifications the system can generate."""
    ALERT = 'alert'
    SLA_VIOLATION = 'sla_violation'
    RECOVERY = 'recovery'
    REPORT = 'report'
    SYSTEM = 'system'
    PREDICTION = 'prediction'


class NotificationChannel(enum.Enum):
    """Delivery channel for the notification."""
    IN_APP = 'in_app'
    EMAIL = 'email'
    BOTH = 'both'


class Notification(db.Model):
    """Stores notification history for each user."""
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), default=NotificationType.SYSTEM)
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.IN_APP)
    is_read = Column(Boolean, default=False)
    related_id = Column(Integer)           # ID of related entity (alert_id, report_id, etc.)
    related_type = Column(String(50))      # 'alert', 'report', 'service', etc.
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship('User', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type.value if self.notification_type else None,
            'channel': self.channel.value if self.channel else None,
            'is_read': self.is_read,
            'related_id': self.related_id,
            'related_type': self.related_type,
            'created_at': to_iso_utc(self.created_at),
        }
