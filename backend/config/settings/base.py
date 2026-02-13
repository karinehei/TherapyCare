"""
Base Django settings for TherapyCare.
All config via env vars (12-factor). Use dev.py or prod.py for environment overrides.
"""

from datetime import timedelta
from pathlib import Path

import environ

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "django-insecure-dev-change-in-production"),
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env from project root (backend/.env)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "backend"])

INSTALLED_APPS = [
    "django_daisy",
    "django.contrib.admin",
    "django.contrib.humanize",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "accounts",
    "clinics",
    "directory",
    "referrals",
    "patients",
    "appointments",
    "audit",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.SecurityHeadersMiddleware",
]

# django-daisy: modals instead of popups
X_FRAME_OPTIONS = "SAMEORIGIN"

# Django Daisy: responsive admin with DaisyUI + TailwindCSS
DAISY_SETTINGS = {
    "SITE_TITLE": "TherapyCare",
    "SITE_HEADER": "TherapyCare Admin",
    "INDEX_TITLE": "Welcome to TherapyCare Administration",
    "DEFAULT_THEME": "corporate",
    "SHOW_THEME_SELECTOR": True,
    "APPS_REORDER": {
        "auth": {
            "icon": "fa-solid fa-key",
            "name": "Authentication",
            "divider_title": "System",
        },
        "accounts": {
            "icon": "fa-solid fa-users",
            "name": "Accounts",
            "divider_title": "TherapyCare",
        },
        "clinics": {
            "icon": "fa-solid fa-building",
            "name": "Clinics",
        },
        "directory": {
            "icon": "fa-solid fa-address-book",
            "name": "Directory",
        },
        "referrals": {
            "icon": "fa-solid fa-paper-plane",
            "name": "Referrals",
        },
        "patients": {
            "icon": "fa-solid fa-user-doctor",
            "name": "Patients",
        },
        "appointments": {
            "icon": "fa-solid fa-calendar-check",
            "name": "Appointments",
        },
        "audit": {
            "icon": "fa-solid fa-clipboard-list",
            "name": "Audit",
            "divider_title": "System",
        },
    },
}

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# PostgreSQL: all config via env vars
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="therapycare"),
        "USER": env("POSTGRES_USER", default="therapycare"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="therapycare"),
        "HOST": env("POSTGRES_HOST", default="localhost"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
FIXTURE_DIRS = [BASE_DIR / "config" / "fixtures"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

# DRF: JWT auth, schema via drf-spectacular
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/minute",
        "public": "60/minute",
        "auth": "20/minute",
    },
}

# drf-spectacular OpenAPI schema
SPECTACULAR_SETTINGS = {
    "TITLE": "TherapyCare API",
    "DESCRIPTION": "TherapyCare REST API",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# CORS: frontend dev origin (localhost:5173 for Vite)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://localhost:3000"],
)

# SimpleJWT: token lifetimes, blacklist for logout
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
