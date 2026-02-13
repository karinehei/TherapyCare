"""
Development settings.
Overrides base for local development: DEBUG on, permissive CORS.
"""

from .base import *  # noqa: F401, F403

DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True
# When using nginx proxy (docker), allow requests from proxy origin
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
