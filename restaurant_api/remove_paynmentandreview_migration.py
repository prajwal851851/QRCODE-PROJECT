import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_api.settings')
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations WHERE app='PaynmentANDreview' AND name='0001_initial';")
    print("Removed PaynmentANDreview.0001_initial migration record from django_migrations table.") 