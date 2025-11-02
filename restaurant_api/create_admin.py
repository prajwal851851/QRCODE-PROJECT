import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_api.settings')
django.setup()

from UserRole.models import CustomUser

# Admin credentials
username = "prajwal"
email = "prajwaldhital851@gmail.com"
password = "Momlove123@"
name = "Prajwal"

try:
    # Check if user exists
    if CustomUser.objects.filter(email=email).exists():
        user = CustomUser.objects.get(email=email)
        # Reset password and permissions
        user.set_password(password)
        user.username = username
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.role = 'super_admin'
        user.first_name = name
        user.save()
        print("=" * 60)
        print("✓ Admin password reset successfully!")
        print("=" * 60)
    else:
        # Create new superuser
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=name,
            role='super_admin',
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )
        print("=" * 60)
        print("✓ Admin user created successfully!")
        print("=" * 60)
    
    print(f"\nDjango Admin Login Credentials:")
    print(f"  Username/Email: {email}")
    print(f"  Password: {password}")
    print(f"\nYou can now login at: /admin/")
    print("=" * 60)
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc() 