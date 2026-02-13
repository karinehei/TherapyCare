"""
Test settings: SQLite for running tests without Postgres.
Use: DJANGO_SETTINGS_MODULE=config.settings.test pytest
"""

from .base import *  # noqa: F401, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
