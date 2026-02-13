"""Admin for directory."""

from django.contrib import admin

from .models import AvailabilitySlot, Location, TherapistProfile


@admin.register(TherapistProfile)
class TherapistProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "clinic", "city", "remote_available", "created_at")
    list_filter = ("remote_available", "city", "clinic")
    search_fields = ("display_name", "user__email", "bio", "city")


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("therapist", "weekday", "start_time", "end_time", "timezone")
    list_filter = ("weekday", "timezone")
    search_fields = ("therapist__display_name",)


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("lat", "lng", "address")
    search_fields = ("address",)
