"""
Models package – imports all SQLAlchemy models so they are registered
with the metadata before ``db.create_all()`` is called.
"""
from app.models.user import User, Role, Permission          # noqa: F401
from app.models.service import Service, ServiceEndpoint      # noqa: F401
from app.models.log import ApiLog, PerformanceLog, AgentLog, AuditLog  # noqa: F401
from app.models.alert import Alert, AlertRule                # noqa: F401
from app.models.sla import SlaRule, SlaViolation             # noqa: F401
from app.models.report import Report                         # noqa: F401
from app.models.configuration import Configuration          # noqa: F401
from app.models.notification import Notification             # noqa: F401
from app.models.recovery_log import RecoveryLog              # noqa: F401
