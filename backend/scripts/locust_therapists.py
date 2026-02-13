"""
Locust load test for therapist list/search endpoints.
Usage:
  pip install locust
  locust -f scripts/locust_therapists.py --host=http://localhost:8000
  # Open http://localhost:8089 for web UI
"""

from locust import HttpUser, between, task


class TherapistUser(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(2)
    def list_therapists(self):
        """GET /api/v1/therapists/ - list with pagination."""
        self.client.get("/api/v1/therapists/", params={"page_size": 20})

    @task(1)
    def list_therapists_filtered(self):
        """GET /api/v1/therapists/ - with filters."""
        self.client.get(
            "/api/v1/therapists/",
            params={
                "specialty": "Anxiety",
                "city": "San Francisco",
                "remote": "true",
                "page_size": 20,
            },
        )

    @task(1)
    def search_therapists(self):
        """GET /api/v1/therapists/?q=... - full-text search."""
        self.client.get("/api/v1/therapists/", params={"q": "therapy", "page_size": 20})
