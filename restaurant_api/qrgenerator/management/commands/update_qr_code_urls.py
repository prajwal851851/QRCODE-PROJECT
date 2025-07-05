from django.core.management.base import BaseCommand
from qrgenerator.models import Table

class Command(BaseCommand):
    help = 'Update qr_code_url for all existing tables to use table name'

    def handle(self, *args, **options):
        tables = Table.objects.all()
        updated_count = 0
        for table in tables:
            correct_url = f"https://dynamic-creponne-83f334.netlify.app/menu?tableId={table.name}"  # Use table.name for tableId
            if table.qr_code_url != correct_url:
                table.qr_code_url = correct_url
                table.save(update_fields=['qr_code_url'])
                updated_count += 1
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} tables qr_code_url'))
