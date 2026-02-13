"""Appointment and session note models."""

from django.db import models

from directory.models import TherapistProfile
from patients.models import Patient


class Appointment(models.Model):
    """Appointment booking. Timezone-aware: store UTC, use timezone for display."""

    class Status(models.TextChoices):
        BOOKED = "booked", "Booked"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    therapist = models.ForeignKey(
        TherapistProfile, on_delete=models.CASCADE, related_name="appointments"
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BOOKED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["therapist"]),
            models.Index(fields=["patient"]),
            models.Index(fields=["starts_at"]),
        ]


class SessionNote(models.Model):
    """Session note. Only assigned therapist can create/edit. Clinic admin cannot see body."""

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="session_note"
    )
    author = models.ForeignKey(TherapistProfile, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
