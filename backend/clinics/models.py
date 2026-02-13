"""
Clinic and membership models.
Membership links User <-> Clinic with role: therapist or admin.
"""
from django.db import models

from accounts.models import User


class Clinic(models.Model):
    """Clinic/organization."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
        ]


class Membership(models.Model):
    """User membership in a clinic. Role: therapist or admin."""

    class MemberRole(models.TextChoices):
        THERAPIST = "therapist", "Therapist"
        ADMIN = "admin", "Admin"

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=MemberRole.choices, default=MemberRole.THERAPIST)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "clinic"], name="clinics_membership_user_clinic_unique")
        ]
        indexes = [
            models.Index(fields=["clinic"]),
            models.Index(fields=["user"]),
        ]
