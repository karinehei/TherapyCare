"""Admin for patients."""

from django.contrib import admin

from .models import Consent, Patient, PatientAccess, PatientProfile


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "clinic", "owner_therapist", "created_at")
    list_filter = ("clinic",)
    search_fields = ("name", "email", "phone")


@admin.register(PatientAccess)
class PatientAccessAdmin(admin.ModelAdmin):
    list_display = ("patient", "user", "access_type", "created_at")
    list_filter = ("access_type",)
    search_fields = ("patient__name", "user__email")


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "date_of_birth", "created_at")
    search_fields = ("user__email",)


@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ("patient", "consent_type", "granted", "granted_at")
    list_filter = ("consent_type", "granted")
    search_fields = ("patient__user__email",)
