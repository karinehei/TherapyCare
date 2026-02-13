"""Clinic serializers."""
from rest_framework import serializers

from .models import Clinic, Membership


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = ["id", "name", "slug", "address", "phone", "created_at"]


class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ["id", "user", "clinic", "role", "created_at"]
