"""
Referral status transition guard.
Only sensible transitions are allowed.
"""

# Valid transitions: from_status -> [to_statuses]
REFERRAL_TRANSITIONS = {
    "new": ["needs_info", "approved", "rejected"],
    "needs_info": ["new", "approved", "rejected"],
    "approved": ["scheduled", "rejected"],
    "scheduled": ["ongoing", "closed"],
    "ongoing": ["closed"],
    "closed": [],  # terminal
    "rejected": [],  # terminal
}


def can_transition(from_status: str, to_status: str) -> bool:
    """Return True if transition from_status -> to_status is allowed."""
    if from_status == to_status:
        return True
    allowed = REFERRAL_TRANSITIONS.get(from_status, [])
    return to_status in allowed


def get_allowed_transitions(from_status: str) -> list[str]:
    """Return list of statuses that can be transitioned to from from_status."""
    return list(REFERRAL_TRANSITIONS.get(from_status, []))
