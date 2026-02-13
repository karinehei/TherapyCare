"""Tests for permission bypass attempts. Ensures role-based access cannot be circumvented."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def therapist_user():
    return User.objects.create_user(email="t1@test.com", password="x", role="therapist")


@pytest.fixture
def therapist_user_2():
    return User.objects.create_user(email="t2@test.com", password="x", role="therapist")


@pytest.fixture
def help_seeker_user():
    return User.objects.create_user(email="hs@test.com", password="x", role="help_seeker")


@pytest.fixture
def clinic_admin_user():
    return User.objects.create_user(email="admin@test.com", password="x", role="clinic_admin")


@pytest.fixture
def support_user():
    return User.objects.create_user(email="support@test.com", password="x", role="support")


@pytest.fixture
def clinic():
    from clinics.models import Clinic
    return Clinic.objects.create(name="C", slug="c")


@pytest.fixture
def therapist_profile(therapist_user, clinic):
    from directory.models import TherapistProfile
    return TherapistProfile.objects.create(
        user=therapist_user,
        display_name="Dr. T1",
        bio="",
        clinic=clinic,
    )


@pytest.fixture
def therapist_profile_2(therapist_user_2, clinic):
    from directory.models import TherapistProfile
    return TherapistProfile.objects.create(
        user=therapist_user_2,
        display_name="Dr. T2",
        bio="",
        clinic=clinic,
    )


@pytest.fixture
def patient(therapist_profile, clinic):
    from referrals.models import Referral, ReferralStatus
    from patients.models import Patient
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
def patient_2(therapist_profile_2, clinic):
    from referrals.models import Referral, ReferralStatus
    from patients.models import Patient
    ref = Referral.objects.create(
        clinic=clinic,
        patient_name="Bob",
        patient_email="bob@ex.com",
        status=ReferralStatus.APPROVED,
        assigned_therapist=therapist_profile_2,
    )
    return Patient.objects.create(
        clinic=clinic,
        owner_therapist=therapist_profile_2,
        referral=ref,
        name="Bob",
        email="bob@ex.com",
    )


@pytest.fixture
def appointment(patient, therapist_profile):
    from datetime import timedelta
    from django.utils import timezone
    from appointments.models import Appointment
    start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
    end = start + timedelta(minutes=50)
    return Appointment.objects.create(
        patient=patient,
        therapist=therapist_profile,
        starts_at=start,
        ends_at=end,
        status="booked",
    )


@pytest.fixture
def referral(help_seeker_user, clinic, therapist_profile):
    from referrals.models import Referral, ReferralStatus
    return Referral.objects.create(
        clinic=clinic,
        patient_name="Alice",
        patient_email="alice@ex.com",
        requester_user=help_seeker_user,
        status=ReferralStatus.NEW,
        assigned_therapist=therapist_profile,
    )


@pytest.fixture
def referral_other(help_seeker_user, clinic):
    """Referral by another help-seeker (we'll create a different user)."""
    other_user = User.objects.create_user(email="other@test.com", password="x", role="help_seeker")
    from referrals.models import Referral, ReferralStatus
    return Referral.objects.create(
        clinic=clinic,
        patient_name="Other",
        patient_email="other@ex.com",
        requester_user=other_user,
        status=ReferralStatus.NEW,
    )


@pytest.mark.django_db
class TestPatientPermissionBypass:
    """Therapist cannot access another therapist's patients."""

    def test_therapist_cannot_access_other_therapist_patient(self, therapist_user, patient_2):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get(f"/api/v1/patients/{patient_2.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_help_seeker_cannot_list_patients(self, help_seeker_user):
        client = APIClient()
        client.force_authenticate(user=help_seeker_user)
        resp = client.get("/api/v1/patients/")
        assert resp.status_code == status.HTTP_200_OK
        # List returns empty for help_seeker without access_grants
        assert len(resp.data.get("results", [])) == 0


@pytest.mark.django_db
class TestReferralPermissionBypass:
    """Help-seeker cannot access another user's referrals."""

    def test_help_seeker_cannot_access_other_referral(self, help_seeker_user, referral_other):
        client = APIClient()
        client.force_authenticate(user=help_seeker_user)
        resp = client.get(f"/api/v1/referrals/{referral_other.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_help_seeker_cannot_patch_referral_status(self, help_seeker_user, referral):
        client = APIClient()
        client.force_authenticate(user=help_seeker_user)
        resp = client.patch(f"/api/v1/referrals/{referral.id}/", {"status": "approved"}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAppointmentPermissionBypass:
    """Therapist cannot create session note for another therapist's appointment."""

    def test_therapist_cannot_create_note_on_other_appointment(self, therapist_user_2, appointment):
        client = APIClient()
        client.force_authenticate(user=therapist_user_2)
        resp = client.post(
            f"/api/v1/appointments/{appointment.id}/note/",
            {"body": "Unauthorized note"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_help_seeker_cannot_book_appointment(self, help_seeker_user, patient, therapist_profile):
        from datetime import timedelta
        from django.utils import timezone
        client = APIClient()
        client.force_authenticate(user=help_seeker_user)
        start = timezone.now() + timedelta(days=1)
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
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAuditPermissionBypass:
    """Only support can access audit logs."""

    def test_therapist_cannot_list_audit_events(self, therapist_user):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get("/api/v1/audit/events/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_clinic_admin_cannot_list_audit_events(self, clinic_admin_user):
        client = APIClient()
        client.force_authenticate(user=clinic_admin_user)
        resp = client.get("/api/v1/audit/events/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_help_seeker_cannot_list_audit_events(self, help_seeker_user):
        client = APIClient()
        client.force_authenticate(user=help_seeker_user)
        resp = client.get("/api/v1/audit/events/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
