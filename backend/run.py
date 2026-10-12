import os
from app import create_app
from app.agents.agent_orchestrator import AgentOrchestrator

config_name = os.environ.get('FLASK_ENV')
if not config_name:
    config_name = 'production' if os.environ.get('VERCEL') else 'development'
elif config_name not in ('production', 'testing'):
    config_name = 'development'

app = create_app(config_name)

if __name__ == '__main__':
    # Start the agent orchestrator safely if not already started
    if not hasattr(app, 'orchestrator'):
        orchestrator = AgentOrchestrator(app)
        orchestrator.start()
        app.orchestrator = orchestrator
    else:
        orchestrator = app.orchestrator
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=app.config.get('DEBUG', True), use_reloader=False)
    finally:
        orchestrator.stop()
