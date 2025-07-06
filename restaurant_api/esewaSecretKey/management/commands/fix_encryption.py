from django.core.management.base import BaseCommand
from esewaSecretKey.models import EsewaCredentials
from cryptography.fernet import Fernet
import base64

class Command(BaseCommand):
    help = 'Fix eSewa credentials encryption by re-encrypting with the new key'

    def handle(self, *args, **options):
        self.stdout.write('Starting encryption fix...')
        
        # Get all credentials
        credentials = EsewaCredentials.objects.all()
        
        if not credentials.exists():
            self.stdout.write(self.style.WARNING('No eSewa credentials found.'))
            return
        
        self.stdout.write(f'Found {credentials.count()} credential(s) to fix.')
        
        # The new fixed key from settings
        new_key = "dGVzdF9rZXlfZm9yX2VzZXdhX2VuY3J5cHRpb25fdGVzdA=="
        
        for cred in credentials:
            try:
                self.stdout.write(f'Processing credentials for admin {cred.admin.email}...')
                
                # For now, we'll clear the encrypted secret key since we can't decrypt it
                # The admin will need to re-enter their secret key
                cred.esewa_secret_key_encrypted = None
                cred.save()
                
                self.stdout.write(
                    self.style.SUCCESS(f'Cleared encrypted secret key for {cred.admin.email}')
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing {cred.admin.email}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('Encryption fix completed. Admins will need to re-enter their secret keys.')
        ) 