# A direct script to fix created_by relationships in all users
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# Get the super admin user to use as the default creator
super_admin = User.objects.filter(role='super_admin').first()
if not super_admin:
    print("ERROR: No super_admin user found in the system.")
    exit(1)

print(f"Using super_admin: {super_admin.username} (ID: {super_admin.id}) as the default creator")

# Find admin users without a created_by
admin_users = User.objects.filter(role='admin')
print(f"Found {admin_users.count()} admin users")

# Set created_by for admin users to super_admin
admin_updated = 0
for admin in admin_users:
    if admin.id != super_admin.id:  # Don't set created_by for super_admin
        admin.created_by = super_admin
        admin.save(update_fields=['created_by'])
        admin_updated += 1
        print(f"Set created_by for admin {admin.username} (ID: {admin.id}) to super_admin")

print(f"Updated {admin_updated} admin users")

# Ensure all users have created_by set to an admin
regular_users = User.objects.exclude(role__in=['super_admin', 'admin'])
print(f"Found {regular_users.count()} regular users")

# Use the first admin to assign to any users without a creator
first_admin = admin_users.first() or super_admin

regular_updated = 0
for user in regular_users:
    if not user.created_by:
        user.created_by = first_admin
        user.save(update_fields=['created_by'])
        regular_updated += 1
        print(f"Set created_by for user {user.username} (ID: {user.id}) to {first_admin.username}")

print(f"Updated {regular_updated} regular users")

print("\nFinal User Relationships:")
for user in User.objects.all():
    creator = f"{user.created_by.username} (ID: {user.created_by.id})" if user.created_by else "None"
    print(f"User: {user.username} (ID: {user.id}, Role: {user.role}) - Created by: {creator}")
