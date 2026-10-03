"""
AI/ML Predictions API Routes.
Provides SLA forecasting, performance predictions, and root-cause analysis endpoints.
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.models.service import Service
from app.agents.prediction_agent import PredictionAgent
from app.agents.root_cause_analyzer import RootCauseAnalyzer
from app.utils.response import success_response, error_response

predictions_bp = Blueprint('predictions', __name__)


@predictions_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_predictions():
    """Get predictions for all active services."""
    agent = PredictionAgent()
    predictions = agent.execute()
    return success_response(predictions)


@predictions_bp.route('/<int:service_id>', methods=['GET'])
@jwt_required()
def get_service_prediction(service_id):
    """Get prediction for a single service."""
    service = Service.query.get_or_404(service_id)
    agent = PredictionAgent()
    prediction = agent.execute(service_id=service.id)
    return success_response(prediction.get(service.id))


@predictions_bp.route('/root-cause/<int:service_id>', methods=['GET'])
@jwt_required()
def get_root_cause(service_id):
    """Perform diagnostic root-cause analysis on a service."""
    service = Service.query.get_or_404(service_id)
    analysis = RootCauseAnalyzer.analyze(service)
    return success_response(analysis)


@predictions_bp.route('/retrain', methods=['POST'])
@jwt_required()
def retrain_models():
    """Force training of prediction models for all services."""
    agent = PredictionAgent()
    services = Service.query.filter_by(is_active=True).all()
    
    trained = []
    for service in services:
        agent._train_models_for_service(service, force=True)
        trained.append(service.name)

    return success_response(
        {'trained_services': trained},
        'AI/ML models retrained successfully'
    )
