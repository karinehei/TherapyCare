"""Referral tests: create, list, update, state transitions, notes, questionnaires."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from directory.models import TherapistProfile
from referrals.models import Questionnaire, Referral, ReferralNote, ReferralStatus
from referrals.state_machine import can_transition

User = get_user_model()


@pytest.fixture
def help_seeker():
    return User.objects.create_user(
        email="help@test.com",
        password="pass123",
        role="help_seeker",
        first_name="Help",
        last_name="Seeker",
    )


@pytest.fixture
def clinic_admin():
    return User.objects.create_user(
        email="admin@clinic.com",
        password="admin123",
        role="clinic_admin",
    )


@pytest.fixture
def therapist_user():
    return User.objects.create_user(
        email="therapist@test.com",
        password="pass123",
        role="therapist",
    )


@pytest.fixture
def therapist_profile(therapist_user):
    return TherapistProfile.objects.create(
        user=therapist_user,
        display_name="Test Therapist",
        bio="Bio",
    )


@pytest.fixture
def clinic():
    return Clinic.objects.create(name="Test Clinic", slug="test-clinic")


@pytest.fixture
def referral(help_seeker, clinic, therapist_profile):
    return Referral.objects.create(
        clinic=clinic,
        requester_user=help_seeker,
        patient_name="John Doe",
        patient_email="john@example.com",
        status=ReferralStatus.NEW,
        assigned_therapist=therapist_profile,
    )


@pytest.mark.django_db
class TestStateMachine:
    """State transition guard."""

    def test_valid_transitions(self):
        assert can_transition("new", "needs_info") is True
        assert can_transition("new", "approved") is True
        assert can_transition("new", "rejected") is True
        assert can_transition("approved", "scheduled") is True
        assert can_transition("scheduled", "ongoing") is True
        assert can_transition("ongoing", "closed") is True

    def test_invalid_transitions(self):
        assert can_transition("new", "scheduled") is False
        assert can_transition("closed", "new") is False
        assert can_transition("rejected", "approved") is False
        assert can_transition("approved", "new") is False

    def test_same_status_allowed(self):
        assert can_transition("new", "new") is True


@pytest.mark.django_db
class TestReferralCreate:
    """POST /api/v1/referrals/"""

    def test_help_seeker_can_create(self, help_seeker, clinic):
        client = APIClient()
        client.force_authenticate(user=help_seeker)
        resp = client.post(
            "/api/v1/referrals/",
            {"clinic": clinic.id, "patient_name": "Jane", "patient_email": "jane@example.com"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        r = Referral.objects.get(patient_email="jane@example.com")
        assert r.requester_user == help_seeker
        assert r.status == ReferralStatus.NEW

    def test_unauthenticated_can_create_self_referral(self, clinic):
        client = APIClient()
        resp = client.post(
            "/api/v1/referrals/",
            {"patient_name": "Walk-in", "patient_email": "walkin@example.com"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        r = Referral.objects.get(patient_email="walkin@example.com")
        assert r.requester_user is None
        assert r.clinic is None


@pytest.mark.django_db
class TestReferralList:
    """GET /api/v1/referrals/ - role-filtered."""

    def test_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/v1/referrals/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_help_seeker_sees_own(self, help_seeker, referral):
        client = APIClient()
        client.force_authenticate(user=help_seeker)
        resp = client.get("/api/v1/referrals/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1
        assert resp.data["results"][0]["patient_name"] == "John Doe"

    def test_therapist_sees_assigned_only(self, therapist_user, referral):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get("/api/v1/referrals/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1

    def test_clinic_admin_sees_all(self, clinic_admin, referral):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.get("/api/v1/referrals/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1


@pytest.mark.django_db
class TestReferralPatch:
    """PATCH /api/v1/referrals/{id}/ - status transitions."""

    def test_clinic_admin_can_patch(self, clinic_admin, referral):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.patch(
            f"/api/v1/referrals/{referral.id}/",
            {"status": "approved"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        referral.refresh_from_db()
        assert referral.status == ReferralStatus.APPROVED

    def test_invalid_transition_rejected(self, clinic_admin, referral):
        client = APIClient()
        client.force_authenticate(user=clinic_admin)
        resp = client.patch(
            f"/api/v1/referrals/{referral.id}/",
            {"status": "closed"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        referral.refresh_from_db()
        assert referral.status == ReferralStatus.NEW

    def test_help_seeker_cannot_patch(self, help_seeker, referral):
        client = APIClient()
        client.force_authenticate(user=help_seeker)
        resp = client.patch(
            f"/api/v1/referrals/{referral.id}/",
            {"status": "approved"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestReferralNotes:
    """POST /api/v1/referrals/{id}/notes/"""

    def test_authenticated_can_add_note(self, help_seeker, referral):
        client = APIClient()
        client.force_authenticate(user=help_seeker)
        resp = client.post(
            f"/api/v1/referrals/{referral.id}/notes/",
            {"body": "First note"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert ReferralNote.objects.filter(referral=referral).count() == 1


@pytest.mark.django_db
class TestReferralQuestionnaires:
    """POST /api/v1/referrals/{id}/questionnaires/"""

    def test_authenticated_can_add_questionnaire(self, help_seeker, referral):
        client = APIClient()
        client.force_authenticate(user=help_seeker)
        resp = client.post(
            f"/api/v1/referrals/{referral.id}/questionnaires/",
            {"type": "phq9", "answers": {"q1": 1, "q2": 2}, "score": 5},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        q = Questionnaire.objects.get(referral=referral)
        assert q.type == "phq9"
        assert q.score == 5
