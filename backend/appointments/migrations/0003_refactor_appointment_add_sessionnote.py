# Refactor Appointment: Patient FK, starts_at/ends_at, new status
# Add SessionNote

from django.db import migrations, models
import django.db.models.deletion


def migrate_appointments_to_patient(apps, schema_editor):
    """Create Patient from PatientProfile for each Appointment, then update FK."""
    Appointment = apps.get_model("appointments", "Appointment")
    Patient = apps.get_model("patients", "Patient")
    Clinic = apps.get_model("clinics", "Clinic")

    clinic = Clinic.objects.first()
    for appt in Appointment.objects.select_related("patient", "therapist"):
        old_patient = appt.patient  # PatientProfile
        therapist = appt.therapist
        c = therapist.clinic if therapist.clinic_id else clinic
        if not c:
            c = Clinic.objects.first()
        if not c:
            continue
        user = old_patient.user
        patient, _ = Patient.objects.get_or_create(
            clinic=c,
            owner_therapist=therapist,
            name=f"{user.first_name} {user.last_name}".strip() or user.email,
            email=user.email,
            defaults={"consent_flags": {}},
        )
        appt.patient_new = patient
        appt.save(update_fields=["patient_new"])


def reverse_migrate(apps, schema_editor):
    pass  # No reverse


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0002_therapistprofile_search_location_availability"),
        ("patients", "0002_patient_and_patientaccess"),
        ("appointments", "0002_remove_availabilityslot"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="patient_new",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="appointments_new",
                to="patients.patient",
            ),
        ),
        migrations.RunPython(migrate_appointments_to_patient, reverse_migrate),
        migrations.RemoveField(model_name="appointment", name="patient"),
        migrations.RemoveField(model_name="appointment", name="notes"),
        migrations.RenameField(model_name="appointment", old_name="patient_new", new_name="patient"),
        migrations.RemoveIndex(model_name="appointment", name="appointment_appt_start_idx"),
        migrations.RenameField(model_name="appointment", old_name="start_at", new_name="starts_at"),
        migrations.RenameField(model_name="appointment", old_name="end_at", new_name="ends_at"),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(fields=["starts_at"], name="appointment_appt_start_idx"),
        ),
        migrations.AlterField(
            model_name="appointment",
            name="status",
            field=models.CharField(
                choices=[
                    ("booked", "Booked"),
                    ("cancelled", "Cancelled"),
                    ("completed", "Completed"),
                ],
                default="booked",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="SessionNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("appointment", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="session_note", to="appointments.appointment")),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="directory.therapistprofile")),
            ],
        ),
    ]
