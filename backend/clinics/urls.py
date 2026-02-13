"""Clinic URLs."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClinicViewSet, MembershipViewSet

router = DefaultRouter()
router.register("", ClinicViewSet, basename="clinic")
router.register("memberships", MembershipViewSet, basename="membership")

urlpatterns = [path("", include(router.urls))]
