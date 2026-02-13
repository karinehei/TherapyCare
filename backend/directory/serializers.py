"""Directory serializers with validation."""
from decimal import Decimal

from rest_framework import serializers

from .models import AvailabilitySlot, Location, TherapistProfile


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "lat", "lng", "address"]


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ["id", "weekday", "start_time", "end_time", "timezone"]

    def validate(self, data):
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError("end_time must be after start_time")
        if not (0 <= data["weekday"] <= 6):
            raise serializers.ValidationError("weekday must be 0-6 (Mon-Sun)")
        return data


class TherapistProfileListSerializer(serializers.ModelSerializer):
    """List/read serializer: public fields for search results."""

    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TherapistProfile
        fields = [
            "id",
            "user",
            "user_email",
            "display_name",
            "bio",
            "languages",
            "specialties",
            "price_min",
            "price_max",
            "remote_available",
            "city",
            "created_at",
        ]


class TherapistProfileDetailSerializer(TherapistProfileListSerializer):
    """Detail serializer: includes availability slots."""

    availability_slots = AvailabilitySlotSerializer(many=True, read_only=True)
    location = LocationSerializer(read_only=True)

    class Meta(TherapistProfileListSerializer.Meta):
        fields = TherapistProfileListSerializer.Meta.fields + [
            "availability_slots",
            "location",
            "clinic",
            "updated_at",
        ]


class TherapistProfileUpdateSerializer(serializers.ModelSerializer):
    """PATCH /me: therapist edits own profile. Validates business rules."""

    class Meta:
        model = TherapistProfile
        fields = [
            "display_name",
            "bio",
            "languages",
            "specialties",
            "price_min",
            "price_max",
            "remote_available",
            "city",
        ]

    def validate_display_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("display_name cannot be empty")
        if len(value) > 200:
            raise serializers.ValidationError("display_name too long")
        return value.strip()

    def validate_price_min(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("price_min cannot be negative")
        return value

    def validate_price_max(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("price_max cannot be negative")
        return value

    def validate(self, data):
        price_min = data.get("price_min")
        price_max = data.get("price_max")
        if price_min is not None and price_max is not None:
            if price_min > price_max:
                raise serializers.ValidationError("price_min cannot exceed price_max")
        if "languages" in data and not isinstance(data["languages"], list):
            raise serializers.ValidationError("languages must be a list")
        if "specialties" in data and not isinstance(data["specialties"], list):
            raise serializers.ValidationError("specialties must be a list")
        return data
