"""Appointment permissions: therapist, clinic admin, note masking."""

from rest_framework import permissions

from accounts.permissions import user_is_clinic_admin, user_is_support, user_is_therapist


def user_can_book_appointment(user):
    """Therapist or clinic admin can book."""
    return user.is_authenticated and (
        user_is_therapist(user) or user_is_clinic_admin(user) or user.is_staff
    )


def user_can_view_appointment(user, appointment):
    """Therapist (own), clinic admin (all), support (all, masked), patient (own)."""
    if user_is_clinic_admin(user) or user.is_staff:
        return True
    if user_is_support(user):
        return True
    if user_is_therapist(user):
        return appointment.therapist.user_id == user.id
    return False  # TODO: patient access via PatientAccess


def user_can_edit_session_note(user, appointment):
    """Only assigned therapist can create/edit session note."""
    return user_is_therapist(user) and appointment.therapist.user_id == user.id


class AppointmentPermission(permissions.BasePermission):
    """
    POST: therapist or clinic admin
    GET list: therapist (own), clinic admin (all)
    GET detail: same; sets _mask_session_note for clinic admin
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if view.action == "create":
            return user_can_book_appointment(request.user)
        if view.action in ("list", "retrieve"):
            return True
        if view.action in ("note",):
            return user_can_book_appointment(request.user)
        return False

    def has_object_permission(self, request, view, obj):
        if view.action in ("retrieve", "note"):
            return user_can_view_appointment(request.user, obj)
        return False
