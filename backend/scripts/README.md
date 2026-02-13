# Load Testing

## Simple load test (stdlib, no extra deps)

```bash
cd backend
python scripts/load_test_therapists.py
```

Options:
- `--base-url URL` - API base (default: http://localhost:8000)
- `--users N` - Simulated users (default: 5)
- `--requests N` - Requests per user (default: 20)

Example:
```bash
python scripts/load_test_therapists.py --base-url http://localhost:8000 --users 10 --requests 50
```

## Locust (interactive load test)

```bash
cd backend
pip install locust  # or: poetry add locust
locust -f scripts/locust_therapists.py --host=http://localhost:8000
```

Open http://localhost:8089 for the web UI. Configure users and spawn rate, then start the test.

Tasks:
- **list_therapists** (2×) - GET /api/v1/therapists/?page_size=20
- **list_therapists_filtered** (1×) - GET with specialty, city, remote filters
- **search_therapists** (1×) - GET with full-text search q=therapy

## Prerequisites

1. Backend running: `poetry run python manage.py runserver`
2. Demo data: `poetry run python manage.py seed_demo`
