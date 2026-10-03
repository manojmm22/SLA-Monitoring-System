from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.models.configuration import Configuration
from app.utils.database import db
from app.utils.response import success_response, error_response
from datetime import datetime

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'])
@jwt_required()
def get_settings():
    configs = Configuration.query.all()
    return success_response([c.to_dict() for c in configs])


@settings_bp.route('/<key>', methods=['PUT'])
@jwt_required()
def update_setting(key):
    config = Configuration.query.filter_by(key=key).first_or_404()
    if not config.is_editable:
        return error_response('This setting is not editable')
    data = request.get_json()
    config.value = str(data.get('value'))
    config.updated_at = datetime.utcnow()
    db.session.commit()
    return success_response(config.to_dict(), 'Setting updated')
