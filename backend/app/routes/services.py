from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.models.service import Service, ServiceEndpoint
from app.utils.database import db
from app.utils.response import success_response, error_response, paginated_response

services_bp = Blueprint('services', __name__)


@services_bp.route('/', methods=['GET'])
@jwt_required()
def get_services():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    search = request.args.get('search')

    query = Service.query
    if status:
        try:
            from app.models.service import ServiceStatus
            query = query.filter_by(status=ServiceStatus(status.lower()))
        except ValueError:
            pass
    if search:
        query = query.filter(Service.name.ilike(f'%{search}%'))

    pagination = query.order_by(Service.created_at.desc()).paginate(page=page, per_page=per_page)
    return paginated_response([s.to_dict() for s in pagination.items], pagination)


@services_bp.route('/', methods=['POST'])
@jwt_required()
def create_service():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('base_url'):
        return error_response('Name and base_url are required')

    service = Service(
        name=data['name'],
        description=data.get('description'),
        base_url=data['base_url'],
        service_type=data.get('service_type', 'rest_api'),
        response_time_threshold=data.get('response_time_threshold', 2000),
        cpu_threshold=data.get('cpu_threshold', 80),
        ram_threshold=data.get('ram_threshold', 85),
        disk_threshold=data.get('disk_threshold', 90),
        availability_threshold=data.get('availability_threshold', 99.9),
        polling_interval=data.get('polling_interval', 30),
        tags=data.get('tags'),
        category=data.get('category'),
        owner=data.get('owner'),
        team=data.get('team')
    )

    db.session.add(service)
    db.session.commit()
    return success_response(service.to_dict(), 'Service created', 201)


@services_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_service(id):
    service = Service.query.get_or_404(id)
    return success_response(service.to_dict())


@services_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_service(id):
    service = Service.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        if hasattr(service, key):
            setattr(service, key, value)
    db.session.commit()
    return success_response(service.to_dict(), 'Service updated')


@services_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_service(id):
    service = Service.query.get_or_404(id)
    from app.models.log import ApiLog, PerformanceLog
    from app.models.alert import Alert
    from app.models.sla import SlaViolation, SlaRule
    from app.models.recovery_log import RecoveryLog
    from app.models.service import ServiceEndpoint

    ApiLog.query.filter_by(service_id=id).delete(synchronize_session=False)
    PerformanceLog.query.filter_by(service_id=id).delete(synchronize_session=False)
    Alert.query.filter_by(service_id=id).delete(synchronize_session=False)
    SlaViolation.query.filter_by(service_id=id).delete(synchronize_session=False)
    RecoveryLog.query.filter_by(service_id=id).delete(synchronize_session=False)
    SlaRule.query.filter_by(service_id=id).delete(synchronize_session=False)
    ServiceEndpoint.query.filter_by(service_id=id).delete(synchronize_session=False)

    db.session.delete(service)
    db.session.commit()
    return success_response(message='Service deleted successfully')


@services_bp.route('/<int:id>/endpoints', methods=['POST'])
@jwt_required()
def add_endpoint(id):
    Service.query.get_or_404(id)
    data = request.get_json()
    endpoint = ServiceEndpoint(
        service_id=id,
        name=data['name'],
        path=data['path'],
        method=data.get('method', 'GET'),
        description=data.get('description'),
        headers=data.get('headers'),
        body=data.get('body'),
        expected_status_code=data.get('expected_status_code', 200)
    )
    db.session.add(endpoint)
    db.session.commit()
    return success_response(endpoint.to_dict(), 'Endpoint added', 201)
