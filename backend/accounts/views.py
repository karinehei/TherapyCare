"""Account views: register, login, logout, me."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView

from audit.service import log_event
from config.throttling import AuthEndpointThrottle

from .jwt_serializers import CustomTokenObtainPairSerializer
from .serializers import RegisterSerializer, UserSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthEndpointThrottle])
def register(request):
    """Register a new user. POST /api/v1/auth/register/"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """Current user profile. GET /api/v1/me/"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login with email + password. Returns access + refresh tokens. Audit logs on success."""

    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AuthEndpointThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            from accounts.models import User
            email = request.data.get("email") or request.data.get("username")
            if email:
                user = User.objects.filter(email=email).first()
                if user:
                    log_event(
                        action="login",
                        entity_type="user",
                        entity_id=str(user.id),
                        request=request,
                        actor=user,
                    )
        return response


class AuditedTokenBlacklistView(TokenBlacklistView):
    """Logout with audit logging."""

    def post(self, request, *args, **kwargs):
        user = None
        if request.user.is_authenticated:
            user = request.user
        else:
            # Decode refresh token to get user (logout doesn't require auth header)
            refresh = request.data.get("refresh")
            if refresh:
                try:
                    from rest_framework_simplejwt.tokens import RefreshToken
                    from django.conf import settings
                    token = RefreshToken(refresh)
                    claim = getattr(settings, "SIMPLE_JWT", {}).get("USER_ID_CLAIM", "user_id")
                    user_id = token.get(claim)
                    from accounts.models import User
                    user = User.objects.filter(id=user_id).first()
                except Exception:
                    pass
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK and user:
            log_event(
                action="logout",
                entity_type="user",
                entity_id=str(user.id),
                request=request,
                actor=user,
            )
        return response
