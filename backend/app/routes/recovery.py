"""
Recovery Actions API Routes.
Provides manual triggers and execution histories for system self-healing components.
"""
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.service import Service, ServiceStatus
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.models.recovery_log import RecoveryLog, RecoveryActionType
from app.agents.recovery_agent import RecoveryAgent
from app.utils.response import success_response, error_response, paginated_response
from app.utils.database import db

recovery_bp = Blueprint('recovery', __name__)


def get_recovery_agent():
    """Access the orchestrator's running RecoveryAgent instance if active, or instantiate one."""
    if hasattr(current_app, 'orchestrator') and current_app.orchestrator:
        agent = current_app.orchestrator.agents.get('recovery')
        if agent:
            return agent
    return RecoveryAgent()


@recovery_bp.route('/status', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_recovery_status():
    """Get real-time operational status and metrics of autonomous self-healing agents."""
    agent = get_recovery_agent()
    summary = agent.get_autonomous_summary()
    summary['agent_status'] = agent.get_status()
    return success_response(summary)


@recovery_bp.route('/auto-heal', methods=['POST'], strict_slashes=False)
@jwt_required()
def trigger_auto_heal():
    """
    Trigger an immediate autonomous self-healing scan.
    The recovery agent autonomously evaluates all degraded/down microservices,
    applies optimal self-healing protocols, resolves active alerts, and restores system health.
    """
    agent = get_recovery_agent()
    results = agent.run(ignore_cooldown=True)  # Calls BaseAgent.run() which invokes execute() with logging
    summary = agent.get_autonomous_summary()
    summary['agent_status'] = agent.get_status()
    
    count = len(results) if isinstance(results, list) else 0
    return success_response({
        'healed_actions': results if isinstance(results, list) else [],
        'actions_count': count,
        'summary': summary,
        'agent_status': agent.get_status()
    }, f"Autonomous scan complete: Healed {count} service issue(s)")


@recovery_bp.route('/simulate-issue', methods=['POST'], strict_slashes=False)
@jwt_required()
def simulate_issue_and_heal():
    """
    Simulate a service issue or critical alert, then immediately have the Autonomous Recovery Agent
    detect, diagnose, self-heal, and restore the service to healthy with zero manual workflow.
    """
    data = request.get_json() or {}
    service_id = data.get('service_id')

    if service_id:
        target_service = db.session.get(Service, service_id)
    else:
        target_service = Service.query.filter_by(is_active=True).first()

    if not target_service:
        return error_response('No active microservices available to simulate', 404)

    # Inject simulated critical degradation
    target_service.status = ServiceStatus.DOWN
    alert = Alert(
        service_id=target_service.id,
        title=f"Incident: {target_service.name} Process Container Crash",
        description=f"Critical heartbeat loss detected on {target_service.name}. Autonomous agent dispatched.",
        severity=AlertSeverity.CRITICAL,
        status=AlertStatus.ACTIVE,
        metric_name='availability',
        metric_value=0.0,
        threshold_value=99.0
    )
    db.session.add(alert)
    db.session.commit()

    # Dispatched Autonomous Recovery Agent
    agent = get_recovery_agent()
    results = agent.run(ignore_cooldown=True)
    summary = agent.get_autonomous_summary()
    summary['agent_status'] = agent.get_status()

    return success_response({
        'simulated_service': target_service.name,
        'healed_actions': results if isinstance(results, list) else [],
        'actions_count': len(results) if isinstance(results, list) else 0,
        'summary': summary
    }, f"Simulated issue on {target_service.name} was autonomously detected & healed by the AI Agent!")


@recovery_bp.route('/toggle-auto', methods=['POST'], strict_slashes=False)
@jwt_required()
def toggle_auto_recovery():
    """Enable or disable background continuous autonomous self-healing."""
    data = request.get_json() or {}
    agent = get_recovery_agent()
    enabled = data.get('enabled', True)
    agent.auto_recovery_enabled = bool(enabled)
    return success_response({
        'auto_recovery_enabled': bool(enabled),
        'agent_status': agent.get_status()
    }, f"Autonomous self-healing {'enabled' if enabled else 'paused'}")


@recovery_bp.route('/history', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_recovery_history():
    """List recovery log entries with pagination."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    service_id = request.args.get('service_id', type=int)

    query = RecoveryLog.query
    if service_id:
        query = query.filter_by(service_id=service_id)

    pagination = query.order_by(RecoveryLog.started_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return paginated_response(
        [log.to_dict() for log in pagination.items], pagination
    )


@recovery_bp.route('/actions', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_recovery_actions():
    """Get list of all supported recovery actions."""
    actions = [
        {'key': action.value, 'label': action.value.replace('_', ' ').title()}
        for action in RecoveryActionType
    ]
    return success_response(actions)


@recovery_bp.route('/execute/<int:service_id>', methods=['POST'], strict_slashes=False)
@jwt_required()
def execute_manual_recovery(service_id):
    """Execute a targeted self-healing recovery action for a specific service."""
    service = Service.query.get_or_404(service_id)
    data = request.get_json() or {}
    
    action_val = data.get('action')
    if not action_val:
        # Default to smart diagnosis if not specified
        agent = get_recovery_agent()
        action_enum = agent._diagnose_service_issue(service)
        action_val = action_enum.value
    else:
        try:
            RecoveryActionType(action_val)
        except ValueError:
            return error_response(f'Invalid recovery action type: {action_val}')

    reason = data.get('reason', 'Targeted self-healing intervention requested via UI')

    agent = get_recovery_agent()
    result = agent.execute(
        service_id=service.id,
        action_type=action_val,
        reason=reason,
        ignore_cooldown=True
    )

    if isinstance(result, dict) and 'error' in result:
        return error_response(result['error'], status_code=500)

    return success_response(result, f"Self-healing protocol {action_val} executed successfully on {service.name}")

