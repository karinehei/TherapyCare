"""
Directory models: TherapistProfile, AvailabilitySlot, Location.
Full-text search on display_name + bio + specialties.
"""

from django.db import models

from accounts.models import User
from clinics.models import Clinic


class Location(models.Model):
    """
    Optional: lat/lng for future geo search (PostGIS).
    Therapists can have a location for in-person sessions.
    """

    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["lat", "lng"], name="directory_loc_lat_lng_idx"),
        ]


class TherapistProfile(models.Model):
    """
    Therapist profile in directory.
    display_name + bio + specialties used for full-text search.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="therapist_profile")
    display_name = models.CharField(max_length=200)
    bio = models.TextField(blank=True)
    languages = models.JSONField(default=list)  # e.g. ["English", "Spanish"]
    specialties = models.JSONField(default=list)  # e.g. ["Anxiety", "Depression"]
    price_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    remote_available = models.BooleanField(default=False)
    city = models.CharField(max_length=100, blank=True, db_index=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    clinic = models.ForeignKey(Clinic, on_delete=models.SET_NULL, null=True, blank=True)
    credentials = models.CharField(max_length=255, blank=True)  # legacy
    license_number = models.CharField(max_length=100, blank=True)  # legacy
    is_accepting = models.BooleanField(default=True)  # legacy
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_name"]
        indexes = [
            models.Index(fields=["city"], name="directory_th_city_idx"),
            models.Index(fields=["remote_available"], name="directory_th_remote_idx"),
            models.Index(fields=["price_min", "price_max"], name="directory_th_price_idx"),
        ]


class AvailabilitySlot(models.Model):
    """Therapist availability: weekday, start/end time, timezone."""

    therapist = models.ForeignKey(
        TherapistProfile, on_delete=models.CASCADE, related_name="availability_slots"
    )
    weekday = models.PositiveSmallIntegerField()  # 0=Monday, 6=Sunday
    start_time = models.TimeField()
    end_time = models.TimeField()
    timezone = models.CharField(max_length=50, default="UTC")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        indexes = [
            models.Index(fields=["therapist"], name="directory_av_th_idx"),
            models.Index(fields=["weekday"], name="directory_av_weekday_idx"),
        ]
