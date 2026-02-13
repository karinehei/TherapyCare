"""Directory URLs: /api/v1/therapists."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TherapistProfileViewSet

router = DefaultRouter()
router.register("therapists", TherapistProfileViewSet, basename="therapist")

urlpatterns = [path("", include(router.urls))]
