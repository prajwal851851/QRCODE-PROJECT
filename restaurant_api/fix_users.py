from UserRole.models import CustomUser

print("Fixing user relationships...")

# Get super_admin user
super_admin = CustomUser.objects.filter(role='super_admin').first()
if not super_admin:
    print("No super_admin found!")
    exit(1)

print(f"Super admin: {super_admin.username}")

# Print all users and their relationships
for user in CustomUser.objects.all():
    creator = user.created_by.username if user.created_by else "None"
    print(f"User: {user.username}, Role: {user.role}, Created by: {creator}")

# Fix admin users - set their creator to super_admin
admin_users = CustomUser.objects.filter(role='admin').exclude(id=super_admin.id)
for admin in admin_users:
    admin.created_by = super_admin
    admin.save()
    print(f"Fixed admin {admin.username}: Set creator to {super_admin.username}")

# Fix regular users - if they don't have a creator, set it to the first admin
regular_users = CustomUser.objects.exclude(role__in=['super_admin', 'admin']).filter(created_by__isnull=True)
if regular_users.exists():
    first_admin = CustomUser.objects.filter(role='admin').first() or super_admin
    for user in regular_users:
        user.created_by = first_admin
        user.save()
        print(f"Fixed user {user.username}: Set creator to {first_admin.username}")

print("Done fixing user relationships.")
