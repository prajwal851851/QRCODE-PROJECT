from django.core.management.base import BaseCommand
from UserRole.models import CustomUser, Permission
from django.contrib.auth.hashers import make_password

class Command(BaseCommand):
    help = 'Creates a super admin user if one does not exist'

    def handle(self, *args, **kwargs):
        try:
            # Check if super admin exists
            super_admin = CustomUser.objects.filter(role='super_admin').first()
            
            if not super_admin:
                # Create super admin
                super_admin = CustomUser.objects.create(
                    username='superadmin',
                    email='admin@example.com',
                    password=make_password('admin123'),  # Change this password
                    role='super_admin',
                    status='active',
                    is_staff=True,
                    is_superuser=True
                )
                
                # Assign all permissions
                super_admin.permissions.set(Permission.objects.all())
                
                self.stdout.write(self.style.SUCCESS('Successfully created super admin user'))
            else:
                self.stdout.write(self.style.WARNING('Super admin user already exists'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating super admin: {str(e)}')) 