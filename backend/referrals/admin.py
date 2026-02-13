"""Admin for referrals."""

from django.contrib import admin

from .models import Questionnaire, Referral, ReferralNote


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = (
        "patient_name",
        "patient_email",
        "clinic",
        "status",
        "assigned_therapist",
        "created_at",
    )
    list_filter = ("status", "clinic")
    search_fields = ("patient_name", "patient_email")


@admin.register(ReferralNote)
class ReferralNoteAdmin(admin.ModelAdmin):
    list_display = ("referral", "author", "created_at")
    search_fields = ("referral__patient_name", "body")


@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ("referral", "type", "score", "created_at")
    list_filter = ("type",)
    search_fields = ("referral__patient_name",)
