"""
Management command to test email configuration
Usage: python manage.py test_email <recipient_email>
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
import sys


class Command(BaseCommand):
    help = 'Test email configuration by sending a test email'

    def add_arguments(self, parser):
        parser.add_argument(
            'recipient',
            type=str,
            help='Recipient email address',
        )

    def handle(self, *args, **options):
        recipient = options['recipient']
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.WARNING('Testing Email Configuration'))
        self.stdout.write('='*60 + '\n')
        
        # Display email settings (without password)
        self.stdout.write(f'Email Host: {settings.EMAIL_HOST}')
        self.stdout.write(f'Email Port: {settings.EMAIL_PORT}')
        self.stdout.write(f'Email Use TLS: {settings.EMAIL_USE_TLS}')
        self.stdout.write(f'Email User: {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'Email Timeout: {settings.EMAIL_TIMEOUT} seconds')
        self.stdout.write(f'Email Backend: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'Default From: {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write(f'Password Set: {"Yes" if settings.EMAIL_HOST_PASSWORD else "No"}')
        self.stdout.write('\n' + '-'*60 + '\n')
        
        # Try to send test email
        self.stdout.write(self.style.WARNING(f'Sending test email to {recipient}...'))
        
        try:
            result = send_mail(
                subject='Test Email - QR Menu System',
                message='This is a test email from your QR Menu system. If you receive this, email configuration is working correctly!',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
            
            if result:
                self.stdout.write(self.style.SUCCESS('\n✓ Email sent successfully!'))
                self.stdout.write(self.style.SUCCESS(f'Check {recipient} inbox (and spam folder) for the test email.\n'))
                return
            else:
                self.stdout.write(self.style.ERROR('\n✗ Email sending returned False (no error, but email not sent)'))
                
        except Exception as e:
            error_msg = str(e)
            self.stdout.write(self.style.ERROR(f'\n✗ Error sending email: {error_msg}'))
            self.stdout.write(self.style.ERROR(f'Error Type: {type(e).__name__}\n'))
            
            # Provide helpful troubleshooting
            if 'authentication failed' in error_msg.lower() or 'invalid credentials' in error_msg.lower():
                self.stdout.write(self.style.WARNING('\nTroubleshooting Gmail Authentication:'))
                self.stdout.write('1. Verify your App Password is correct')
                self.stdout.write('   - Go to: https://myaccount.google.com/apppasswords')
                self.stdout.write('   - Make sure 2-Step Verification is enabled')
                self.stdout.write('   - Generate a new App Password if needed')
                self.stdout.write('2. Check that EMAIL_HOST_PASSWORD in settings matches the App Password')
                self.stdout.write('3. Make sure there are no extra spaces in the App Password')
                
            elif 'connection' in error_msg.lower() or 'timeout' in error_msg.lower():
                self.stdout.write(self.style.WARNING('\nTroubleshooting Connection Issues:'))
                self.stdout.write('1. Check firewall/network settings')
                self.stdout.write('2. Verify EMAIL_HOST and EMAIL_PORT are correct')
                self.stdout.write('3. Try increasing EMAIL_TIMEOUT in settings')
                
            elif 'smtp' in error_msg.lower():
                self.stdout.write(self.style.WARNING('\nTroubleshooting SMTP Issues:'))
                self.stdout.write('1. Check that smtp.gmail.com is accessible')
                self.stdout.write('2. Try port 465 with SSL instead of 587 with TLS')
                self.stdout.write('3. Verify EMAIL_USE_TLS setting')
            
            sys.exit(1)

