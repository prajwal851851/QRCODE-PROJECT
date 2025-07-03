from django.core.management.base import BaseCommand
from UserRole.models import CustomUser

class Command(BaseCommand):
    help = 'Fix missing created_by relationships for users'

    def handle(self, *args, **options):
        self.stdout.write('Starting to fix user creator relationships...')
        
        # Get all users
        all_users = CustomUser.objects.all()
        self.stdout.write(f'Found {all_users.count()} users in the system')
        
        # Find super_admin user to use as fallback creator
        super_admin = CustomUser.objects.filter(role='super_admin').first()
        if not super_admin:
            self.stdout.write(self.style.ERROR('No super_admin user found! Cannot proceed.'))
            return
            
        self.stdout.write(f'Using super_admin: {super_admin.username} (ID: {super_admin.id}) as fallback creator')
        
        # Count of updated users
        updated_count = 0
        
        # Fix created_by relationships
        for user in all_users:
            # Skip super_admin users
            if user.role == 'super_admin':
                self.stdout.write(f'Skipping super_admin user: {user.username}')
                continue
                
            # Only update users with missing created_by
            if user.created_by is None:
                user.created_by = super_admin
                user.save(update_fields=['created_by'])
                updated_count += 1
                self.stdout.write(f'Updated user {user.username} (ID: {user.id}) - Set creator to: {super_admin.username}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} users'))
        
        # Print final status
        for user in CustomUser.objects.all():
            creator = user.created_by.username if user.created_by else 'None'
            self.stdout.write(f'User: {user.username} (ID: {user.id}, Role: {user.role}) - Creator: {creator}')
