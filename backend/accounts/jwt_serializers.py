"""JWT serializers: use email for login (User.USERNAME_FIELD = email)."""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Obtain JWT using email + password. Our User uses email as USERNAME_FIELD."""

    username_field = "email"
