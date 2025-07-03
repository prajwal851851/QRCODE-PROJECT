from django.core.management.base import BaseCommand
from qrgenerator.models import Table
from uuid import uuid4

class Command(BaseCommand):
    help = 'Assign unique public_id to all tables missing one.'

    def handle(self, *args, **options):
        count = 0
        for table in Table.objects.all():
            if not table.public_id:
                table.public_id = uuid4()
                table.save()
                count += 1
        self.stdout.write(self.style.SUCCESS(f'Fixed missing public_id for {count} tables.')) 