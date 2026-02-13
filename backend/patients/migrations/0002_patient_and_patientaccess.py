# Create Patient and PatientAccess

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("clinics", "0001_initial"),
        ("directory", "0002_therapistprofile_search_location_availability"),
        ("patients", "0001_initial"),
        ("referrals", "0002_refactor_referral_add_note_questionnaire"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Patient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("phone", models.CharField(blank=True, max_length=50)),
                ("consent_flags", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("clinic", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="clinics.clinic")),
                ("owner_therapist", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="owned_patients", to="directory.therapistprofile")),
                ("referral", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="patient", to="referrals.referral")),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="PatientAccess",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("access_type", models.CharField(choices=[("therapist", "Therapist"), ("admin", "Admin"), ("support_readonly", "Support (Read Only)")], default="therapist", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="access_grants", to="patients.patient")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(model_name="patient", index=models.Index(fields=["clinic"], name="patients_pa_clinic__idx")),
        migrations.AddIndex(model_name="patient", index=models.Index(fields=["owner_therapist"], name="patients_pa_owner__idx")),
        migrations.AddIndex(model_name="patientaccess", index=models.Index(fields=["patient"], name="patients_pa_patient_idx")),
        migrations.AddIndex(model_name="patientaccess", index=models.Index(fields=["user"], name="patients_pa_user_idx")),
        migrations.AddConstraint(
            model_name="patientaccess",
            constraint=models.UniqueConstraint(fields=("patient", "user"), name="patients_access_patient_user_unique"),
        ),
    ]
