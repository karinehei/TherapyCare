# TherapyCare Backend

Django REST Framework API for TherapyCare.

## Setup

### With Poetry

```bash
poetry install
poetry run python manage.py migrate
poetry run python manage.py runserver
```

### Without Poetry (pip + venv)

Use this when Poetry is not installed (e.g. WSL):

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Admin access

Create a superuser to log in at `/admin/`:

```bash
python manage.py createsuperuser
```

Enter your email and password when prompted. Use these credentials at:

- http://localhost:8000/admin/
- http://localhost:5173/admin/ (when frontend dev server is running; Vite proxies `/admin` and `/static`)

## Demo data

```bash
python manage.py seed_demo
```

Creates clinic admin `admin@therapycare.demo` / `demo123` and other demo users.

## Admin theme

The admin uses [Django Daisy](https://github.com/hypy13/django-daisy), a responsive admin built with DaisyUI and TailwindCSS. Application icons use Font Awesome.

After first setup, collect static files:

```bash
python manage.py collectstatic --noinput
```

The TherapyCare theme (corporate) and app icons are configured in `config/settings/base.py` via `DAISY_SETTINGS`. You can switch themes via the theme selector in the admin.
