from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class ReportType(enum.Enum):
    DAILY = 'daily'
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    CUSTOM = 'custom'
    INCIDENT = 'incident'
    PERFORMANCE = 'performance'
    LIVE = 'live'
    REPLICATION = 'replication'
    ALL_TIME = 'all_time'


class ReportFormat(enum.Enum):
    PDF = 'pdf'
    CSV = 'csv'
    EXCEL = 'excel'
    JSON = 'json'


class ReportStatus(enum.Enum):
    PENDING = 'pending'
    GENERATING = 'generating'
    COMPLETED = 'completed'
    FAILED = 'failed'


from sqlalchemy.types import TypeDecorator


class CaseInsensitiveEnum(TypeDecorator):
    """Safely converts between uppercase/lowercase DB strings and Python Enum instances."""
    impl = String(50)
    cache_ok = True

    def __init__(self, enum_cls, **kwargs):
        super().__init__(**kwargs)
        self.enum_cls = enum_cls

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            return value.value
        val_str = str(value).strip().lower()
        try:
            return self.enum_cls(val_str).value
        except ValueError:
            for member in self.enum_cls:
                if member.name.lower() == val_str:
                    return member.value
            return val_str

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            return value
        val_str = str(value).strip().lower()
        try:
            return self.enum_cls(val_str)
        except ValueError:
            for member in self.enum_cls:
                if member.name.lower() == val_str:
                    return member
            return value


class Report(db.Model):
    __tablename__ = 'reports'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    report_type = Column(CaseInsensitiveEnum(ReportType), default=ReportType.DAILY)
    format = Column(CaseInsensitiveEnum(ReportFormat), default=ReportFormat.PDF)
    status = Column(CaseInsensitiveEnum(ReportStatus), default=ReportStatus.PENDING)

    # Filters
    service_ids = Column(String(500))  # comma-separated
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    include_metrics = Column(String(500))  # comma-separated

    file_path = Column(String(500))
    file_size = Column(Integer)
    download_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    generated_at = Column(DateTime)

    user = relationship('User', back_populates='reports')

    def _enum_value(self, value):
        return value.value if isinstance(value, enum.Enum) else value

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'report_type': self._enum_value(self.report_type),
            'format': self._enum_value(self.format),
            'status': self._enum_value(self.status),
            'service_ids': self.service_ids,
            'start_date': to_iso_utc(self.start_date),
            'end_date': to_iso_utc(self.end_date),
            'include_metrics': self.include_metrics,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'download_count': self.download_count,
            'created_at': to_iso_utc(self.created_at),
            'generated_at': to_iso_utc(self.generated_at)
        }
