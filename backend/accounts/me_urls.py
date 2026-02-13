"""URLs for /api/v1/me/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.me),
]
