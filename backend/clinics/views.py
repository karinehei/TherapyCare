"""Clinic views. CRUD limited to clinic admins."""

from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from accounts.permissions import IsClinicAdmin

from .models import Clinic, Membership
from .serializers import ClinicSerializer, MembershipSerializer


class ClinicViewSet(viewsets.ModelViewSet):
    """Clinic CRUD. List for any; create/update/delete for clinic admin only."""

    queryset = Clinic.objects.all()
    serializer_class = ClinicSerializer
    lookup_field = "slug"
    throttle_classes = [AnonRateThrottle]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsClinicAdmin()]


class MembershipViewSet(viewsets.ModelViewSet):
    """Clinic membership CRUD. Only clinic admins."""

    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [IsClinicAdmin]
