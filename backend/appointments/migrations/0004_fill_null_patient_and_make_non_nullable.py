# Fill null patient on appointments, then make field non-nullable

from django.db import migrations, models
import django.db.models.deletion


def fill_null_patients(apps, schema_editor):
    """Assign first available Patient to any Appointment with null patient."""
    Appointment = apps.get_model("appointments", "Appointment")
    Patient = apps.get_model("patients", "Patient")

    null_appointments = Appointment.objects.filter(patient__isnull=True).select_related("therapist")
    if not null_appointments.exists():
        return

    # Use first patient in DB as fallback for orphaned appointments
    default_patient = Patient.objects.first()
    if not default_patient:
        return

    for appt in null_appointments:
        # Prefer a patient owned by the same therapist
        therapist_patient = Patient.objects.filter(owner_therapist=appt.therapist).first()
        appt.patient = therapist_patient or default_patient
        appt.save(update_fields=["patient"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0003_refactor_appointment_add_sessionnote"),
    ]

    operations = [
        migrations.RunPython(fill_null_patients, noop_reverse),
        migrations.AlterField(
            model_name="appointment",
            name="patient",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="appointments",
                to="patients.patient",
            ),
        ),
    ]
