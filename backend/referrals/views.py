"""Referral views: CRUD, notes, questionnaires."""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.permissions import user_is_clinic_admin, user_is_help_seeker, user_is_therapist
from audit.mixins import ReferralAuditMixin
from audit.service import ENTITY_REFERRAL, log_event

from .models import Questionnaire, Referral, ReferralNote
from .patient_creation import maybe_create_patient_for_referral
from .permissions import ReferralPermission
from .serializers import (
    QuestionnaireCreateSerializer,
    QuestionnaireSerializer,
    ReferralCreateSerializer,
    ReferralDetailSerializer,
    ReferralListSerializer,
    ReferralNoteCreateSerializer,
    ReferralNoteSerializer,
    ReferralUpdateSerializer,
)


class ReferralViewSet(ReferralAuditMixin, ModelViewSet):
    """
    POST /api/v1/referrals - create (public or help-seeker)
    GET /api/v1/referrals - list (role-filtered)
    PATCH /api/v1/referrals/{id} - update status/assigned (clinic admin)
    POST /api/v1/referrals/{id}/notes
    POST /api/v1/referrals/{id}/questionnaires
    """

    permission_classes = [ReferralPermission]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = (
            Referral.objects.select_related(
                "clinic", "requester_user", "assigned_therapist", "assigned_therapist__user"
            )
            .prefetch_related("notes", "questionnaires")
            .order_by("-created_at")
        )

        if not self.request.user.is_authenticated:
            return qs.none()

        if user_is_clinic_admin(self.request.user) or self.request.user.is_staff:
            pass
        elif user_is_therapist(self.request.user):
            qs = qs.filter(assigned_therapist__user=self.request.user)
        elif user_is_help_seeker(self.request.user):
            qs = qs.filter(requester_user=self.request.user)
        else:
            return qs.none()

        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return ReferralCreateSerializer
        if self.action in ("update", "partial_update"):
            return ReferralUpdateSerializer
        if self.action == "retrieve":
            return ReferralDetailSerializer
        return ReferralListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            ReferralDetailSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ReferralUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        maybe_create_patient_for_referral(instance)
        log_event(
            action="update",
            entity_type=ENTITY_REFERRAL,
            entity_id=instance.id,
            request=request,
            metadata={"fields": list(serializer.validated_data.keys())},
        )
        return Response(ReferralDetailSerializer(instance).data)

    @action(detail=True, methods=["post"], url_path="notes")
    def notes(self, request, pk=None):
        """POST /api/v1/referrals/{id}/notes"""
        referral = self.get_object()
        serializer = ReferralNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = ReferralNote.objects.create(
            referral=referral,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(
            ReferralNoteSerializer(note).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="questionnaires")
    def questionnaires(self, request, pk=None):
        """POST /api/v1/referrals/{id}/questionnaires"""
        referral = self.get_object()
        serializer = QuestionnaireCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        questionnaire = Questionnaire.objects.create(
            referral=referral,
            **serializer.validated_data,
        )
        return Response(
            QuestionnaireSerializer(questionnaire).data,
            status=status.HTTP_201_CREATED,
        )
