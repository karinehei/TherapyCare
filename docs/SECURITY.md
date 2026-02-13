# Security

This document describes the threat model, security decisions, and controls for TherapyCare.

## Threat Model

### Assets

- **PHI/PII**: Patient names, emails, session notes, referral details
- **Auth tokens**: JWT access/refresh tokens
- **Audit logs**: Event history (actor, action, entity_type, timestamps)

### Assumptions

- Backend runs in a trusted environment (HTTPS in production)
- PostgreSQL is trusted; no SQL injection via ORM
- Frontend is served from same origin or trusted CORS origins

### Threat Actors

| Actor | Capability | Motivation |
|-------|------------|------------|
| **External attacker** | Unauthenticated HTTP requests | Brute force, enumeration, DoS |
| **Authenticated user** | Own JWT, limited role | Access other users' data |
| **Insider** | Legitimate access (admin/support) | Audit log abuse, data exfiltration |

---

## Controls

### 1. Secure Headers

`config.middleware.SecurityHeadersMiddleware` adds:

| Header | Value | Purpose |
|--------|--------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Legacy XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | Disable unnecessary features |
| Content-Security-Policy | default-src 'self'; ... | Restrict script/style sources |

**Decision**: Custom middleware over django-csp for simplicity. CSP is permissive for inline scripts (Swagger/Browsable API). Tighten in production as needed.

### 2. Rate Limiting

Public endpoints use DRF throttling:

| Endpoint | Throttle | Rate |
|----------|----------|------|
| `/api/v1/therapists/` | AnonRateThrottle | 100/min (anon) |
| `/api/v1/auth/login/` | AuthEndpointThrottle | 20/min |
| `/api/v1/auth/register/` | AuthEndpointThrottle | 20/min |
| `/api/v1/clinics/` (list/retrieve) | AnonRateThrottle | 100/min |

**Decision**: DRF throttling over django-ratelimit for consistency with DRF views. Auth endpoints use stricter limits to mitigate brute force.

### 3. Audit Log

- **Input sanitization**: `audit.service.sanitize_metadata()` strips forbidden keys before storing.
- **Output sanitization**: `AuditEventSerializer` re-sanitizes metadata on read (defence in depth).
- **Forbidden keys**: `body`, `content`, `password`, `token`, `secret`, `api_key`, `access_token`, `refresh_token`, `email`, `phone`, `ssn`, `diagnosis`, `medical`, `health`.

**Decision**: Never store session note bodies or sensitive PII in metadata. Nested dicts are recursively sanitized.

### 4. Session Note Masking

- **Therapist**: Sees full session note body for own appointments.
- **Clinic admin / support**: Sees `"Note hidden"` instead of body.

**Decision**: Session notes are clinician-only. Audit log never stores the body.

### 5. Role-Based Access

- **Patient**: Clinic admin (all); therapist (owned/assigned); help-seeker (access_grants).
- **Referral**: Clinic admin (all); therapist (assigned); help-seeker (own).
- **Appointment**: Clinic admin (all); therapist (own); support (all, masked notes).
- **Audit**: Support only.

**Decision**: Object-level permissions enforced in `has_object_permission`. Filtered querysets ensure 404 for unauthorized objects.

---

## Security Tests

Run permission bypass tests:

```bash
poetry run pytest tests/test_permission_bypass.py -v
```

Covers:

- Therapist cannot access another therapist's patients
- Help-seeker cannot access another user's referrals
- Help-seeker cannot PATCH referral status
- Therapist cannot create session note on another therapist's appointment
- Only support can list audit events

---

## Production Checklist

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` from env (strong, random)
- [ ] `ALLOWED_HOSTS` restricted
- [ ] HTTPS enforced (SECURE_SSL_REDIRECT, etc.)
- [ ] CSP tightened (remove `unsafe-inline` if possible)
- [ ] Rate limits tuned for expected load
- [ ] Audit log retention policy
