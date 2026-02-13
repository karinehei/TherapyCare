"""Custom middleware: security headers."""

from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Add secure HTTP headers to all responses.
    Mitigates XSS, clickjacking, MIME sniffing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Prevent MIME type sniffing
        response["X-Content-Type-Options"] = "nosniff"
        # Minimize clickjacking (DENY or SAMEORIGIN)
        response["X-Frame-Options"] = "DENY"
        # Legacy XSS filter (most browsers respect X-Content-Type-Options instead)
        response["X-XSS-Protection"] = "1; mode=block"
        # Limit referrer leakage
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Disable unnecessary browser features
        response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Basic CSP: restrict script sources (adjust for your frontend)
        # Allow inline for DRF Browsable API / Swagger in dev
        swagger_cdn = "https://cdn.jsdelivr.net"
        script_src = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        style_src = ["'self'", "'unsafe-inline'"]
        connect_src = ["'self'"]
        font_src = ["'self'"]
        img_src = ["'self'", "data:"]

        # drf-spectacular Swagger UI loads assets from CDN by default.
        # Allow this in development only, so /api/docs/ works behind nginx.
        if settings.DEBUG:
            script_src.append(swagger_cdn)
            style_src.append(swagger_cdn)
            connect_src.append(swagger_cdn)
            font_src.append(swagger_cdn)
            img_src.append(swagger_cdn)

        response["Content-Security-Policy"] = (
            "default-src 'self'; "
            f"script-src {' '.join(script_src)}; "
            f"style-src {' '.join(style_src)}; "
            f"img-src {' '.join(img_src)}; "
            f"font-src {' '.join(font_src)}; "
            f"connect-src {' '.join(connect_src)}; "
            "frame-ancestors 'none'"
        )
        return response
