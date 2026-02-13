# Migration: Add display_name, languages, price_min/max, remote_available, city
# Add Location, AvailabilitySlot. Keep clinic for backward compat.

from django.db import migrations, models
import django.db.models.deletion


def set_display_name_from_user(apps, schema_editor):
    """Backfill display_name from user first_name + last_name."""
    TherapistProfile = apps.get_model("directory", "TherapistProfile")
    for p in TherapistProfile.objects.select_related("user"):
        name = f"{p.user.first_name} {p.user.last_name}".strip() or p.user.email
        p.display_name = name
        p.save(update_fields=["display_name"])


class Migration(migrations.Migration):

    dependencies = [
        ("clinics", "0001_initial"),
        ("directory", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Location",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("lat", models.DecimalField(decimal_places=6, max_digits=9)),
                ("lng", models.DecimalField(decimal_places=6, max_digits=9)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="display_name",
            field=models.CharField(default="", max_length=200),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="languages",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="price_min",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="price_max",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="remote_available",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="city",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
        migrations.AddField(
            model_name="therapistprofile",
            name="location",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="directory.location"),
        ),
        migrations.RunPython(set_display_name_from_user, migrations.RunPython.noop),
        migrations.CreateModel(
            name="AvailabilitySlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("weekday", models.PositiveSmallIntegerField()),
                ("start_time", models.TimeField()),
                ("end_time", models.TimeField()),
                ("timezone", models.CharField(default="UTC", max_length=50)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("therapist", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="availability_slots", to="directory.therapistprofile")),
            ],
        ),
        migrations.AddIndex(model_name="location", index=models.Index(fields=["lat", "lng"], name="directory_loc_lat_lng_idx")),
        migrations.AddIndex(model_name="therapistprofile", index=models.Index(fields=["city"], name="directory_th_city_idx")),
        migrations.AddIndex(model_name="therapistprofile", index=models.Index(fields=["remote_available"], name="directory_th_remote_idx")),
        migrations.AddIndex(model_name="therapistprofile", index=models.Index(fields=["price_min", "price_max"], name="directory_th_price_idx")),
        migrations.AddIndex(model_name="availabilityslot", index=models.Index(fields=["therapist"], name="directory_av_th_idx")),
        migrations.AddIndex(model_name="availabilityslot", index=models.Index(fields=["weekday"], name="directory_av_weekday_idx")),
    ]
