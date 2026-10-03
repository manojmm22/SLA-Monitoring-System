from flask import jsonify


def success_response(data=None, message="Success", status_code=200):
    response = {
        "success": True,
        "message": message,
        "data": data
    }
    return jsonify(response), status_code


def error_response(message="Error", errors=None, status_code=400):
    response = {
        "success": False,
        "message": message,
        "errors": errors or []
    }
    return jsonify(response), status_code


def paginated_response(data, pagination, message="Success"):
    return jsonify({
        "success": True,
        "message": message,
        "data": data,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total_pages": pagination.pages,
            "total_items": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        }
    }), 200
