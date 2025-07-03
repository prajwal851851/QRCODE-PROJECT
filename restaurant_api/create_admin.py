import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_api.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
username = "prajwal"
password = "Momlove123@"
email = "admin@example.com"

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, password=password, email=email)
    print("Superuser created!")
else:
    print("Superuser already exists.") 