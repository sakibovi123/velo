from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Returns every DRF error in the canonical envelope:

        {
            "success": false,
            "data": null,
            "error": {
                "code": "<snake_case_error_code>",
                "message": "<human-readable message>"
            }
        }
    """
    response = exception_handler(exc, context)

    if response is None:
        return None

    # Derive a machine-readable code from the status code.
    code = getattr(exc, "default_code", None) or _status_to_code(response.status_code)

    # Flatten DRF's varied error structures into a single string message.
    message = _flatten_errors(response.data)

    response.data = {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
        },
    }

    return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _status_to_code(status_code: int) -> str:
    mapping = {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
        status.HTTP_429_TOO_MANY_REQUESTS: "too_many_requests",
        status.HTTP_500_INTERNAL_SERVER_ERROR: "internal_server_error",
    }
    return mapping.get(status_code, "error")


def _flatten_errors(data) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return " ".join(_flatten_errors(item) for item in data)
    if isinstance(data, dict):
        parts = []
        for key, value in data.items():
            flat = _flatten_errors(value)
            if key in ("detail", "non_field_errors"):
                parts.append(flat)
            else:
                parts.append(f"{key}: {flat}")
        return " | ".join(parts)
    return str(data)
