from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class Configuration(db.Model):
    __tablename__ = 'configurations'

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text)
    value_type = Column(String(20), default='string')  # string, int, float, bool, json
    description = Column(Text)
    category = Column(String(50), default='general')  # general, monitoring, alerting, security
    is_editable = Column(Boolean, default=True)
    is_secret = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer)

    def get_typed_value(self):
        if self.value_type == 'int':
            return int(self.value) if self.value else 0
        elif self.value_type == 'float':
            return float(self.value) if self.value else 0.0
        elif self.value_type == 'bool':
            return self.value.lower() == 'true' if self.value else False
        elif self.value_type == 'json':
            import json
            return json.loads(self.value) if self.value else {}
        return self.value

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': '***' if self.is_secret else self.value,
            'value_type': self.value_type,
            'description': self.description,
            'category': self.category,
            'is_editable': self.is_editable,
            'is_secret': self.is_secret,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at)
        }
