# GIN indexes for JSONField containment queries (?specialty=, ?language=)
# PostgreSQL only; no-op on SQLite (e.g. tests)

from django.db import connection, migrations


def add_gin_indexes(apps, schema_editor):
    if connection.vendor != "postgresql":
        return
    schema_editor.execute(
        "CREATE INDEX directory_th_specialties_gin ON directory_therapistprofile USING GIN (specialties);"
    )
    schema_editor.execute(
        "CREATE INDEX directory_th_languages_gin ON directory_therapistprofile USING GIN (languages);"
    )


def remove_gin_indexes(apps, schema_editor):
    if connection.vendor != "postgresql":
        return
    schema_editor.execute("DROP INDEX IF EXISTS directory_th_specialties_gin;")
    schema_editor.execute("DROP INDEX IF EXISTS directory_th_languages_gin;")


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0002_therapistprofile_search_location_availability"),
    ]

    operations = [
        migrations.RunPython(add_gin_indexes, remove_gin_indexes),
    ]
