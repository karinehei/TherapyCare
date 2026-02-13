"""Patient permissions: role-filtered access."""

from rest_framework import permissions

from accounts.permissions import user_is_clinic_admin, user_is_help_seeker, user_is_therapist


def user_has_patient_access(user, patient):
    """True if user can view this patient."""
    if user_is_clinic_admin(user) or user.is_staff:
        return True
    if user_is_therapist(user):
        return (
            patient.owner_therapist.user_id == user.id
            or patient.access_grants.filter(user=user).exists()
        )
    if user_is_help_seeker(user):
        return patient.access_grants.filter(user=user).exists()
    return patient.access_grants.filter(user=user, access_type="support_readonly").exists()


class PatientPermission(permissions.BasePermission):
    """
    GET list: clinic admin (all), therapist (owned/assigned), help-seeker (access_grants)
    GET detail: same + object-level check
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return user_has_patient_access(request.user, obj)
