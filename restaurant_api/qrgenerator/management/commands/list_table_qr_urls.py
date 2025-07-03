from django.core.management.base import BaseCommand
from qrgenerator.models import Table

class Command(BaseCommand):
    help = 'List all tables with their qr_code_url'

    def handle(self, *args, **options):
        tables = Table.objects.all()
        for table in tables:
            self.stdout.write(f"Table ID: {table.id}, Name: {table.name}, QR Code URL: {table.qr_code_url}")
