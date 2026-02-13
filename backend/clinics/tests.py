"""Clinic tests: CRUD limited to clinic admins."""
import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic, Membership

User = get_user_model()


@pytest.fixture
def clinic_admin():
    """User with role CLINIC_ADMIN."""
    return User.objects.create_user(
        email="admin@clinic.example",
        password="admin123",
        role="clinic_admin",
    )


@pytest.fixture
def help_seeker():
    """User with role HELP_SEEKER."""
    return User.objects.create_user(
        email="help@example.com",
        password="seek123",
        role="help_seeker",
    )


@pytest.fixture
def clinic():
    """Sample clinic."""
    return Clinic.objects.create(name="Test Clinic", slug="test-clinic")


@pytest.mark.django_db
class TestClinicCRUD:
    """Clinic CRUD: only CLINIC_ADMIN can create/update/delete."""

    def test_list_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/v1/clinics/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_clinic_admin_can_list(self, clinic_admin, clinic):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.get("/api/v1/clinics/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1

    def test_clinic_admin_can_create(self, clinic_admin):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.post(
            "/api/v1/clinics/",
            {"name": "New Clinic", "slug": "new-clinic"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert Clinic.objects.filter(slug="new-clinic").exists()

    def test_help_seeker_cannot_create(self, help_seeker):
        client = APIClient()
        client.force_authenticate(user=help_seeker)
        resp = client.post(
            "/api/v1/clinics/",
            {"name": "Unauthorized", "slug": "unauthorized"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_clinic_admin_can_update(self, clinic_admin, clinic):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.patch(
            f"/api/v1/clinics/{clinic.slug}/",
            {"name": "Updated Name"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        clinic.refresh_from_db()
        assert clinic.name == "Updated Name"


@pytest.mark.django_db
class TestMembership:
    """Membership model constraints."""

    def test_unique_user_clinic(self, clinic_admin, clinic):
        Membership.objects.create(user=clinic_admin, clinic=clinic, role="admin")
        with pytest.raises(IntegrityError):
            Membership.objects.create(user=clinic_admin, clinic=clinic, role="therapist")
