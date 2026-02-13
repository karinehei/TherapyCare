"""Append-only audit log models."""

import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class AuditEvent(models.Model):
    """Append-only audit log event. Sensitive fields (e.g. SessionNote body) never stored in metadata."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events"
    )
    action = models.CharField(max_length=32, db_index=True)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict)
    ip = models.CharField(max_length=45, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["actor"]),
            models.Index(fields=["entity_type"]),
        ]
