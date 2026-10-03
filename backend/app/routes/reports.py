import os
from flask import Blueprint, request, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.report import Report, ReportStatus, ReportType, ReportFormat
from app.models.user import User
from app.models.log import ApiLog, PerformanceLog
from app.utils.database import db
from app.utils.response import success_response, error_response, paginated_response
from app.utils.datetime_utils import parse_utc_datetime

reports_bp = Blueprint('reports', __name__)


def _resolve_user():
    raw_identity = get_jwt_identity()
    user_id = None
    if raw_identity is not None:
        try:
            user_id = int(raw_identity)
        except (ValueError, TypeError):
            u_match = User.query.filter((User.username == str(raw_identity)) | (User.email == str(raw_identity))).first()
            if u_match:
                user_id = u_match.id

    user = db.session.get(User, user_id) if user_id else None
    if not user:
        user = User.query.first()
        user_id = user.id if user else 1
    return user, user_id


@reports_bp.route('/', methods=['GET'], strict_slashes=False)
@reports_bp.route('', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_reports():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    user, current_user_id = _resolve_user()

    if user and user.is_admin:
        query = Report.query
    else:
        query = Report.query.filter_by(user_id=current_user_id)

    pagination = query.order_by(Report.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return paginated_response([r.to_dict() for r in pagination.items], pagination)


@reports_bp.route('/<int:id>', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_report(id):
    user, current_user_id = _resolve_user()
    report = db.session.get(Report, id)

    if not report:
        return error_response('Report not found', status_code=404)

    if report.user_id != current_user_id and not (user and user.is_admin):
        return error_response('Unauthorized to access this report', status_code=403)

    return success_response(report.to_dict())


@reports_bp.route('/', methods=['POST'], strict_slashes=False)
@reports_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def create_report():
    data = request.get_json() or {}
    report_type_str = str(data.get('report_type', 'daily')).strip().lower()
    format_str = str(data.get('format', 'pdf')).strip().lower()

    live_aliases = {'live', 'realtime', 'real-time', 'replication', 'live-replication'}
    all_time_aliases = {'all', 'all_time', 'all-time', 'alltime'}
    if report_type_str in live_aliases:
        report_type = ReportType.LIVE
    elif report_type_str in all_time_aliases:
        report_type = ReportType.ALL_TIME
    else:
        try:
            report_type = ReportType(report_type_str)
        except ValueError:
            report_type = ReportType.DAILY

    if format_str in ('xlsx', 'excel'):
        format_enum = ReportFormat.EXCEL
    else:
        try:
            format_enum = ReportFormat(format_str)
        except ValueError:
            format_enum = ReportFormat.PDF

    # Safely parse and sanitize service_ids
    raw_service_ids = data.get('service_ids')
    if isinstance(raw_service_ids, list):
        valid_ids = []
        for sid in raw_service_ids:
            try:
                valid_ids.append(str(int(sid)))
            except (ValueError, TypeError):
                pass
        service_ids_str = ','.join(valid_ids) if valid_ids else None
    elif isinstance(raw_service_ids, str) and raw_service_ids.strip():
        valid_ids = []
        for part in raw_service_ids.split(','):
            part = part.strip()
            if part:
                try:
                    valid_ids.append(str(int(part)))
                except (ValueError, TypeError):
                    pass
        service_ids_str = ','.join(valid_ids) if valid_ids else None
    else:
        service_ids_str = None

    # Safely resolve user_id from JWT identity
    raw_identity = get_jwt_identity()
    user_id = None
    if raw_identity is not None:
        try:
            user_id = int(raw_identity)
        except (ValueError, TypeError):
            u_match = User.query.filter((User.username == str(raw_identity)) | (User.email == str(raw_identity))).first()
            if u_match:
                user_id = u_match.id

    if user_id is None or not db.session.get(User, user_id):
        fallback_user = User.query.first()
        user_id = fallback_user.id if fallback_user else 1

    # Format report name
    type_label = report_type.value.replace('_', ' ').title() if hasattr(report_type, 'value') else str(report_type).title()
    raw_name = data.get('name')
    if raw_name and str(raw_name).strip():
        report_name = str(raw_name).strip()
    else:
        report_name = f"{type_label} SLA Telemetry Audit Report"

    raw_desc = data.get('description')
    description = str(raw_desc).strip() if raw_desc and str(raw_desc).strip() else None

    # Parse dates safely
    parsed_start = parse_utc_datetime(data.get('start_date'))
    parsed_end = parse_utc_datetime(data.get('end_date'))

    if report_type == ReportType.ALL_TIME:
        if not parsed_start:
            earliest_api = db.session.query(db.func.min(ApiLog.timestamp)).scalar()
            earliest_perf = db.session.query(db.func.min(PerformanceLog.timestamp)).scalar()
            candidates = [t for t in [earliest_api, earliest_perf] if t is not None]
            if candidates:
                parsed_start = parse_utc_datetime(min(candidates))
        if not parsed_end:
            from datetime import datetime, timezone
            parsed_end = datetime.now(timezone.utc).replace(tzinfo=None)

    try:
        report = Report(
            user_id=user_id,
            name=report_name,
            description=description,
            report_type=report_type,
            format=format_enum,
            service_ids=service_ids_str,
            start_date=parsed_start,
            end_date=parsed_end,
            status=ReportStatus.PENDING
        )
        db.session.add(report)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to initialize report record: {str(e)}", status_code=500)

    try:
        from app.agents.report_agent import ReportAgent
        agent = ReportAgent()
        result = agent.run(report_id=report.id)
        db.session.refresh(report)

        if report.status == ReportStatus.FAILED or (isinstance(result, dict) and result.get('success') is False):
            err_msg = (result.get('error') if isinstance(result, dict) else None) or 'Report generation failed'
            return error_response(err_msg, status_code=500)

        return success_response(report.to_dict(), 'Report generated successfully', 201)
    except Exception as e:
        try:
            report.status = ReportStatus.FAILED
            db.session.commit()
        except Exception:
            db.session.rollback()
        return error_response(f'Report generation failed: {str(e)}', status_code=500)


@reports_bp.route('/<int:id>/download', methods=['GET'], strict_slashes=False)
@jwt_required()
def download_report(id):
    user, current_user_id = _resolve_user()
    report = db.session.get(Report, id)

    if not report:
        return error_response('Report not found', status_code=404)

    if report.user_id != current_user_id and not (user and user.is_admin):
        return error_response('Unauthorized to access this report', status_code=403)

    # Automatically upgrade legacy or undersized reports (< 5KB indicates old 1-table minimal layout)
    needs_regen = False
    if report.status != ReportStatus.COMPLETED or not report.file_path or not os.path.exists(report.file_path):
        needs_regen = True
    elif os.path.exists(report.file_path):
        file_size = os.path.getsize(report.file_path)
        if report.format == ReportFormat.PDF and file_size < 5000:
            needs_regen = True

    if needs_regen:
        from app.agents.report_agent import ReportAgent
        agent = ReportAgent()
        agent.run(report_id=report.id)
        db.session.refresh(report)

    if report.status != ReportStatus.COMPLETED:
        return error_response('Report generation failed or not ready', status_code=500)

    file_path = report.file_path
    if not file_path:
        return error_response('Report file path is missing', status_code=404)

    if not os.path.isabs(file_path):
        reports_dir = current_app.config.get(
            'REPORTS_DIR',
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'reports')
        )
        file_path = os.path.join(reports_dir, os.path.basename(file_path))

    if not os.path.exists(file_path):
        # Fallback check directly in reports directory
        alt_reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'reports')
        alt_path = os.path.join(alt_reports_dir, os.path.basename(file_path))
        if os.path.exists(alt_path):
            file_path = alt_path
        else:
            return error_response('Report file not found', status_code=404)

    report.download_count = (report.download_count or 0) + 1
    db.session.commit()

    filename = os.path.basename(file_path)
    return send_file(os.path.abspath(file_path), as_attachment=True, download_name=filename)


@reports_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def delete_report(id):
    user, current_user_id = _resolve_user()
    report = db.session.get(Report, id)

    if not report:
        return error_response('Report not found', status_code=404)

    if report.user_id != current_user_id and not (user and user.is_admin):
        return error_response('Unauthorized to delete this report', status_code=403)

    if report.file_path and os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except OSError:
            pass

    db.session.delete(report)
    db.session.commit()
    return success_response(None, 'Report deleted successfully')
