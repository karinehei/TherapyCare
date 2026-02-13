"""Account tests: register, login, logout, me."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestRegister:
    """POST /api/v1/auth/register/"""

    def test_register_creates_user(self):
        client = APIClient()
        resp = client.post(
            "/api/v1/auth/register/",
            {"email": "test@example.com", "password": "testpass123", "first_name": "Test"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="test@example.com").exists()
        user = User.objects.get(email="test@example.com")
        assert user.role == "help_seeker"
        assert "password" not in resp.data

    def test_register_duplicate_email_fails(self):
        User.objects.create_user(email="exists@example.com", password="x")
        client = APIClient()
        resp = client.post(
            "/api/v1/auth/register/",
            {"email": "exists@example.com", "password": "newpass123"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    """POST /api/v1/auth/login/ (JWT)"""

    def test_login_returns_tokens(self):
        User.objects.create_user(email="login@example.com", password="secret123")
        client = APIClient()
        # SimpleJWT uses USERNAME_FIELD (email) for auth
        resp = client.post(
            "/api/v1/auth/login/",
            {"email": "login@example.com", "password": "secret123"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_wrong_password_fails(self):
        User.objects.create_user(email="x@example.com", password="correct")
        client = APIClient()
        resp = client.post(
            "/api/v1/auth/login/",
            {"email": "x@example.com", "password": "wrong"},
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMe:
    """GET /api/v1/me/"""

    def test_me_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/v1/me/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_user(self):
        user = User.objects.create_user(email="me@example.com", password="x", first_name="Me")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/v1/me/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == "me@example.com"
        assert resp.data["first_name"] == "Me"
