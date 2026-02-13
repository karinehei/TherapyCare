"""Create Patient when referral is APPROVED and therapist assigned."""
from referrals.models import Referral, ReferralStatus


def maybe_create_patient_for_referral(referral: Referral) -> None:
    """
    When referral becomes APPROVED with assigned_therapist, create Patient and link.
    Idempotent: skips if patient already exists.
    """
    if referral.status != ReferralStatus.APPROVED or not referral.assigned_therapist_id:
        return
    if not referral.clinic_id:
        return
    if referral.patient.exists():
        return

    from patients.models import Patient

    Patient.objects.get_or_create(
        referral=referral,
        defaults={
            "clinic": referral.clinic,
            "owner_therapist": referral.assigned_therapist,
            "name": referral.patient_name,
            "email": referral.patient_email or "",
            "phone": "",
            "consent_flags": {},
        },
    )
