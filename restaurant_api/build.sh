#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate

# Create permissions (if they don't exist)
python manage.py create_permissions

# Assign permissions to existing users based on their roles
python manage.py assign_role_permissions

echo "Build completed successfully!" 