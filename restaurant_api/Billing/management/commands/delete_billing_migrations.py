from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Delete all migration records for Billing app'

    def handle(self, *args, **kwargs):
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM django_migrations WHERE app='Billing';")
        self.stdout.write(self.style.SUCCESS('Deleted migration records for Billing app.'))