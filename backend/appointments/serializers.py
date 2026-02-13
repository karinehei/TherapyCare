"""Appointment serializers. SessionNote body masked for clinic admin."""

from rest_framework import serializers

from .models import Appointment, SessionNote


class AppointmentListSerializer(serializers.ModelSerializer):
    """Calendar list: no session note body. Includes patient/therapist names."""

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.display_name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_name",
            "therapist",
            "therapist_name",
            "starts_at",
            "ends_at",
            "status",
            "created_at",
        ]


class SessionNoteSerializer(serializers.ModelSerializer):
    """Session note. Masks body for clinic admin."""

    class Meta:
        model = SessionNote
        fields = ["id", "author", "body", "created_at", "updated_at"]


class SessionNoteMaskedSerializer(serializers.ModelSerializer):
    """Session note with body masked (clinic admin/support - not assigned therapist)."""

    body = serializers.SerializerMethodField()

    class Meta:
        model = SessionNote
        fields = ["id", "author", "body", "created_at", "updated_at"]

    def get_body(self, obj):
        # Keep wording stable (tests + UI rely on "REDACTED")
        return "REDACTED"


class AppointmentDetailSerializer(serializers.ModelSerializer):
    """Detail with session note. Body masked if user is clinic admin."""

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.display_name", read_only=True)
    session_note = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_name",
            "therapist",
            "therapist_name",
            "starts_at",
            "ends_at",
            "status",
            "session_note",
            "created_at",
            "updated_at",
        ]

    def get_session_note(self, obj):
        if not hasattr(obj, "session_note") or not obj.session_note:
            return None
        note = obj.session_note
        request = self.context.get("request")
        mask = request and getattr(request, "_mask_session_note", False)
        if mask:
            return SessionNoteMaskedSerializer(note).data
        return SessionNoteSerializer(note).data


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """POST: booking."""

    class Meta:
        model = Appointment
        fields = ["patient", "therapist", "starts_at", "ends_at"]

    def validate(self, data):
        if data["ends_at"] <= data["starts_at"]:
            raise serializers.ValidationError("ends_at must be after starts_at")
        return data


class SessionNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionNote
        fields = ["body"]


class SessionNoteUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionNote
        fields = ["body"]
