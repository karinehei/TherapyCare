"""Patient tests: permissions, role-filtered list."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from directory.models import TherapistProfile
from patients.models import Patient

User = get_user_model()


@pytest.fixture
def clinic():
    return Clinic.objects.create(name="Test Clinic", slug="test-clinic")


@pytest.fixture
def therapist_user():
    return User.objects.create_user(email="t@test.com", password="x", role="therapist")


@pytest.fixture
def therapist_profile(therapist_user):
    return TherapistProfile.objects.create(
        user=therapist_user,
        display_name="Dr. Test",
        bio="Bio",
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
        patient_name="John Doe",
        patient_email="john@example.com",
        status=ReferralStatus.APPROVED,
        assigned_therapist=therapist_profile,
    )
    return Patient.objects.create(
        clinic=clinic,
        owner_therapist=therapist_profile,
        referral=ref,
        name="John Doe",
        email="john@example.com",
    )


@pytest.mark.django_db
class TestPatientList:
    """GET /api/v1/patients/"""

    def test_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/v1/patients/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_clinic_admin_sees_all(self, clinic_admin, patient):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.get("/api/v1/patients/")
        assert resp.status_code == status.HTTP_200_OK
        assert any(p["id"] == patient.id for p in resp.data["results"])

    def test_therapist_sees_owned(self, therapist_user, patient):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get("/api/v1/patients/")
        assert resp.status_code == status.HTTP_200_OK
        assert any(p["id"] == patient.id for p in resp.data["results"])


@pytest.mark.django_db
class TestPatientDetail:
    """GET /api/v1/patients/{id}/"""

    def test_therapist_can_retrieve_own_patient(self, therapist_user, patient):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get(f"/api/v1/patients/{patient.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "John Doe"
