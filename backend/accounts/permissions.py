"""
Object-level permission helpers.
- Therapist: only their assigned patients and appointments
- Clinic admin: full access to clinic resources
- Support: read audit logs (sensitive fields masked)
"""

from rest_framework import permissions


def user_is_therapist(user):
    """True if user has role THERAPIST."""
    return user.role == "therapist"


def user_is_help_seeker(user):
    """True if user has role HELP_SEEKER."""
    return user.role == "help_seeker"


def user_is_clinic_admin(user):
    """True if user has role CLINIC_ADMIN."""
    return user.role == "clinic_admin"


def user_is_support(user):
    """True if user has role SUPPORT."""
    return user.role == "support"


def user_is_clinic_admin_of(user, clinic):
    """True if user is a clinic admin (membership role) for the given clinic."""
    from clinics.models import Membership

    return Membership.objects.filter(
        user=user, clinic=clinic, role=Membership.MemberRole.ADMIN
    ).exists()


def user_is_therapist_of(user, clinic):
    """True if user is a therapist (membership) for the given clinic."""
    from clinics.models import Membership

    return Membership.objects.filter(
        user=user, clinic=clinic, role=Membership.MemberRole.THERAPIST
    ).exists()


class IsClinicAdmin(permissions.BasePermission):
    """
    Allows access only to users with role CLINIC_ADMIN or admin membership.
    Use for clinic CRUD.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            user_is_clinic_admin(request.user) or request.user.is_staff
        )


class IsClinicAdminOrReadOnly(permissions.BasePermission):
    """Read for any authenticated user; write for clinic admins only."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user_is_clinic_admin(request.user) or request.user.is_staff


class TherapistAccessOwnPatients(permissions.BasePermission):
    """
    Therapist can access only their assigned patients.
    Override in views: filter queryset by therapist's assignments.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if user_is_clinic_admin(request.user) or request.user.is_staff:
            return True
        if user_is_therapist(request.user):
            # Subclasses must implement: does obj belong to this therapist?
            return getattr(view, "check_therapist_owns_object", lambda r, o: False)(request, obj)
        return False


class TherapistAccessOwnAppointments(permissions.BasePermission):
    """
    Therapist can access only their appointments.
    Override in views: filter queryset by therapist.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if user_is_clinic_admin(request.user) or request.user.is_staff:
            return True
        if user_is_therapist(request.user):
            therapist_field = getattr(view, "therapist_field", "therapist")
            therapist = getattr(obj, therapist_field, None)
            return therapist and therapist.user_id == request.user.id
        return False


class SupportCanReadAudit(permissions.BasePermission):
    """
    Support role can read audit logs but not modify.
    Use masking in serializers for sensitive fields (e.g. note bodies).
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method not in permissions.SAFE_METHODS:
            return False
        return (
            user_is_support(request.user)
            or user_is_clinic_admin(request.user)
            or request.user.is_staff
        )
