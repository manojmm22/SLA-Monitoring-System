from datetime import datetime, timezone


def now_utc():
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


def to_iso_utc(dt):
    """
    Format a datetime into a standard ISO-8601 string with UTC indicator ('Z').
    Ensures frontend clients (e.g. JavaScript new Date()) parse the timestamp as UTC
    and accurately convert to the user's local timezone.
    """
    if not dt:
        return None
    if isinstance(dt, str):
        if not dt.endswith('Z') and not dt.endswith('+00:00') and not ('+' in dt[10:] or '-' in dt[10:]):
            return dt + 'Z'
        return dt
    if dt.tzinfo is None:
        # Naive datetime assumed to be stored in UTC
        return dt.isoformat() + 'Z'
    # Convert to UTC and append Z
    utc_dt = dt.astimezone(timezone.utc)
    return utc_dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ') if utc_dt.microsecond else utc_dt.strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_utc_datetime(val):
    """
    Parse an ISO string or datetime into a naive UTC datetime suitable for SQLAlchemy
    comparisons against database columns.
    """
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is not None:
            return val.astimezone(timezone.utc).replace(tzinfo=None)
        return val
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        clean_str = val_str[:-1] + '+00:00' if val_str.endswith('Z') else val_str
        parsed = datetime.fromisoformat(clean_str)
        if parsed.tzinfo is not None:
            return parsed.astimezone(timezone.utc).replace(tzinfo=None)
        return parsed
    except Exception:
        try:
            from dateutil import parser
            parsed = parser.parse(val_str)
            if parsed.tzinfo is not None:
                return parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except Exception:
            return None
