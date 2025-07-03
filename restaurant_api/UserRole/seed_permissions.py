# In seed_permissions.py
from django.core.management.base import BaseCommand
# Make sure this imports YOUR custom Permission model
from ..models import Permission # Or your_app_name.models

class Command(BaseCommand):
    help = 'Seeds the database with initial permissions for the custom Permission model'

    def handle(self, *args, **kwargs):
        permissions_data = [
            {"id": "menu_view", "name": "View Menu", "description": "Can view menu items"},
            {"id": "menu_edit", "name": "Edit Menu", "description": "Can edit menu items"},
            {"id": "orders_view", "name": "View Orders", "description": "Can view customer orders"},
            {"id": "orders_manage", "name": "Manage Orders", "description": "Can update order status"},
            {"id": "tables_view", "name": "View Tables", "description": "Can view table status"},
            {"id": "tables_manage", "name": "Manage Tables", "description": "Can update table status"},
            {"id": "qr_generate", "name": "Generate QR Codes", "description": "Can generate QR codes"},
            {"id": "qr_code_view", "name": "View QR Codes", "description": "Can view QR codes"},
            {"id": "qr_code_manage", "name": "Manage QR Codes", "description": "Can manage QR codes"},
            {"id": "payments_view", "name": "View Payments", "description": "Can view payment information"},
            {"id": "customers_view", "name": "View Customers", "description": "Can view customer information"},
            {"id": "settings_view", "name": "View Settings", "description": "Can view system settings"},
            {"id": "settings_edit", "name": "Edit Settings", "description": "Can modify system settings"},
            {"id": "account_view", "name": "View Accounts", "description": "Can view financial accounts"},
            {"id": "account_manage", "name": "Manage Accounts", "description": "Can manage financial accounts"},
            {"id": "users_view", "name": "View Users", "description": "Can view system users"},
            {"id": "users_manage", "name": "Manage Users", "description": "Can add/edit system users"},
        ]

        created_count = 0
        for perm_data in permissions_data:
            obj, created = Permission.objects.get_or_create(
                id=perm_data['id'],
                defaults={'name': perm_data['name'], 'description': perm_data['description']}
            )
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_count} custom permissions.'))
