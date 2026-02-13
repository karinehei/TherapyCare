"""Patient serializers."""

from rest_framework import serializers

from .models import Patient


class PatientListSerializer(serializers.ModelSerializer):
    clinic_name = serializers.CharField(source="clinic.name", read_only=True)
    owner_therapist_name = serializers.CharField(
        source="owner_therapist.display_name", read_only=True
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "name",
            "email",
            "clinic",
            "clinic_name",
            "owner_therapist",
            "owner_therapist_name",
            "created_at",
        ]


class ReferralTimelineSerializer(serializers.Serializer):
    """Lightweight referral for patient timeline."""

    id = serializers.IntegerField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    questionnaires = serializers.ListField(child=serializers.DictField())
    note_count = serializers.IntegerField()


class AppointmentTimelineSerializer(serializers.Serializer):
    """Lightweight appointment for patient timeline."""

    id = serializers.IntegerField()
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    status = serializers.CharField()
    therapist_name = serializers.CharField()


class PatientDetailSerializer(serializers.ModelSerializer):
    referral_timeline = serializers.SerializerMethodField()
    appointments_timeline = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source="clinic.name", read_only=True)
    owner_therapist_name = serializers.CharField(
        source="owner_therapist.display_name", read_only=True
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "clinic",
            "clinic_name",
            "owner_therapist",
            "owner_therapist_name",
            "referral",
            "name",
            "email",
            "phone",
            "consent_flags",
            "created_at",
            "referral_timeline",
            "appointments_timeline",
        ]

    def get_referral_timeline(self, obj):
        if not obj.referral_id:
            return None
        ref = obj.referral
        return {
            "id": ref.id,
            "status": ref.status,
            "created_at": ref.created_at,
            "questionnaires": [
                {"id": q.id, "type": q.type, "score": q.score, "created_at": q.created_at}
                for q in ref.questionnaires.all()
            ],
            "note_count": ref.notes.count(),
        }

    def get_appointments_timeline(self, obj):
        return [
            {
                "id": a.id,
                "starts_at": a.starts_at,
                "ends_at": a.ends_at,
                "status": a.status,
                "therapist_name": a.therapist.display_name,
            }
            for a in obj.appointments.all().order_by("starts_at")
        ]
