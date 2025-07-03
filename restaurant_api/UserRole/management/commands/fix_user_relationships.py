import logging
from django.core.management.base import BaseCommand
from UserRole.models import CustomUser

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix created_by relationships for all users in the system'

    def handle(self, *args, **options):
        logger.info("Starting to fix user relationships...")
        self.stdout.write("Starting to fix user relationships...")
        
        # Get the super_admin user
        super_admin = CustomUser.objects.filter(role='super_admin').first()
        if not super_admin:
            self.stdout.write(self.style.ERROR('No super_admin user found in the system!'))
            return
            
        self.stdout.write(f"Using super_admin: {super_admin.username} (ID: {super_admin.id}) as default creator")
        
        # Print all users and their current relationships
        self.stdout.write("\nCURRENT USER RELATIONSHIPS:")
        for user in CustomUser.objects.all():
            creator = f"{user.created_by.username} (ID: {user.created_by.id})" if user.created_by else "None"
            self.stdout.write(f"User: {user.username} (ID: {user.id}, Role: {user.role}) - Created by: {creator}")
        
        # 1. Fix admin users - set their creator to super_admin
        admin_users = CustomUser.objects.filter(role='admin').exclude(id=super_admin.id)
        admin_count = 0
        
        for admin in admin_users:
            if admin.created_by is None or admin.created_by.id != super_admin.id:
                admin.created_by = super_admin
                admin.save(update_fields=['created_by'])
                admin_count += 1
                self.stdout.write(f"Fixed admin {admin.username}: Set creator to {super_admin.username}")
        
        self.stdout.write(f"Updated {admin_count} admin users")
        
        # 2. Fix regular users - if they don't have a creator, set it to the first admin or super_admin
        regular_users = CustomUser.objects.exclude(role__in=['super_admin', 'admin']).filter(created_by__isnull=True)
        regular_count = 0
        
        if regular_users.exists():
            first_admin = CustomUser.objects.filter(role='admin').first() or super_admin
            
            for user in regular_users:
                user.created_by = first_admin
                user.save(update_fields=['created_by'])
                regular_count += 1
                self.stdout.write(f"Fixed user {user.username}: Set creator to {first_admin.username}")
        
        self.stdout.write(f"Updated {regular_count} regular users")
        
        # Final check of relationships
        self.stdout.write("\nFINAL USER RELATIONSHIPS:")
        for user in CustomUser.objects.all():
            creator = f"{user.created_by.username} (ID: {user.created_by.id})" if user.created_by else "None"
            self.stdout.write(f"User: {user.username} (ID: {user.id}, Role: {user.role}) - Created by: {creator}")
        
        self.stdout.write(self.style.SUCCESS('Successfully fixed user relationships'))
