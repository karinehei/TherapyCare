"""Referral permissions: help-seeker, clinic admin, therapist."""
from rest_framework import permissions

from accounts.permissions import user_is_clinic_admin, user_is_help_seeker, user_is_therapist


def user_can_create_referral(user):
    """Help-seeker can create; also allow unauthenticated for public form."""
    return user.is_authenticated and user_is_help_seeker(user)


def user_can_list_referrals(user):
    """Clinic admin: all; therapist: assigned only; help-seeker: own."""
    return user.is_authenticated and (
        user_is_clinic_admin(user)
        or user_is_therapist(user)
        or user_is_help_seeker(user)
        or user.is_staff
    )


def user_can_update_referral(user):
    """Clinic admin can update status, assign therapist."""
    return user.is_authenticated and (user_is_clinic_admin(user) or user.is_staff)


def user_can_add_note(user):
    """Clinic admin, therapist (if assigned), or help-seeker (own)."""
    return user.is_authenticated


def user_can_add_questionnaire(user):
    """Clinic admin, therapist (if assigned), or help-seeker (own)."""
    return user.is_authenticated


class ReferralPermission(permissions.BasePermission):
    """
    - POST: help-seeker or unauthenticated (public form)
    - GET list: help-seeker, therapist, clinic admin (filtered by role)
    - GET detail: same as list (object-level)
    - PATCH: clinic admin only
    """

    def has_permission(self, request, view):
        if view.action == "create":
            return True  # Public or auth
        if view.action in ("list", "retrieve"):
            return request.user.is_authenticated and user_can_list_referrals(request.user)
        if view.action in ("update", "partial_update"):
            return user_can_update_referral(request.user)
        if view.action in ("notes", "questionnaires"):
            return user_can_add_note(request.user)
        return False

    def has_object_permission(self, request, view, obj):
        if view.action in ("retrieve", "notes", "questionnaires"):
            if user_is_clinic_admin(request.user) or request.user.is_staff:
                return True
            if user_is_therapist(request.user):
                return obj.assigned_therapist_id and obj.assigned_therapist.user_id == request.user.id
            if user_is_help_seeker(request.user):
                return obj.requester_user_id == request.user.id
            return False
        if view.action in ("update", "partial_update"):
            return user_can_update_referral(request.user)
        return False
