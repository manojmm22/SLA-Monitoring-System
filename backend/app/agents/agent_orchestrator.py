"""
Agent Orchestrator – schedules and runs independent background monitoring agents
using APScheduler. Handles cross-agent coordination.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from app.agents.response_tracker_agent import ResponseTrackerAgent
from app.agents.resource_monitor_agent import ResourceMonitorAgent
from app.agents.time_analyzer_agent import TimeAnalyzerAgent
from app.agents.sla_checker_agent import SlaCheckerAgent
from app.agents.alert_agent import AlertAgent
from app.agents.report_agent import ReportAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.agents.prediction_agent import PredictionAgent
from app.agents.recovery_agent import RecoveryAgent
from app.utils.logger import logger


class AgentOrchestrator:
    """Central coordinator for independent background monitoring agents."""

    def __init__(self, app=None):
        self.app = app
        self.agents = {
            'response_tracker': ResponseTrackerAgent(),
            'resource_monitor': ResourceMonitorAgent(),
            'time_analyzer': TimeAnalyzerAgent(),
            'sla_checker': SlaCheckerAgent(),
            'alert': AlertAgent(),
            'report': ReportAgent(),
            'recommendation': RecommendationAgent(),
            'prediction': PredictionAgent(),
            'recovery': RecoveryAgent()
        }
        self.scheduler = BackgroundScheduler()
        self.is_running = False

    def start(self):
        """Register agent jobs with distinct polling intervals and start scheduler."""
        if self.is_running:
            return
        
        job_defaults = {'max_instances': 1, 'coalesce': True, 'misfire_grace_time': 30}

        # Core monitoring – distinct intervals to avoid scheduler overlap
        self.scheduler.add_job(
            self._run_response_tracker, 'interval', seconds=30,
            id='response_tracker', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_resource_monitor, 'interval', seconds=60,
            id='resource_monitor', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_alert_checker, 'interval', minutes=2,
            id='alert_checker', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_recovery_agent, 'interval', minutes=2,
            id='recovery_agent', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_sla_checker, 'interval', minutes=5,
            id='sla_checker', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_time_analyzer, 'interval', minutes=5,
            id='time_analyzer', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_recommendation_agent, 'interval', minutes=10,
            id='recommendation_agent', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_report_agent, 'interval', minutes=30,
            id='report_agent', replace_existing=True, **job_defaults
        )
        self.scheduler.add_job(
            self._run_prediction_agent, 'interval', minutes=15,
            id='prediction_agent', replace_existing=True, **job_defaults
        )

        self.scheduler.start()
        self.is_running = True
        logger.info("Agent Orchestrator started successfully with distinct scheduler intervals.")

    def stop(self):
        """Stop background scheduler."""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Agent Orchestrator stopped")

    def _run_response_tracker(self):
        self._execute_agent_with_context('response_tracker')

    def _run_resource_monitor(self):
        self._execute_agent_with_context('resource_monitor')

    def _run_sla_checker(self):
        self._execute_agent_with_context('sla_checker')

    def _run_alert_checker(self):
        self._execute_agent_with_context('alert')

    def _run_time_analyzer(self):
        self._execute_agent_with_context('time_analyzer')

    def _run_report_agent(self):
        self._execute_agent_with_context('report')

    def _run_recommendation_agent(self):
        self._execute_agent_with_context('recommendation')

    def _run_prediction_agent(self):
        self._execute_agent_with_context('prediction')

    def _run_recovery_agent(self):
        self._execute_agent_with_context('recovery')

    def _execute_agent_with_context(self, agent_name):
        """Utility wrapper ensuring agents execute within the Flask application context."""
        if not self.app:
            return
        try:
            with self.app.app_context():
                self.agents[agent_name].run()
        except Exception as e:
            logger.error(f"Error executing agent {agent_name}: {str(e)}")

    def get_status(self):
        return {
            'is_running': self.is_running,
            'agents': {name: agent.get_status() for name, agent in self.agents.items()},
            'scheduled_jobs': [job.id for job in self.scheduler.get_jobs()] if self.is_running else []
        }

    def run_agent(self, agent_name, **kwargs):
        if agent_name in self.agents:
            if not self.app:
                return self.agents[agent_name].run(**kwargs)
            with self.app.app_context():
                return self.agents[agent_name].run(**kwargs)
        raise ValueError(f"Unknown agent: {agent_name}")
