"""Audit serializers. Sensitive fields never exposed in API response."""

from rest_framework import serializers

from .models import AuditEvent
from .service import sanitize_metadata


class AuditEventSerializer(serializers.ModelSerializer):
    """List/detail. Metadata sanitized on output; sensitive keys never exposed."""

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "actor",
            "action",
            "entity_type",
            "entity_id",
            "metadata",
            "ip",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Defence in depth: strip any sensitive keys that might exist in DB
        if isinstance(data.get("metadata"), dict):
            data["metadata"] = sanitize_metadata(data["metadata"])
        return data
