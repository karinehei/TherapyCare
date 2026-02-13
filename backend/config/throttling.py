"""Rate limiting for public endpoints."""
from rest_framework.throttling import AnonRateThrottle


class PublicEndpointThrottle(AnonRateThrottle):
    """Stricter rate for unauthenticated requests to public endpoints."""
    rate = "60/minute"


class AuthEndpointThrottle(AnonRateThrottle):
    """Rate limit for login/register to prevent brute force."""
    rate = "20/minute"
