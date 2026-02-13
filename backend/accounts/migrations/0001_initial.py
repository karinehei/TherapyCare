# Generated manually for custom User with email as username

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, verbose_name="superuser status")),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("role", models.CharField(choices=[("help_seeker", "Help Seeker"), ("therapist", "Therapist"), ("clinic_admin", "Clinic Admin"), ("support", "Support")], db_index=True, default="help_seeker", max_length=32)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("date_joined", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("groups", models.ManyToManyField(blank=True, related_name="user_set", to="auth.group")),
                ("user_permissions", models.ManyToManyField(blank=True, related_name="user_set", to="auth.permission")),
            ],
            options={"abstract": False},
        ),
        migrations.AddIndex(model_name="user", index=models.Index(fields=["email"], name="accounts_us_email_idx")),
        migrations.AddIndex(model_name="user", index=models.Index(fields=["role"], name="accounts_us_role_idx")),
    ]
