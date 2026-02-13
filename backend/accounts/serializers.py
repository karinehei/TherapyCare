"""Account serializers."""
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """User serializer for /me and responses. Password write-only on create."""

    password = serializers.CharField(write_only=True, required=False)
    therapist_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "password", "role", "phone", "first_name", "last_name", "is_staff", "therapist_profile_id", "date_joined"]
        read_only_fields = ["id", "is_staff", "date_joined"]

    def get_therapist_profile_id(self, obj):
        try:
            return obj.therapist_profile.id
        except Exception:
            return None

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for registration. Requires email and password."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "role"]
        extra_kwargs = {"role": {"default": "help_seeker"}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
