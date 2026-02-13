"""
Audit service: append-only event logging.
Sensitive fields (e.g. SessionNote body) are NEVER stored in metadata.
"""
from django.contrib.auth import get_user_model

from .models import AuditEvent

User = get_user_model()

# Entity types we audit
ENTITY_PATIENT = "patient"
ENTITY_APPOINTMENT = "appointment"
ENTITY_REFERRAL = "referral"
ENTITY_SESSION_NOTE = "session_note"

# Metadata keys that must NEVER be stored (sensitive content)
FORBIDDEN_METADATA_KEYS = frozenset({
    "body", "content", "session_note_body", "note_body",
    "password", "token", "secret", "api_key", "access_token", "refresh_token",
    "email", "phone", "ssn", "diagnosis", "medical", "health",
})


def get_client_ip(request):
    """Extract client IP from request."""
    if not request:
        return ""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def get_user_agent(request):
    """Extract User-Agent from request."""
    if not request:
        return ""
    return request.META.get("HTTP_USER_AGENT", "")


def sanitize_metadata(metadata):
    """
    Remove sensitive fields from metadata. SessionNote body and similar must NEVER be stored.
    Recursively sanitizes nested dicts.
    """
    if not isinstance(metadata, dict):
        return {}
    result = {}
    for k, v in metadata.items():
        if k.lower() in FORBIDDEN_METADATA_KEYS:
            continue
        if isinstance(v, dict):
            v = sanitize_metadata(v)
        result[k] = v
    return result


def log_event(
    *,
    action: str,
    entity_type: str,
    entity_id: str = "",
    metadata: dict | None = None,
    request=None,
    actor=None,
):
    """
    Append an audit event. Metadata is sanitized; sensitive fields (e.g. body) are never stored.
    """
    if metadata is None:
        metadata = {}
    metadata = sanitize_metadata(metadata)

    actor_id = actor.id if actor else None
    if actor is None and request and getattr(request, "user", None) and request.user.is_authenticated:
        actor_id = request.user.id

    AuditEvent.objects.create(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else "",
        metadata=metadata,
        ip=get_client_ip(request) if request else "",
        user_agent=get_user_agent(request) if request else "",
    )
