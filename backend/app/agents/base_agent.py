from abc import ABC, abstractmethod
from datetime import datetime, timezone
import time
import uuid
from app.utils.logger import logger
from app.models.log import AgentLog
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc


class BaseAgent(ABC):
    def __init__(self, name, agent_type):
        self.name = name
        self.agent_type = agent_type
        self.agent_id = str(uuid.uuid4())
        self.is_running = False
        self.last_run = None
        self.run_count = 0
        self.logger = logger

    def log(self, message, level='INFO', service_id=None, metadata=None, execution_time=None):
        try:
            agent_log = AgentLog(
                agent_name=self.name,
                agent_type=self.agent_type,
                level=level,
                message=message,
                service_id=service_id,
                agent_metadata=metadata,
                execution_time=execution_time
            )
            db.session.add(agent_log)
            db.session.commit()
        except Exception as e:
            self.logger.error(f"Failed to log agent activity: {str(e)}")
            db.session.rollback()

    @abstractmethod
    def execute(self, *args, **kwargs):
        pass

    def run(self, *args, **kwargs):
        start_time = time.perf_counter()
        self.is_running = True
        self.run_count += 1

        try:
            self.logger.info(f"[{self.name}] Starting execution...")
            result = self.execute(*args, **kwargs)
            execution_time = (time.perf_counter() - start_time) * 1000
            self.last_run = datetime.now(timezone.utc).replace(tzinfo=None)
            self.log(
                f"Execution completed successfully",
                level='INFO',
                metadata={'run_count': self.run_count},
                execution_time=execution_time
            )
            self.logger.info(f"[{self.name}] Execution completed in {execution_time:.2f}ms")
            return result
        except Exception as e:
            execution_time = (time.perf_counter() - start_time) * 1000
            self.log(
                f"Execution failed: {str(e)}",
                level='ERROR',
                metadata={'error': str(e)},
                execution_time=execution_time
            )
            self.logger.error(f"[{self.name}] Execution failed: {str(e)}")
            raise
        finally:
            self.is_running = False

    def get_status(self):
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'type': self.agent_type,
            'is_running': self.is_running,
            'last_run': to_iso_utc(self.last_run),
            'run_count': self.run_count
        }
