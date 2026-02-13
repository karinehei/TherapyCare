#!/bin/sh
set -e
python manage.py migrate

if [ "$RUN_MODE" = "gunicorn" ]; then
  exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2
else
  exec python manage.py runserver 0.0.0.0:8000
fi
