"""Audit views. Support role only. Filters: actor, date range, entity_type."""

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets
from rest_framework.permissions import BasePermission

from accounts.permissions import user_is_support

from .models import AuditEvent
from .serializers import AuditEventSerializer


class IsSupportOnly(BasePermission):
    """Only support role can access audit logs."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            user_is_support(request.user) or request.user.is_staff
        )


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/audit/events - support-only. Filters: actor, date range, entity_type."""

    permission_classes = [IsSupportOnly]
    serializer_class = AuditEventSerializer

    def get_queryset(self):
        qs = AuditEvent.objects.select_related("actor").order_by("-created_at")

        actor = self.request.query_params.get("actor")
        if actor:
            qs = qs.filter(actor_id=actor)

        entity_type = self.request.query_params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            dt = parse_datetime(date_from)
            if dt and timezone.is_naive(dt):
                dt = timezone.make_aware(dt)
            if dt:
                qs = qs.filter(created_at__gte=dt)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            dt = parse_datetime(date_to)
            if dt and timezone.is_naive(dt):
                dt = timezone.make_aware(dt)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        return qs
