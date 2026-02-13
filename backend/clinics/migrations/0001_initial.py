# Generated manually for Clinic and Membership (therapist/admin roles)

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Clinic",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("address", models.TextField(blank=True)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="Membership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("therapist", "Therapist"), ("admin", "Admin")], default="therapist", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("clinic", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="clinics.clinic")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(model_name="clinic", index=models.Index(fields=["slug"], name="clinics_cli_slug_idx")),
        migrations.AddConstraint(
            model_name="membership",
            constraint=models.UniqueConstraint(fields=("user", "clinic"), name="clinics_membership_user_clinic_unique"),
        ),
        migrations.AddIndex(model_name="membership", index=models.Index(fields=["clinic"], name="clinics_mem_clinic_idx")),
        migrations.AddIndex(model_name="membership", index=models.Index(fields=["user"], name="clinics_mem_user_idx")),
    ]
