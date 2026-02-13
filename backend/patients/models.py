"""Patient and access models."""
from django.db import models

from accounts.models import User


class PatientProfile(models.Model):
    """Legacy: user-linked patient profile (kept for migrations)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="patient_profile")
    date_of_birth = models.DateField(null=True, blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)
    insurance_info = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Consent(models.Model):
    """Legacy: consent record for PatientProfile."""

    class ConsentType(models.TextChoices):
        TREATMENT = "treatment", "Treatment"
        HIPAA = "hipaa", "HIPAA"
        PHI = "phi", "PHI Sharing"

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE)
    consent_type = models.CharField(max_length=32, choices=ConsentType.choices)
    granted = models.BooleanField(default=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "consent_type"], name="patients_consent_patient_type_unique")
        ]
        indexes = [models.Index(fields=["patient"], name="patients_co_patient__idx")]


from clinics.models import Clinic
from directory.models import TherapistProfile
from referrals.models import Referral


class Patient(models.Model):
    """Patient record. Created when referral is APPROVED with assigned therapist."""

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    owner_therapist = models.ForeignKey(
        TherapistProfile, on_delete=models.CASCADE, related_name="owned_patients"
    )
    referral = models.ForeignKey(
        Referral, on_delete=models.SET_NULL, null=True, blank=True, related_name="patient"
    )
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    consent_flags = models.JSONField(default=dict)  # e.g. {"treatment": True, "hipaa": True}
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["clinic"]),
            models.Index(fields=["owner_therapist"]),
        ]


class PatientAccessType(models.TextChoices):
    """Who can access patient record."""

    THERAPIST = "therapist", "Therapist"
    ADMIN = "admin", "Admin"
    SUPPORT_READONLY = "support_readonly", "Support (Read Only)"


class PatientAccess(models.Model):
    """Grants a user access to a patient record."""

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="access_grants")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_type = models.CharField(
        max_length=20, choices=PatientAccessType.choices, default=PatientAccessType.THERAPIST
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "user"], name="patients_access_patient_user_unique")
        ]
        indexes = [
            models.Index(fields=["patient"]),
            models.Index(fields=["user"]),
        ]
