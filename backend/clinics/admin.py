"""Admin for clinics."""
from django.contrib import admin
from .models import Clinic, Membership


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "phone", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "slug", "address")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "clinic", "role", "created_at")
    list_filter = ("clinic", "role")
    search_fields = ("user__email", "clinic__name")
