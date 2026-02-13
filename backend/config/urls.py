"""URL configuration for TherapyCare. API v1 under /api/v1/."""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/me/", include("accounts.me_urls")),
    path("api/v1/clinics/", include("clinics.urls")),
    path("api/v1/", include("directory.urls")),
    path("api/v1/", include("referrals.urls")),
    path("api/v1/", include("patients.urls")),
    path("api/v1/", include("appointments.urls")),
    path("api/v1/audit/", include("audit.urls")),
]
