import time
from app import create_app
from app.agents.agent_orchestrator import AgentOrchestrator

app = create_app('development')
orchestrator = AgentOrchestrator(app)
orchestrator.start()
time.sleep(5)

with app.app_context():
    print('response_tracker', orchestrator.run_agent('response_tracker'))
    print('resource_monitor', orchestrator.run_agent('resource_monitor'))
    print('time_analyzer', orchestrator.run_agent('time_analyzer'))
    print('sla_checker', orchestrator.run_agent('sla_checker'))
    print('alert', orchestrator.run_agent('alert'))
    print('report', orchestrator.run_agent('report'))
    print('recommendation', orchestrator.run_agent('recommendation'))

orchestrator.stop()
