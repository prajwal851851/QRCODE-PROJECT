# Run this script with: python manage.py shell < fix_user_relationships.py
from UserRole.models import CustomUser
from django.db import transaction

def fix_user_relationships():
    print("======= FIXING USER RELATIONSHIPS =======")
    
    # Get all users
    all_users = CustomUser.objects.all()
    print(f"Total users: {all_users.count()}")
    
    # Find the super_admin user
    super_admin = CustomUser.objects.filter(role='super_admin').first()
    if not super_admin:
        print("ERROR: No super_admin found!")
        return
    
    print(f"Using super_admin: {super_admin.username} (ID: {super_admin.id})")
    
    # Find all admin users
    admin_users = CustomUser.objects.filter(role='admin')
    print(f"Found {admin_users.count()} admin users")
    
    with transaction.atomic():
        # 1. First ensure super_admin doesn't have a created_by set
        if super_admin.created_by is not None:
            print(f"Removing created_by from super_admin {super_admin.username}")
            super_admin.created_by = None
            super_admin.save(update_fields=['created_by'])
        
        # 2. Set created_by for admin users to super_admin if not set
        for admin in admin_users:
            if admin.created_by is None:
                print(f"Setting created_by for admin {admin.username} to super_admin")
                admin.created_by = super_admin
                admin.save(update_fields=['created_by'])
        
        # 3. Set created_by for all other users without a creator
        other_users = CustomUser.objects.exclude(role__in=['super_admin', 'admin']).filter(created_by__isnull=True)
        print(f"Found {other_users.count()} regular users without a creator")
        
        # Assign these users to the first admin
        if admin_users.exists() and other_users.exists():
            first_admin = admin_users.first()
            print(f"Assigning users to admin: {first_admin.username}")
            for user in other_users:
                user.created_by = first_admin
                user.save(update_fields=['created_by'])
                print(f"  - Set creator for {user.username} to {first_admin.username}")
    
    # Print final status
    print("\n======= FINAL USER RELATIONSHIPS =======")
    for user in CustomUser.objects.all().order_by('role', 'username'):
        creator = user.created_by.username if user.created_by else "None"
        print(f"User: {user.username} (ID: {user.id}, Role: {user.role}) - Created by: {creator}")

# Run the function
fix_user_relationships()
