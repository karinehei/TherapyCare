"""Directory tests: search, filters, permissions."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from directory.models import AvailabilitySlot, TherapistProfile

User = get_user_model()


@pytest.fixture
def therapist_user():
    return User.objects.create_user(
        email="therapist@test.com",
        password="pass123",
        role="therapist",
        first_name="Jane",
        last_name="Doe",
    )


@pytest.fixture
def help_seeker_user():
    return User.objects.create_user(
        email="help@test.com",
        password="pass123",
        role="help_seeker",
    )


@pytest.fixture
def therapist_profile(therapist_user):
    return TherapistProfile.objects.create(
        user=therapist_user,
        display_name="Jane Doe",
        bio="I specialize in anxiety and depression.",
        languages=["English", "Spanish"],
        specialties=["Anxiety", "Depression", "CBT"],
        price_min=80,
        price_max=150,
        remote_available=True,
        city="San Francisco",
    )


@pytest.fixture
def therapist_profile_2():
    user = User.objects.create_user(email="t2@test.com", password="x", role="therapist")
    return TherapistProfile.objects.create(
        user=user,
        display_name="Bob Smith",
        bio="Trauma-focused therapy.",
        languages=["English"],
        specialties=["PTSD", "Trauma"],
        price_min=100,
        price_max=200,
        remote_available=False,
        city="Oakland",
    )


@pytest.mark.django_db
class TestTherapistList:
    """GET /api/v1/therapists/ - public, no auth required."""

    def test_list_public_no_auth(self, therapist_profile):
        client = APIClient()
        resp = client.get("/api/v1/therapists/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1
        assert resp.data["results"][0]["display_name"] == "Jane Doe"

    def test_filter_by_specialty(self, therapist_profile, therapist_profile_2):
        client = APIClient()
        resp = client.get("/api/v1/therapists/?specialty=Anxiety")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1
        ids = [r["id"] for r in resp.data["results"]]
        assert therapist_profile.id in ids

    def test_filter_by_city(self, therapist_profile, therapist_profile_2):
        client = APIClient()
        resp = client.get("/api/v1/therapists/?city=San Francisco")
        assert resp.status_code == status.HTTP_200_OK
        assert all("San Francisco" in r["city"] for r in resp.data["results"])

    def test_filter_by_remote(self, therapist_profile, therapist_profile_2):
        client = APIClient()
        resp = client.get("/api/v1/therapists/?remote=true")
        assert resp.status_code == status.HTTP_200_OK
        assert all(r["remote_available"] for r in resp.data["results"])

    def test_filter_by_price_range(self, therapist_profile):
        client = APIClient()
        resp = client.get("/api/v1/therapists/?price_min=50&price_max=120")
        assert resp.status_code == status.HTTP_200_OK
        # Jane has price_min=80, price_max=150 - fits range
        assert len(resp.data["results"]) >= 1

    def test_text_search(self, therapist_profile):
        client = APIClient()
        resp = client.get("/api/v1/therapists/?q=anxiety")
        assert resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in resp.data["results"]]
        assert therapist_profile.id in ids

    def test_pagination(self, therapist_profile):
        client = APIClient()
        resp = client.get("/api/v1/therapists/?page_size=1")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) <= 1
        assert "count" in resp.data


@pytest.mark.django_db
class TestTherapistDetail:
    """GET /api/v1/therapists/{id}/"""

    def test_detail_public(self, therapist_profile):
        client = APIClient()
        resp = client.get(f"/api/v1/therapists/{therapist_profile.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["display_name"] == "Jane Doe"
        assert "availability_slots" in resp.data


@pytest.mark.django_db
class TestTherapistMe:
    """PATCH /api/v1/therapists/me/ - therapist edits own profile."""

    def test_therapist_can_patch_own(self, therapist_user, therapist_profile):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.patch(
            "/api/v1/therapists/me/",
            {"display_name": "Jane Doe Updated", "bio": "New bio"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        therapist_profile.refresh_from_db()
        assert therapist_profile.display_name == "Jane Doe Updated"
        assert therapist_profile.bio == "New bio"

    def test_help_seeker_cannot_patch(self, help_seeker_user):
        client = APIClient()
        client.force_authenticate(user=help_seeker_user)
        resp = client.patch("/api/v1/therapists/me/", {"display_name": "X"}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_patch(self):
        client = APIClient()
        resp = client.patch("/api/v1/therapists/me/", {"display_name": "X"}, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_therapist_without_profile_gets_404(self, therapist_user):
        # Create therapist user but no TherapistProfile
        TherapistProfile.objects.filter(user=therapist_user).delete()
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.patch("/api/v1/therapists/me/", {"display_name": "X"}, format="json")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
