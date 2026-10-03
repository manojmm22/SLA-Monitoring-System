from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import config
import os

jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    from app.utils.database import init_db
    init_db(app)

    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
    jwt.init_app(app)
    limiter.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.services import services_bp
    from app.routes.monitoring import monitoring_bp
    from app.routes.alerts import alerts_bp
    from app.routes.reports import reports_bp
    from app.routes.analytics import analytics_bp
    from app.routes.agents import agents_bp
    from app.routes.settings import settings_bp
    from app.routes.users import users_bp
    from app.routes.audit import audit_bp
    from app.routes.notifications import notifications_bp
    from app.routes.predictions import predictions_bp
    from app.routes.recovery import recovery_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(agents_bp, url_prefix='/api/agents')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(recovery_bp, url_prefix='/api/recovery')

    should_start_agents = os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug
    if should_start_agents:
        with app.app_context():
            from app.agents.agent_orchestrator import AgentOrchestrator
            if not getattr(app, 'orchestrator', None):
                orchestrator = AgentOrchestrator(app)
                orchestrator.start()
                app.orchestrator = orchestrator
            elif not getattr(app.orchestrator, 'is_running', False):
                app.orchestrator.start()

    @app.errorhandler(404)
    def not_found(error):
        return {'success': False, 'message': 'Resource not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {'success': False, 'message': 'Internal server error'}, 500

    return app
