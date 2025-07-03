import logging
from django.core.management.base import BaseCommand
from UserRole.models import Permission

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Creates all required permissions in the database'

    def handle(self, *args, **options):
        # Define all permissions that should exist in the system
        default_permissions = [
            # Menu permissions
            {'id': 'menu_view', 'name': 'View Menu', 'description': 'Can view menu items'},
            {'id': 'menu_edit', 'name': 'Edit Menu', 'description': 'Can create, edit and delete menu items'},
            
            # Order permissions
            {'id': 'orders_view', 'name': 'View Orders', 'description': 'Can view orders'},
            {'id': 'orders_manage', 'name': 'Manage Orders', 'description': 'Can update order status and manage orders'},
            
            # Customer permissions
            {'id': 'customers_view', 'name': 'View Customers', 'description': 'Can view customer information'},
            {'id': 'customers_manage', 'name': 'Manage Customers', 'description': 'Can manage customer accounts'},
            
            # User management permissions
            {'id': 'users_view', 'name': 'View Users', 'description': 'Can view other users'},
            {'id': 'users_manage', 'name': 'Manage Users', 'description': 'Can create, edit, and delete users'},
            
            # Inventory permissions
            {'id': 'inventory_view', 'name': 'View Inventory', 'description': 'Can view inventory items and stock levels'},
            {'id': 'inventory_edit', 'name': 'Edit Inventory', 'description': 'Can create, edit and delete inventory items'},
            {'id': 'inventory_manage', 'name': 'Manage Inventory', 'description': 'Can manage stock in/out, suppliers, and categories'},
            {'id': 'inventory_alerts', 'name': 'Inventory Alerts', 'description': 'Can view and manage inventory alerts'},
            
            # Report permissions
            {'id': 'reports_view', 'name': 'View Reports', 'description': 'Can view reports and analytics'},
            {'id': 'reports_export', 'name': 'Export Reports', 'description': 'Can export reports and analytics'},
            
            # Settings permissions
            {'id': 'settings_view', 'name': 'View Settings', 'description': 'Can view system settings'},
            {'id': 'settings_edit', 'name': 'Edit Settings', 'description': 'Can modify system settings'},
        ]

        # Create or update permissions
        created_count = 0
        updated_count = 0
        
        for perm_data in default_permissions:
            perm, created = Permission.objects.update_or_create(
                id=perm_data['id'],
                defaults={
                    'name': perm_data['name'],
                    'description': perm_data['description'],
                }
            )
            
            if created:
                created_count += 1
                logger.info(f"Created permission: {perm.id} - {perm.name}")
            else:
                updated_count += 1
                logger.info(f"Updated permission: {perm.id} - {perm.name}")
                
        # Print summary
        self.stdout.write(self.style.SUCCESS(
            f"Permission setup complete. Created: {created_count}, Updated: {updated_count}"
        ))
