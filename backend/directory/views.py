"""
Directory API: therapist search, detail, and PATCH /me.
GET /api/v1/therapists - search + filters (public or authenticated)
GET /api/v1/therapists/{id} - detail
PATCH /api/v1/therapists/me - therapist edits own profile
"""

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.viewsets import ReadOnlyModelViewSet

from accounts.permissions import user_is_therapist

from .models import TherapistProfile
from .search import search_therapists
from .serializers import (
    TherapistProfileDetailSerializer,
    TherapistProfileListSerializer,
    TherapistProfileUpdateSerializer,
)


class TherapistProfileViewSet(ReadOnlyModelViewSet):
    """
    List/search therapists (GET) and retrieve by id.
    Public read. Pagination and ordering enabled.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    ordering_fields = ["display_name", "price_min", "price_max", "created_at"]
    ordering = ["display_name"]
    serializer_class = TherapistProfileListSerializer

    def get_serializer_class(self):
        # DRF requires a serializer_class for list/retrieve actions.
        if self.action == "retrieve":
            return TherapistProfileDetailSerializer
        return TherapistProfileListSerializer

    def get_queryset_base(self, for_detail=False):
        """Base queryset. List: lightweight. Detail: full prefetch."""
        if for_detail:
            return (
                TherapistProfile.objects.select_related("user", "clinic", "location")
                .prefetch_related("availability_slots")
                .all()
            )
        return TherapistProfile.objects.select_related("user").all()

    def get_queryset(self):
        qs = self.get_queryset_base(for_detail=self.action == "retrieve")

        # Text query: full-text search on display_name, bio, specialties
        # When search is used, results are ordered by rank
        query = self.request.query_params.get("q", "").strip()
        used_search = bool(query)
        if query:
            qs = search_therapists(qs, query)

        # Filter: specialty (array contains). PostgreSQL: __contains; SQLite: __icontains on text
        from django.db import connection

        specialty = self.request.query_params.get("specialty", "").strip()
        if specialty:
            if connection.vendor == "postgresql":
                qs = qs.filter(specialties__contains=[specialty])
            else:
                qs = qs.filter(specialties__icontains=specialty)

        # Filter: language (array contains)
        language = self.request.query_params.get("language", "").strip()
        if language:
            if connection.vendor == "postgresql":
                qs = qs.filter(languages__contains=[language])
            else:
                qs = qs.filter(languages__icontains=language)

        # Filter: city (exact or icontains)
        city = self.request.query_params.get("city", "").strip()
        if city:
            qs = qs.filter(city__icontains=city)

        # Filter: remote
        remote = self.request.query_params.get("remote", "").lower()
        if remote in ("true", "1", "yes"):
            qs = qs.filter(remote_available=True)

        # Filter: price range
        price_min = self.request.query_params.get("price_min")
        price_max = self.request.query_params.get("price_max")
        if price_min is not None:
            try:
                price_min_val = float(price_min)
                qs = qs.filter(Q(price_max__isnull=True) | Q(price_max__gte=price_min_val))
            except (ValueError, TypeError):
                pass
        if price_max is not None:
            try:
                price_max_val = float(price_max)
                qs = qs.filter(Q(price_min__isnull=True) | Q(price_min__lte=price_max_val))
            except (ValueError, TypeError):
                pass

        # Ordering: ?ordering=display_name,-price_min (skip when search provides rank)
        if not used_search:
            ordering = self.request.query_params.get("ordering", "display_name")
            if ordering:
                qs = qs.order_by(*[o.strip() for o in ordering.split(",") if o.strip()])

        return qs

    @action(detail=False, methods=["patch"], url_path="me", permission_classes=[IsAuthenticated])
    def me(self, request):
        """PATCH /api/v1/therapists/me - therapist edits own profile."""
        if not user_is_therapist(request.user):
            return Response(
                {"detail": "Only therapists can edit their profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            profile = (
                TherapistProfile.objects.select_related("user", "clinic", "location")
                .prefetch_related("availability_slots")
                .get(user=request.user)
            )
        except TherapistProfile.DoesNotExist:
            return Response(
                {"detail": "Therapist profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TherapistProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TherapistProfileDetailSerializer(profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
