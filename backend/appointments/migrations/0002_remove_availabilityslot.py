# Move AvailabilitySlot from appointments to directory

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0002_therapistprofile_search_location_availability"),
        ("appointments", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(name="AvailabilitySlot"),
    ]
