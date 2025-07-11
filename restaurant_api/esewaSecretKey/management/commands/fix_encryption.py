from django.core.management.base import BaseCommand
from django.conf import settings
from esewaSecretKey.models import EsewaCredentials
import os
from cryptography.fernet import Fernet

class Command(BaseCommand):
    help = 'Fix eSewa encryption issues by clearing corrupted credentials or setting up consistent encryption'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-corrupted',
            action='store_true',
            help='Clear all corrupted eSewa credentials',
        )
        parser.add_argument(
            '--set-test-key',
            action='store_true',
            help='Set a consistent test encryption key',
        )

    def handle(self, *args, **options):
        if options['clear_corrupted']:
            self.clear_corrupted_credentials()
        elif options['set_test_key']:
            self.set_test_encryption_key()
        else:
            self.stdout.write(
                self.style.WARNING(
                    'Please specify --clear-corrupted or --set-test-key'
                )
            )

    def clear_corrupted_credentials(self):
        """Clear all eSewa credentials that have encryption issues"""
        credentials = EsewaCredentials.objects.all()
        count = 0
        
        for cred in credentials:
            try:
                # Try to decrypt the secret key
                secret_key = cred.decrypt_secret_key()
                if not secret_key:
                    # If decryption fails, clear the encrypted data
                    cred.esewa_secret_key_encrypted = None
                    cred.save()
                    count += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'Cleared corrupted secret key for admin {cred.admin.id}'
                        )
                    )
            except Exception as e:
                # If any error occurs, clear the encrypted data
                cred.esewa_secret_key_encrypted = None
                cred.save()
                count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'Error with admin {cred.admin.id}: {str(e)} - cleared encrypted data'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Cleared {count} corrupted eSewa credentials'
            )
        )

    def set_test_encryption_key(self):
        """Set a consistent test encryption key for development"""
        # Generate a consistent test key
        test_key = Fernet.generate_key()
        
        # Set it in environment
        os.environ['ESEWA_ENCRYPTION_KEY'] = test_key.decode()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Set test encryption key: {test_key[:20].decode()}...'
            )
        )
        
        # Test with existing credentials
        credentials = EsewaCredentials.objects.filter(
            esewa_secret_key_encrypted__isnull=False
        ).exclude(esewa_secret_key_encrypted='')
        
        if credentials.exists():
            self.stdout.write(
                self.style.WARNING(
                    f'Found {credentials.count()} credentials with encrypted data. '
                    'These will need to be re-encrypted with the new key.'
                )
            ) 