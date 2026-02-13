"""Referral serializers."""
from rest_framework import serializers

from .models import Questionnaire, Referral, ReferralNote
from .state_machine import can_transition, get_allowed_transitions


class ReferralListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = [
            "id",
            "clinic",
            "patient_name",
            "patient_email",
            "status",
            "assigned_therapist",
            "created_at",
        ]


class ReferralNoteSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = ReferralNote
        fields = ["id", "author", "author_email", "body", "created_at"]
        read_only_fields = ["author"]


class ReferralNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralNote
        fields = ["body"]


class QuestionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Questionnaire
        fields = ["id", "type", "answers", "score", "created_at"]


class ReferralDetailSerializer(serializers.ModelSerializer):
    notes = ReferralNoteSerializer(many=True, read_only=True)
    questionnaires = QuestionnaireSerializer(many=True, read_only=True)
    allowed_transitions = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()
    assigned_therapist_name = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = [
            "id",
            "clinic",
            "clinic_name",
            "requester_user",
            "patient_name",
            "patient_email",
            "reason",
            "status",
            "assigned_therapist",
            "assigned_therapist_name",
            "created_at",
            "updated_at",
            "notes",
            "questionnaires",
            "allowed_transitions",
        ]

    def get_allowed_transitions(self, obj):
        return get_allowed_transitions(obj.status)

    def get_clinic_name(self, obj):
        return obj.clinic.name if obj.clinic_id else None

    def get_assigned_therapist_name(self, obj):
        return obj.assigned_therapist.display_name if obj.assigned_therapist_id else None


class ReferralCreateSerializer(serializers.ModelSerializer):
    """POST: help-seeker creates referral (self or on behalf)."""

    questionnaire = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = Referral
        fields = ["clinic", "patient_name", "patient_email", "reason", "questionnaire"]

    def validate_questionnaire(self, value):
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("questionnaire must be an object")
        qtype = value.get("type")
        if qtype not in ("phq9", "gad7"):
            raise serializers.ValidationError("questionnaire.type must be phq9 or gad7")
        answers = value.get("answers", {})
        if not isinstance(answers, dict):
            raise serializers.ValidationError("questionnaire.answers must be an object")
        return value

    def create(self, validated_data):
        questionnaire_data = validated_data.pop("questionnaire", None)
        if self.context.get("request") and self.context["request"].user.is_authenticated:
            validated_data["requester_user"] = self.context["request"].user
        referral = super().create(validated_data)
        if questionnaire_data:
            from .models import Questionnaire

            Questionnaire.objects.create(
                referral=referral,
                type=questionnaire_data["type"],
                answers=questionnaire_data.get("answers", {}),
                score=questionnaire_data.get("score"),
            )
        return referral


class ReferralUpdateSerializer(serializers.ModelSerializer):
    """PATCH: clinic admin updates status, assigned_therapist."""

    class Meta:
        model = Referral
        fields = ["status", "assigned_therapist"]

    def validate_status(self, value):
        instance = self.instance
        if instance and not can_transition(instance.status, value):
            allowed = get_allowed_transitions(instance.status)
            raise serializers.ValidationError(
                f"Invalid transition from {instance.status} to {value}. Allowed: {allowed}"
            )
        return value


class QuestionnaireCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Questionnaire
        fields = ["type", "answers", "score"]

    def validate_type(self, value):
        if value not in ("phq9", "gad7"):
            raise serializers.ValidationError("type must be phq9 or gad7")
        return value
