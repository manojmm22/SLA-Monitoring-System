from flask import Blueprint, current_app
from flask_jwt_extended import jwt_required
from app.utils.response import success_response

agents_bp = Blueprint('agents', __name__)


@agents_bp.route('/status', methods=['GET'])
@jwt_required()
def get_agent_status():
    orchestrator = current_app.orchestrator
    return success_response(orchestrator.get_status())


@agents_bp.route('/run/<agent_name>', methods=['POST'])
@jwt_required()
def run_agent(agent_name):
    orchestrator = current_app.orchestrator
    try:
        result = orchestrator.run_agent(agent_name)
        return success_response(result, f'{agent_name} executed successfully')
    except Exception as e:
        return success_response({'error': str(e)}, f'Failed to run {agent_name}', 500)
