"""Admin for audit."""
from django.contrib import admin
from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("id", "actor", "action", "entity_type", "entity_id", "created_at")
    list_filter = ("action", "entity_type")
    search_fields = ("entity_id", "actor__email")
    date_hierarchy = "created_at"
    readonly_fields = ("id", "actor", "action", "entity_type", "entity_id", "metadata", "ip", "user_agent", "created_at")
