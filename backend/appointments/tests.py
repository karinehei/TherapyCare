"""Appointment tests: booking, permissions, session note masking."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment, SessionNote
from directory.models import TherapistProfile
from patients.models import Patient

User = get_user_model()


@pytest.fixture
def clinic():
    from clinics.models import Clinic

    return Clinic.objects.create(name="C", slug="c")


@pytest.fixture
def therapist_user():
    return User.objects.create_user(email="t@test.com", password="x", role="therapist")


@pytest.fixture
def therapist_profile(therapist_user, clinic):
    return TherapistProfile.objects.create(
        user=therapist_user,
        display_name="Dr. T",
        bio="",
        clinic=clinic,
    )


@pytest.fixture
def clinic_admin():
    return User.objects.create_user(
        email="admin@clinic.com",
        password="x",
        role="clinic_admin",
    )


@pytest.fixture
def patient(clinic, therapist_profile):
    from referrals.models import Referral, ReferralStatus

    ref = Referral.objects.create(
        clinic=clinic,
        patient_name="Jane",
        patient_email="jane@ex.com",
        status=ReferralStatus.APPROVED,
        assigned_therapist=therapist_profile,
    )
    return Patient.objects.create(
        clinic=clinic,
        owner_therapist=therapist_profile,
        referral=ref,
        name="Jane",
        email="jane@ex.com",
    )


@pytest.fixture
def appointment(patient, therapist_profile):
    from datetime import timedelta

    from django.utils import timezone

    start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
    end = start + timedelta(minutes=50)
    return Appointment.objects.create(
        patient=patient,
        therapist=therapist_profile,
        starts_at=start,
        ends_at=end,
        status="booked",
    )


@pytest.mark.django_db
class TestAppointmentBooking:
    """POST /api/v1/appointments/"""

    def test_therapist_can_book(self, therapist_user, patient, therapist_profile):
        from datetime import timedelta

        from django.utils import timezone

        client = APIClient()
        client.force_authenticate(user=therapist_user)
        start = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
        end = start + timedelta(minutes=50)
        resp = client.post(
            "/api/v1/appointments/",
            {
                "patient": patient.id,
                "therapist": therapist_profile.id,
                "starts_at": start.isoformat(),
                "ends_at": end.isoformat(),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert Appointment.objects.count() >= 1


@pytest.mark.django_db
class TestSessionNote:
    """POST/PATCH /api/v1/appointments/{id}/note/"""

    def test_only_therapist_can_create_note(self, therapist_user, appointment):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.post(
            f"/api/v1/appointments/{appointment.id}/note/",
            {"body": "Session went well."},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        note = SessionNote.objects.get(appointment=appointment)
        assert note.body == "Session went well."

    def test_clinic_admin_cannot_create_note(self, clinic_admin, appointment):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.post(
            f"/api/v1/appointments/{appointment.id}/note/",
            {"body": "Admin note"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_clinic_admin_sees_masked_body(self, clinic_admin, appointment, therapist_user):
        SessionNote.objects.create(
            appointment=appointment,
            author=appointment.therapist,
            body="Confidential session content",
        )
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.get(f"/api/v1/appointments/{appointment.id}/")
        assert resp.status_code == status.HTTP_200_OK
        note = resp.data.get("session_note")
        assert note is not None
        assert "REDACTED" in note["body"]
        assert "Confidential" not in note["body"]

    def test_therapist_sees_full_body(self, therapist_user, appointment):
        SessionNote.objects.create(
            appointment=appointment,
            author=appointment.therapist,
            body="Confidential session content",
        )
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get(f"/api/v1/appointments/{appointment.id}/")
        assert resp.status_code == status.HTTP_200_OK
        note = resp.data.get("session_note")
        assert note is not None
        assert note["body"] == "Confidential session content"
