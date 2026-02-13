"""Appointment views: booking, calendar list, session note."""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.permissions import user_is_clinic_admin, user_is_support, user_is_therapist
from audit.mixins import AppointmentAuditMixin
from audit.service import ENTITY_APPOINTMENT, ENTITY_SESSION_NOTE, log_event

from .models import Appointment, SessionNote
from .permissions import AppointmentPermission
from .serializers import (
    AppointmentCreateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    SessionNoteCreateSerializer,
    SessionNoteSerializer,
)


class AppointmentViewSet(AppointmentAuditMixin, ModelViewSet):
    """
    POST /api/v1/appointments - booking
    GET /api/v1/appointments - calendar list (role-filtered)
    GET /api/v1/appointments/{id} - detail (session note body masked for clinic admin)
    POST /api/v1/appointments/{id}/note - create session note (therapist only)
    PATCH /api/v1/appointments/{id}/note - update session note (therapist only)
    """

    permission_classes = [AppointmentPermission]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = (
            Appointment.objects.select_related("patient", "therapist", "therapist__user")
            .prefetch_related("session_note")
            .order_by("starts_at")
        )
        if user_is_clinic_admin(self.request.user) or self.request.user.is_staff:
            return qs
        if user_is_support(self.request.user):
            return qs
        if user_is_therapist(self.request.user):
            return qs.filter(therapist__user=self.request.user)
        return qs.none()

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action == "retrieve":
            return AppointmentDetailSerializer
        return AppointmentListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            AppointmentDetailSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Audit log (mixin would run after super; we call explicitly to run after get_object)
        log_event(
            action="view", entity_type=ENTITY_APPOINTMENT, entity_id=instance.id, request=request
        )
        # Mask session note body for clinic admin/support (not assigned therapist)
        is_support = user_is_support(request.user)
        is_admin = user_is_clinic_admin(request.user)
        is_therapist = user_is_therapist(request.user)
        is_assigned_therapist = instance.therapist.user_id == request.user.id
        if is_support or (is_admin and (not is_therapist or not is_assigned_therapist)):
            request._mask_session_note = True
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post", "patch"], url_path="note")
    def note(self, request, pk=None):
        """POST or PATCH /api/v1/appointments/{id}/note - only assigned therapist."""
        # Important: therapists are scoped to their own appointments in get_queryset().
        # For the note endpoint we intentionally return 403 (not 404) when a therapist
        # targets an appointment they don't own (permission bypass test expectation).
        appointment = Appointment.objects.select_related("therapist", "therapist__user").filter(pk=pk).first()
        if not appointment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if appointment.therapist.user_id != request.user.id:
            return Response(
                {"detail": "Only the assigned therapist can create or edit session notes."},
                status=status.HTTP_403_FORBIDDEN,
            )
        note = getattr(appointment, "session_note", None)
        if request.method == "POST":
            if note:
                return Response(
                    {"detail": "Session note already exists. Use PATCH to update."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = SessionNoteCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            note = SessionNote.objects.create(
                appointment=appointment,
                author=appointment.therapist,
                body=serializer.validated_data["body"],
            )
            log_event(
                action="create",
                entity_type=ENTITY_SESSION_NOTE,
                entity_id=note.id,
                request=request,
                metadata={"appointment_id": appointment.id},
            )
            return Response(SessionNoteSerializer(note).data, status=status.HTTP_201_CREATED)
        if request.method == "PATCH":
            if not note:
                return Response(
                    {"detail": "No session note. Use POST to create."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = SessionNoteCreateSerializer(note, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            if "body" in serializer.validated_data:
                note.body = serializer.validated_data["body"]
                note.save()
            log_event(
                action="update",
                entity_type=ENTITY_SESSION_NOTE,
                entity_id=note.id,
                request=request,
                metadata={"appointment_id": appointment.id},
            )
            return Response(SessionNoteSerializer(note).data)
