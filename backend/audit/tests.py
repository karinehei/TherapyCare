"""Audit tests: events created, note bodies never stored in metadata."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from audit.models import AuditEvent
from audit.service import sanitize_metadata

User = get_user_model()


@pytest.fixture
def support_user():
    return User.objects.create_user(email="support@test.com", password="x", role="support")


@pytest.fixture
def therapist_user():
    return User.objects.create_user(email="t@test.com", password="x", role="therapist")


@pytest.fixture
def clinic():
    from clinics.models import Clinic

    return Clinic.objects.create(name="C", slug="c")


@pytest.fixture
def therapist_profile(therapist_user, clinic):
    from directory.models import TherapistProfile

    return TherapistProfile.objects.create(
        user=therapist_user,
        display_name="Dr. T",
        bio="",
        clinic=clinic,
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
    from patients.models import Patient

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


@pytest.mark.django_db
class TestAuditEventsCreated:
    """Events are created for login, logout, patient view, appointment create, session note."""

    def test_login_creates_event(self, therapist_user):
        client = APIClient()
        client.post(
            "/api/v1/auth/login/",
            {"email": "t@test.com", "password": "x"},
            format="json",
        )
        events = AuditEvent.objects.filter(action="login", entity_type="user")
        assert events.exists()
        assert events.first().actor_id == therapist_user.id

    def test_logout_creates_event(self, therapist_user):
        client = APIClient()
        # Login first
        r = client.post(
            "/api/v1/auth/login/",
            {"email": "t@test.com", "password": "x"},
            format="json",
        )
        token = r.data.get("access")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        client.post("/api/v1/auth/logout/", {"refresh": r.data.get("refresh")}, format="json")
        events = AuditEvent.objects.filter(action="logout", entity_type="user")
        assert events.exists()

    def test_patient_retrieve_creates_event(self, therapist_user, patient, therapist_profile):
        from clinics.models import Membership

        Membership.objects.create(user=therapist_user, clinic=patient.clinic, role="therapist")
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        client.get(f"/api/v1/patients/{patient.id}/")
        events = AuditEvent.objects.filter(
            action="view", entity_type="patient", entity_id=str(patient.id)
        )
        assert events.exists()

    def test_appointment_create_creates_event(self, therapist_user, patient, therapist_profile):
        from datetime import timedelta

        from django.utils import timezone

        from clinics.models import Membership

        Membership.objects.create(user=therapist_user, clinic=patient.clinic, role="therapist")
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        start = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
        end = start + timedelta(minutes=50)
        client.post(
            "/api/v1/appointments/",
            {
                "patient": patient.id,
                "therapist": therapist_profile.id,
                "starts_at": start.isoformat(),
                "ends_at": end.isoformat(),
            },
            format="json",
        )
        assert AuditEvent.objects.filter(action="create", entity_type="appointment").exists()

    def test_session_note_create_creates_event(self, therapist_user, appointment):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        client.post(
            f"/api/v1/appointments/{appointment.id}/note/",
            {"body": "Confidential session content."},
            format="json",
        )
        events = AuditEvent.objects.filter(action="create", entity_type="session_note")
        assert events.exists()


@pytest.mark.django_db
class TestNoteBodiesNeverStored:
    """SessionNote body and other sensitive fields are NEVER stored in metadata."""

    def test_sanitize_metadata_strips_body(self):
        assert sanitize_metadata({"body": "secret"}) == {}
        assert sanitize_metadata({"body": "x", "other": "ok"}) == {"other": "ok"}

    def test_sanitize_metadata_strips_content(self):
        assert sanitize_metadata({"content": "secret"}) == {}

    def test_sanitize_metadata_strips_password_token(self):
        assert sanitize_metadata({"password": "secret123"}) == {}
        assert sanitize_metadata({"access_token": "jwt..."}) == {}
        assert sanitize_metadata({"refresh_token": "rt..."}) == {}

    def test_sanitize_metadata_strips_nested_sensitive(self):
        result = sanitize_metadata({"outer": {"body": "secret", "ok": 1}})
        assert result == {"outer": {"ok": 1}}

    def test_session_note_event_metadata_has_no_body(self, therapist_user, appointment):
        """Creating a session note must NOT store body in audit metadata."""
        from audit.service import ENTITY_SESSION_NOTE, log_event

        # Simulate what would happen if we accidentally passed body
        log_event(
            action="create",
            entity_type=ENTITY_SESSION_NOTE,
            entity_id="1",
            metadata={"body": "Patient disclosed suicidal thoughts"},
            request=None,
            actor=therapist_user,
        )
        ev = AuditEvent.objects.filter(entity_type="session_note").first()
        assert ev is not None
        assert "body" not in ev.metadata
        assert "Patient disclosed" not in str(ev.metadata)

    def test_log_event_service_sanitizes(self):
        """log_event always sanitizes metadata before storing."""
        from audit.service import log_event

        log_event(
            action="create",
            entity_type="session_note",
            entity_id="99",
            metadata={"body": "sensitive", "appointment_id": 42},
        )
        ev = AuditEvent.objects.filter(entity_id="99").first()
        assert ev is not None
        assert "body" not in ev.metadata
        assert ev.metadata.get("appointment_id") == 42

    def test_audit_serializer_strips_sensitive_on_output(self, support_user):
        """Defence in depth: serializer strips sensitive keys even if present in DB."""
        ev = AuditEvent.objects.create(
            action="view",
            entity_type="patient",
            entity_id="1",
            metadata={"body": "leaked", "ok": 1},
        )
        from audit.serializers import AuditEventSerializer

        data = AuditEventSerializer(ev).data
        assert "body" not in data["metadata"]
        assert data["metadata"].get("ok") == 1


@pytest.mark.django_db
class TestAuditAPI:
    """GET /api/v1/audit/events - support-only, filters."""

    def test_support_can_list_events(self, support_user):
        AuditEvent.objects.create(
            action="login",
            entity_type="user",
            entity_id="1",
            metadata={},
        )
        client = APIClient()
        client.force_authenticate(user=support_user)
        resp = client.get("/api/v1/audit/events/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data.get("results", resp.data)) >= 1

    def test_support_can_filter_by_entity_type(self, support_user, therapist_user):
        AuditEvent.objects.create(
            action="view",
            entity_type="patient",
            entity_id="1",
            actor=therapist_user,
        )
        client = APIClient()
        client.force_authenticate(user=support_user)
        resp = client.get("/api/v1/audit/events/", {"entity_type": "patient"})
        assert resp.status_code == status.HTTP_200_OK

    def test_support_can_filter_by_actor(self, support_user, therapist_user):
        AuditEvent.objects.create(
            action="login",
            entity_type="user",
            entity_id=str(therapist_user.id),
            actor=therapist_user,
        )
        client = APIClient()
        client.force_authenticate(user=support_user)
        resp = client.get("/api/v1/audit/events/", {"actor": str(therapist_user.id)})
        assert resp.status_code == status.HTTP_200_OK

    def test_therapist_cannot_list_events(self, therapist_user):
        client = APIClient()
        client.force_authenticate(user=therapist_user)
        resp = client.get("/api/v1/audit/events/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
