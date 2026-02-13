# Refactor AuditEvent: UUID pk, actor, entity_type, entity_id, metadata, ip, user_agent

import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_audit_events(apps, schema_editor):
    """Copy old AuditEvent to new schema with UUID ids."""
    OldEvent = apps.get_model("audit", "AuditEvent")
    NewEvent = apps.get_model("audit", "AuditEvent")
    # During migration, NewEvent is the model we're migrating TO.
    # We need to read from old table and write to new. But both point to same table after migration...
    # Actually no: we'll rename old table, create new, copy, drop old.
    # So we need to use the "current" model for reading. During the migration, the state has changed.
    # Let me use raw SQL or the model from the migration's dependency.
    # Actually the cleanest: use the ORM with the OLD model. The old model's table still exists as audit_auditevent
    # until we run the migration. So the flow:
    # 1. RenameModel AuditEvent -> AuditEventOld (table audit_auditevent -> audit_auditeventold)
    # 2. CreateModel AuditEvent (creates table audit_auditevent with new schema)
    # 3. RunPython: for each AuditEventOld, create AuditEvent
    # 4. DeleteModel AuditEventOld
    AuditEventOld = apps.get_model("audit", "AuditEventOld")
    for old in AuditEventOld.objects.all():
        NewEvent.objects.create(
            id=uuid.uuid4(),
            actor_id=old.user_id,
            action=old.action,
            entity_type=old.resource_type,
            entity_id=old.resource_id or "",
            metadata=old.details or {},
            ip=str(old.ip_address) if old.ip_address else "",
            user_agent="",
            created_at=old.created_at,
        )


def reverse_migrate(apps, schema_editor):
    pass  # No reverse


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.RenameModel(old_name="AuditEvent", new_name="AuditEventOld"),
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(db_index=True, max_length=32)),
                ("entity_type", models.CharField(db_index=True, max_length=100)),
                ("entity_id", models.CharField(blank=True, max_length=100)),
                ("metadata", models.JSONField(default=dict)),
                ("ip", models.CharField(blank=True, max_length=45)),
                ("user_agent", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(model_name="auditevent", index=models.Index(fields=["created_at"], name="audit_evt_created_idx")),
        migrations.AddIndex(model_name="auditevent", index=models.Index(fields=["actor"], name="audit_evt_actor_idx")),
        migrations.AddIndex(model_name="auditevent", index=models.Index(fields=["entity_type"], name="audit_evt_entity_idx")),
        migrations.RunPython(migrate_audit_events, reverse_migrate),
        migrations.DeleteModel(name="AuditEventOld"),
    ]
