#!/bin/bash

# Exit on error
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
# Use a simple loop to check if port 5432 is open
until (echo > /dev/tcp/db/5432) >/dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is up - running migrations..."
# Run migrations and capture output
python -m alembic upgrade head

# Start the application
echo "Starting application..."
exec uvicorn app.main:app --port=8000 --host=0.0.0.0
