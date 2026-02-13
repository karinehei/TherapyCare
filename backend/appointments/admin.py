"""Admin for appointments."""
from django.contrib import admin
from .models import Appointment, SessionNote


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "therapist", "starts_at", "ends_at", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("patient__name", "therapist__display_name")
    date_hierarchy = "starts_at"


@admin.register(SessionNote)
class SessionNoteAdmin(admin.ModelAdmin):
    list_display = ("appointment", "author", "created_at", "updated_at")
    search_fields = ("appointment__patient__name",)
