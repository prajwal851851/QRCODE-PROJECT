"""
Management command to create or reset Django admin user
Usage: 
  python manage.py create_or_reset_admin
  python manage.py create_or_reset_admin --email your@email.com --password yourpassword
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from UserRole.models import CustomUser

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a new Django admin superuser or resets password for existing user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address for the admin user',
            default=None,
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username for the admin user (defaults to email if not provided)',
            default=None,
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the admin user',
            default=None,
        )
        parser.add_argument(
            '--name',
            type=str,
            help='Full name for the admin user',
            default='Admin User',
        )

    def handle(self, *args, **options):
        email = options['email']
        username = options['username']
        password = options['password']
        name = options['name']

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.WARNING('Django Admin User Setup'))
        self.stdout.write('='*60 + '\n')

        # Interactive mode if arguments not provided
        if not email:
            email = input('Enter email address: ').strip()
        
        if not password:
            password = input('Enter password: ').strip()
            confirm_password = input('Confirm password: ').strip()
            
            if password != confirm_password:
                self.stdout.write(self.style.ERROR('Passwords do not match!'))
                return
            
            if len(password) < 8:
                self.stdout.write(self.style.ERROR('Password must be at least 8 characters!'))
                return

        if not username:
            username = email

        if not name:
            name = email.split('@')[0]

        try:
            # Check if user exists
            user = None
            if CustomUser.objects.filter(email=email).exists():
                user = CustomUser.objects.get(email=email)
                self.stdout.write(self.style.WARNING(f'User with email {email} already exists.'))
                
                # Ask to reset password
                if not options['password']:
                    reset = input('Do you want to reset the password? (yes/no): ').strip().lower()
                    if reset not in ['yes', 'y']:
                        self.stdout.write(self.style.WARNING('Password reset cancelled.'))
                        return
                
                # Reset password
                user.set_password(password)
                user.is_active = True
                user.is_staff = True
                user.is_superuser = True
                user.role = 'super_admin'
                user.first_name = name.split()[0] if name.split() else name
                user.last_name = ' '.join(name.split()[1:]) if len(name.split()) > 1 else ''
                
                # Ensure username matches
                if user.username != username:
                    user.username = username
                
                user.save()
                
                self.stdout.write(self.style.SUCCESS(f'\n✓ Password reset successfully for {email}'))
                self.stdout.write(self.style.SUCCESS(f'  Username: {username}'))
                self.stdout.write(self.style.SUCCESS(f'  Email: {email}'))
                self.stdout.write(self.style.SUCCESS(f'  Role: super_admin'))
                self.stdout.write(self.style.SUCCESS(f'  Is Superuser: Yes'))
                self.stdout.write(self.style.SUCCESS(f'  Is Staff: Yes\n'))
                
            else:
                # Create new user
                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=name.split()[0] if name.split() else name,
                    last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
                    role='super_admin',
                    is_active=True,
                    is_staff=True,
                    is_superuser=True,
                )
                
                self.stdout.write(self.style.SUCCESS(f'\n✓ Superuser created successfully!'))
                self.stdout.write(self.style.SUCCESS(f'  Username: {username}'))
                self.stdout.write(self.style.SUCCESS(f'  Email: {email}'))
                self.stdout.write(self.style.SUCCESS(f'  Role: super_admin'))
                self.stdout.write(self.style.SUCCESS(f'  Is Superuser: Yes'))
                self.stdout.write(self.style.SUCCESS(f'  Is Staff: Yes\n'))

            self.stdout.write(self.style.WARNING('You can now login to Django admin with:'))
            self.stdout.write(f'  Email: {email}')
            self.stdout.write(f'  Password: {password}\n')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Error: {str(e)}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))

