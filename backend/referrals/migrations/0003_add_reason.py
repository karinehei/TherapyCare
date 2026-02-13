from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("referrals", "0002_refactor_referral_add_note_questionnaire"),
    ]

    operations = [
        migrations.AddField(
            model_name="referral",
            name="reason",
            field=models.TextField(blank=True),
        ),
    ]
