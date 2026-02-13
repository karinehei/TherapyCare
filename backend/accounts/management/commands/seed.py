"""Seed database with sample data."""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from appointments.models import Appointment
from audit.models import AuditEvent
from clinics.models import Clinic, Membership
from directory.models import AvailabilitySlot, TherapistProfile
from patients.models import Consent, Patient, PatientProfile
from referrals.models import Referral, ReferralStatus
from referrals.patient_creation import maybe_create_patient_for_referral


class Command(BaseCommand):
    help = "Seed database with sample data"

    def handle(self, *args, **options):
        with transaction.atomic():
            self._seed_users()
            self._seed_clinics()
            self._seed_profiles()
            self._seed_referrals()
            self._seed_appointments()
            self._seed_audit()
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def _seed_users(self):
        if User.objects.exists():
            self.stdout.write("Users already exist, skipping.")
            return
        admin = User.objects.create_user(
            email="admin@therapycare.example",
            password="admin123",
            role="clinic_admin",
            first_name="Admin",
            last_name="User",
        )
        therapist = User.objects.create_user(
            email="therapist@therapycare.example",
            password="therapist123",
            role="therapist",
            first_name="Jane",
            last_name="Therapist",
        )
        patient = User.objects.create_user(
            email="patient@therapycare.example",
            password="patient123",
            role="help_seeker",
            first_name="John",
            last_name="Patient",
        )
        self.stdout.write(f"Created users: {admin.email}, {therapist.email}, {patient.email}")

    def _seed_clinics(self):
        if Clinic.objects.exists():
            self.stdout.write("Clinics already exist, skipping.")
            return
        clinic = Clinic.objects.create(
            name="Downtown Wellness Clinic",
            slug="downtown-wellness",
            address="123 Main St",
            phone="555-0100",
        )
        therapist = User.objects.get(email="therapist@therapycare.example")
        Membership.objects.create(user=therapist, clinic=clinic, role="therapist")
        self.stdout.write(f"Created clinic: {clinic.name}")

    def _seed_profiles(self):
        if TherapistProfile.objects.exists():
            self.stdout.write("Therapist profiles already exist, skipping.")
            return
        therapist = User.objects.get(email="therapist@therapycare.example")
        clinic = Clinic.objects.first()
        TherapistProfile.objects.create(
            user=therapist,
            display_name="Jane Therapist",
            clinic=clinic,
            bio="Licensed therapist specializing in anxiety and depression.",
            specialties=["Anxiety", "Depression", "CBT"],
            languages=["English"],
            city="San Francisco",
            remote_available=True,
        )
        patient = User.objects.get(email="patient@therapycare.example")
        pp = PatientProfile.objects.create(user=patient, emergency_contact="555-0199")
        Consent.objects.create(patient=pp, consent_type="treatment", granted=True)
        Consent.objects.create(patient=pp, consent_type="hipaa", granted=True)
        self.stdout.write("Created therapist and patient profiles.")

    def _seed_referrals(self):
        if Referral.objects.exists():
            self.stdout.write("Referrals already exist, skipping.")
            return
        clinic = Clinic.objects.first()
        therapist_profile = TherapistProfile.objects.first()
        patient = User.objects.get(email="patient@therapycare.example")
        ref = Referral.objects.create(
            clinic=clinic,
            requester_user=patient,
            patient_name="Referral Patient",
            patient_email="referral@example.com",
            status=ReferralStatus.APPROVED,
            assigned_therapist=therapist_profile,
        )
        maybe_create_patient_for_referral(ref)
        self.stdout.write("Created referral and patient.")

    def _seed_appointments(self):
        from datetime import time, timedelta

        from django.utils import timezone

        if AvailabilitySlot.objects.exists():
            self.stdout.write("Availability already exists, skipping.")
        else:
            therapist_profile = TherapistProfile.objects.first()
            AvailabilitySlot.objects.create(
                therapist=therapist_profile,
                weekday=1,
                start_time=time(9, 0),
                end_time=time(17, 0),
                timezone="America/Los_Angeles",
            )
        if Appointment.objects.exists():
            self.stdout.write("Appointments already exist, skipping.")
            return
        patient = Patient.objects.first()
        therapist_profile = TherapistProfile.objects.first()
        if patient and therapist_profile:
            start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
            end = start + timedelta(minutes=50)
            Appointment.objects.create(
                therapist=therapist_profile,
                patient=patient,
                starts_at=start,
                ends_at=end,
                status="booked",
            )
            self.stdout.write("Created appointment.")

    def _seed_audit(self):
        if AuditEvent.objects.exists():
            self.stdout.write("Audit events already exist, skipping.")
            return
        user = User.objects.first()
        AuditEvent.objects.create(
            actor=user,
            action="login",
            entity_type="user",
            entity_id=str(user.id),
            metadata={"source": "seed"},
        )
        self.stdout.write("Created audit event.")
