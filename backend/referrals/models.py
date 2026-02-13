"""Referral and intake models."""
from django.db import models

from accounts.models import User
from clinics.models import Clinic
from directory.models import TherapistProfile


class ReferralStatus(models.TextChoices):
    """Referral pipeline status."""

    NEW = "new", "New"
    NEEDS_INFO = "needs_info", "Needs Info"
    APPROVED = "approved", "Approved"
    SCHEDULED = "scheduled", "Scheduled"
    ONGOING = "ongoing", "Ongoing"
    CLOSED = "closed", "Closed"
    REJECTED = "rejected", "Rejected"


class Referral(models.Model):
    """Referral / intake record. Clinic nullable for self-referral."""

    clinic = models.ForeignKey(Clinic, on_delete=models.SET_NULL, null=True, blank=True)
    requester_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="referrals_requested"
    )
    patient_name = models.CharField(max_length=200)
    patient_email = models.EmailField(blank=True)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=ReferralStatus.choices, default=ReferralStatus.NEW, db_index=True
    )
    assigned_therapist = models.ForeignKey(
        TherapistProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_referrals"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["clinic"]),
            models.Index(fields=["status"]),
            models.Index(fields=["assigned_therapist"]),
        ]


class ReferralNote(models.Model):
    """Note attached to a referral."""

    referral = models.ForeignKey(Referral, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class QuestionnaireType(models.TextChoices):
    """Questionnaire type."""

    PHQ9 = "phq9", "PHQ-9"
    GAD7 = "gad7", "GAD-7"


class Questionnaire(models.Model):
    """Screening questionnaire (PHQ-9, GAD-7) attached to referral."""

    referral = models.ForeignKey(Referral, on_delete=models.CASCADE, related_name="questionnaires")
    type = models.CharField(max_length=20, choices=QuestionnaireType.choices)
    answers = models.JSONField(default=dict)  # e.g. {"q1": 1, "q2": 2, ...}
    score = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["referral"]),
        ]
