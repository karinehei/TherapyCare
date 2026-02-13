"""Seed demo data: 1 clinic, 2 therapists, 1 admin, 2 help-seekers, 10 therapist profiles, referrals, appointments."""
from datetime import time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from clinics.models import Clinic, Membership
from directory.models import AvailabilitySlot, TherapistProfile
from patients.models import Patient, PatientAccess, PatientAccessType
from referrals.models import Referral, ReferralStatus
from referrals.patient_creation import maybe_create_patient_for_referral
from appointments.models import Appointment, SessionNote


DEMO_CLINIC = {
    "name": "Downtown Wellness Clinic",
    "slug": "downtown-wellness",
    "address": "123 Main St, San Francisco, CA",
    "phone": "555-0100",
}

THERAPIST_SPECS = [
    {"display_name": "Dr. Sarah Chen", "city": "San Francisco", "specialties": ["Anxiety", "Depression", "CBT"], "languages": ["English", "Mandarin"]},
    {"display_name": "Dr. Marcus Johnson", "city": "Oakland", "specialties": ["PTSD", "Trauma", "EMDR"], "languages": ["English", "Spanish"]},
    {"display_name": "Dr. Emily Rodriguez", "city": "San Jose", "specialties": ["Family Therapy", "Couples", "Adolescents"], "languages": ["English", "Spanish"]},
    {"display_name": "Dr. James Wilson", "city": "San Francisco", "specialties": ["Addiction", "Substance Use", "CBT"], "languages": ["English"]},
    {"display_name": "Dr. Aisha Patel", "city": "Berkeley", "specialties": ["Anxiety", "OCD", "DBT"], "languages": ["English", "Hindi"]},
    {"display_name": "Dr. David Kim", "city": "San Francisco", "specialties": ["Depression", "Bipolar", "Medication Management"], "languages": ["English", "Korean"]},
    {"display_name": "Dr. Lisa Nguyen", "city": "San Jose", "specialties": ["Cultural Issues", "Immigration", "Anxiety"], "languages": ["English", "Vietnamese"]},
    {"display_name": "Dr. Robert Martinez", "city": "Oakland", "specialties": ["Men's Issues", "Anger", "Career"], "languages": ["English", "Spanish"]},
    {"display_name": "Dr. Jennifer Taylor", "city": "San Francisco", "specialties": ["Eating Disorders", "Body Image", "DBT"], "languages": ["English"]},
    {"display_name": "Dr. Michael O'Brien", "city": "Berkeley", "specialties": ["LGBTQ+", "Identity", "Anxiety"], "languages": ["English", "Irish"]},
]

DEMO_USERS = [
    # clinic_admin
    {"email": "admin@therapycare.demo", "password": "demo123", "role": "clinic_admin", "first_name": "Clinic", "last_name": "Admin"},
    # help_seekers
    {"email": "alice@therapycare.demo", "password": "demo123", "role": "help_seeker", "first_name": "Alice", "last_name": "Smith"},
    {"email": "bob@therapycare.demo", "password": "demo123", "role": "help_seeker", "first_name": "Bob", "last_name": "Jones"},
    # support (for audit demo)
    {"email": "support@therapycare.demo", "password": "demo123", "role": "support", "first_name": "Support", "last_name": "User"},
]


class Command(BaseCommand):
    help = "Seed demo data: 1 clinic, 2 therapists, 1 admin, 2 help-seekers, 10 therapist profiles, referrals, appointments"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recreate demo data even if some exists",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        with transaction.atomic():
            clinic = self._ensure_clinic(force)
            therapists, admin_user, help_seekers, support_user = self._ensure_users(force)
            profiles = self._ensure_therapist_profiles(clinic, therapists, force)
            self._ensure_memberships(clinic, therapists, admin_user, force)
            referrals, patients = self._ensure_referrals_and_patients(clinic, profiles, help_seekers, force)
            self._ensure_appointments(patients, profiles, force)
            self._ensure_availability(profiles, force)
        self.stdout.write(self.style.SUCCESS("Demo seed complete. See README for credentials."))

    def _ensure_clinic(self, force):
        clinic, created = Clinic.objects.update_or_create(
            slug=DEMO_CLINIC["slug"],
            defaults=DEMO_CLINIC,
        )
        if created or force:
            self.stdout.write(f"Clinic: {clinic.name}")
        return clinic

    def _ensure_users(self, force):
        all_emails = [u["email"] for u in DEMO_USERS]
        for i, spec in enumerate(THERAPIST_SPECS):
            email = f"therapist{i + 1}@therapycare.demo"
            all_emails.append(email)

        users = {}
        for u in DEMO_USERS:
            user, created = User.objects.update_or_create(
                email=u["email"],
                defaults={
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "role": u["role"],
                    "is_staff": u["role"] == "clinic_admin",
                },
            )
            if created or force:
                user.set_password(u["password"])
                user.save()
            users[u["email"]] = user

        therapists = []
        for i in range(10):
            email = f"therapist{i + 1}@therapycare.demo"
            user, created = User.objects.update_or_create(
                email=email,
                defaults={"role": "therapist", "first_name": f"Therapist{i + 1}", "last_name": "Demo"},
            )
            if created or force:
                user.set_password("demo123")
                user.save()
            therapists.append(user)

        admin_user = users["admin@therapycare.demo"]
        help_seekers = [users["alice@therapycare.demo"], users["bob@therapycare.demo"]]
        support_user = users.get("support@therapycare.demo")
        return therapists, admin_user, help_seekers, support_user

    def _ensure_therapist_profiles(self, clinic, therapists, force):
        profiles = []
        for i, (user, spec) in enumerate(zip(therapists, THERAPIST_SPECS)):
            # First 2 therapists belong to clinic; rest are directory-only
            prof_clinic = clinic if i < 2 else None
            profile, created = TherapistProfile.objects.update_or_create(
                user=user,
                defaults={
                    "display_name": spec["display_name"],
                    "bio": f"Licensed therapist specializing in {', '.join(spec['specialties'])}.",
                    "specialties": spec["specialties"],
                    "languages": spec["languages"],
                    "city": spec["city"],
                    "remote_available": i % 2 == 0,
                    "clinic": prof_clinic,
                },
            )
            profiles.append(profile)
        self.stdout.write(f"Therapist profiles: {len(profiles)}")
        return profiles

    def _ensure_memberships(self, clinic, therapists, admin_user, force):
        Membership.objects.get_or_create(user=admin_user, clinic=clinic, defaults={"role": "admin"})
        for t in therapists[:2]:
            Membership.objects.get_or_create(user=t, clinic=clinic, defaults={"role": "therapist"})
        self.stdout.write("Memberships: clinic admin + 2 therapists")

    def _ensure_referrals_and_patients(self, clinic, profiles, help_seekers, force):
        referrals = []
        patients = []

        ref_data = [
            {"name": "Alice Smith", "email": "alice@therapycare.demo", "requester": help_seekers[0], "therapist": profiles[0], "status": ReferralStatus.APPROVED},
            {"name": "Bob Jones", "email": "bob@therapycare.demo", "requester": help_seekers[1], "therapist": profiles[1], "status": ReferralStatus.APPROVED},
            {"name": "Carol Doe", "email": "carol@example.com", "requester": None, "therapist": profiles[2], "status": ReferralStatus.NEW},
            {"name": "Dan Brown", "email": "dan@example.com", "requester": help_seekers[0], "therapist": None, "status": ReferralStatus.NEEDS_INFO},
        ]

        for rd in ref_data:
            ref, _ = Referral.objects.update_or_create(
                clinic=clinic,
                patient_name=rd["name"],
                defaults={
                    "requester_user": rd["requester"],
                    "patient_email": rd["email"],
                    "status": rd["status"],
                    "assigned_therapist": rd["therapist"],
                },
            )
            referrals.append(ref)
            if rd["status"] == ReferralStatus.APPROVED and rd["therapist"]:
                maybe_create_patient_for_referral(ref)
                p = Patient.objects.filter(referral=ref).first()
                if p:
                    patients.append(p)

        # Create PatientAccess for therapists
        for p in patients:
            PatientAccess.objects.get_or_create(
                patient=p,
                user=p.owner_therapist.user,
                defaults={"access_type": PatientAccessType.THERAPIST},
            )

        self.stdout.write(f"Referrals: {len(referrals)}, Patients: {len(patients)}")
        return referrals, patients

    def _ensure_appointments(self, patients, profiles, force):
        if not patients:
            return
        base = timezone.now().replace(hour=9, minute=0, second=0, microsecond=0)
        for i, patient in enumerate(patients[:3]):
            therapist = profiles[i % len(profiles)]
            start = base + timedelta(days=i, minutes=i * 60)
            end = start + timedelta(minutes=50)
            appt, created = Appointment.objects.get_or_create(
                patient=patient,
                therapist=therapist,
                starts_at=start,
                defaults={"ends_at": end, "status": "booked"},
            )
            if created and i == 0:
                SessionNote.objects.get_or_create(
                    appointment=appt,
                    defaults={"author": therapist, "body": "Initial assessment completed. Client engaged well."},
                )
        self.stdout.write(f"Appointments: {Appointment.objects.count()}")

    def _ensure_availability(self, profiles, force):
        for prof in profiles[:5]:
            for wd in [0, 1, 2]:
                AvailabilitySlot.objects.get_or_create(
                    therapist=prof,
                    weekday=wd,
                    defaults={
                        "start_time": time(9, 0),
                        "end_time": time(17, 0),
                        "timezone": "America/Los_Angeles",
                    },
                )
        self.stdout.write("Availability slots created")
