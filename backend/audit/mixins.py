"""DRF mixin for audit logging on Patient, Appointment, Referral, SessionNote."""

from .service import (
    ENTITY_APPOINTMENT,
    ENTITY_PATIENT,
    ENTITY_REFERRAL,
    ENTITY_SESSION_NOTE,
    log_event,
)


class AuditLogMixin:
    """Mixin to log read/write access. Override _audit_entity_type and _audit_entity_id."""

    _audit_entity_type = None
    _audit_entity_id_attr = "id"

    def _get_entity_id(self, obj):
        return getattr(obj, self._audit_entity_id_attr, None)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_event(
            action="create",
            entity_type=self._audit_entity_type,
            entity_id=self._get_entity_id(instance),
            request=self.request,
            metadata={"fields": list(serializer.validated_data.keys())},
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_event(
            action="update",
            entity_type=self._audit_entity_type,
            entity_id=self._get_entity_id(instance),
            request=self.request,
            metadata={"fields": list(serializer.validated_data.keys())},
        )

    def perform_destroy(self, instance):
        eid = self._get_entity_id(instance)
        log_event(
            action="delete",
            entity_type=self._audit_entity_type,
            entity_id=eid,
            request=self.request,
        )
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        instance = self.get_object()
        log_event(
            action="view",
            entity_type=self._audit_entity_type,
            entity_id=self._get_entity_id(instance),
            request=request,
        )
        return response


class PatientAuditMixin(AuditLogMixin):
    _audit_entity_type = ENTITY_PATIENT


class AppointmentAuditMixin(AuditLogMixin):
    _audit_entity_type = ENTITY_APPOINTMENT


class ReferralAuditMixin(AuditLogMixin):
    _audit_entity_type = ENTITY_REFERRAL


class SessionNoteAuditMixin(AuditLogMixin):
    _audit_entity_type = ENTITY_SESSION_NOTE
