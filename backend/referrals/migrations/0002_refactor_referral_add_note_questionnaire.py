# Refactor Referral: new statuses, requester_user, patient_email
# Add ReferralNote, Questionnaire

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_statuses(apps, schema_editor):
    """Map old statuses to new enum."""
    Referral = apps.get_model("referrals", "Referral")
    mapping = {
        "screening": "needs_info",
        "matched": "approved",
        "completed": "ongoing",
    }
    for old, new in mapping.items():
        Referral.objects.filter(status=old).update(status=new)


def migrate_statuses_reverse(apps, schema_editor):
    """Reverse: map new back to old."""
    Referral = apps.get_model("referrals", "Referral")
    mapping = {
        "needs_info": "screening",
        "approved": "matched",
        "ongoing": "completed",
    }
    for new, old in mapping.items():
        Referral.objects.filter(status=new).update(status=old)


class Migration(migrations.Migration):

    dependencies = [
        ("clinics", "0001_initial"),
        ("directory", "0002_therapistprofile_search_location_availability"),
        ("referrals", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="referral",
            name="requester_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="referrals_requested",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="referral",
            name="patient_email",
            field=models.EmailField(blank=True, default="", max_length=254),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name="referral",
            name="clinic",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="clinics.clinic",
            ),
        ),
        migrations.RenameField(
            model_name="referral",
            old_name="matched_therapist",
            new_name="assigned_therapist",
        ),
        migrations.RemoveField(model_name="referral", name="assigned_to"),
        migrations.RemoveField(model_name="referral", name="notes"),
        migrations.RemoveField(model_name="referral", name="patient_contact"),
        migrations.RemoveField(model_name="referral", name="referring_party"),
        migrations.RunPython(migrate_statuses, migrate_statuses_reverse),
        migrations.AlterField(
            model_name="referral",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "New"),
                    ("needs_info", "Needs Info"),
                    ("approved", "Approved"),
                    ("scheduled", "Scheduled"),
                    ("ongoing", "Ongoing"),
                    ("closed", "Closed"),
                    ("rejected", "Rejected"),
                ],
                db_index=True,
                default="new",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="ReferralNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ("referral", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notes", to="referrals.referral")),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="Questionnaire",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(choices=[("phq9", "PHQ-9"), ("gad7", "GAD-7")], max_length=20)),
                ("answers", models.JSONField(default=dict)),
                ("score", models.IntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("referral", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="questionnaires", to="referrals.referral")),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddIndex(
            model_name="questionnaire",
            index=models.Index(fields=["referral"], name="referrals_qu_referra_idx"),
        ),
        migrations.AddIndex(
            model_name="referral",
            index=models.Index(fields=["assigned_therapist"], name="referrals_re_assigned_idx"),
        ),
    ]
