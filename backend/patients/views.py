"""Patient views: GET list (role-filtered), GET detail."""
from rest_framework.viewsets import ReadOnlyModelViewSet

from accounts.permissions import user_is_clinic_admin, user_is_therapist
from audit.mixins import PatientAuditMixin

from .models import Patient
from .permissions import PatientPermission
from .serializers import PatientDetailSerializer, PatientListSerializer


class PatientViewSet(PatientAuditMixin, ReadOnlyModelViewSet):
    """
    GET /api/v1/patients - list (role-filtered)
    GET /api/v1/patients/{id} - detail
    """

    permission_classes = [PatientPermission]

    def get_queryset(self):
        qs = (
            Patient.objects.select_related("clinic", "owner_therapist", "referral")
            .prefetch_related("appointments", "appointments__therapist", "referral__notes", "referral__questionnaires")
            .order_by("name")
        )
        if user_is_clinic_admin(self.request.user) or self.request.user.is_staff:
            return qs
        if user_is_therapist(self.request.user):
            return (
                qs.filter(owner_therapist__user=self.request.user)
                | qs.filter(access_grants__user=self.request.user)
            ).distinct()
        return qs.filter(access_grants__user=self.request.user).distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PatientDetailSerializer
        return PatientListSerializer
