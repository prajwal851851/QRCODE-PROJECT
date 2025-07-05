from django.core.management.base import BaseCommand
from UserRole.models import Permission, CustomUser, UserRoleChoices

class Command(BaseCommand):
    help = 'Creates all permissions and assigns them to users based on their roles'

    def handle(self, *args, **options):
        self.stdout.write("Setting up permissions system...")
        
        # Step 1: Create all permissions
        self.stdout.write("Creating permissions...")
        self._create_permissions()
        
        # Step 2: Assign permissions to users
        self.stdout.write("Assigning permissions to users...")
        self._assign_role_permissions()
        
        self.stdout.write(self.style.SUCCESS("Permission setup completed successfully!"))

    def _create_permissions(self):
        """Create all required permissions"""
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
            
            # QR Code permissions
            {'id': 'qr_code_view', 'name': 'View QR Codes', 'description': 'Can view QR codes'},
            {'id': 'qr_code_manage', 'name': 'Manage QR Codes', 'description': 'Can manage QR codes'},
            {'id': 'qr_generate', 'name': 'Generate QR Codes', 'description': 'Can generate QR codes'},
            
            # Table permissions
            {'id': 'tables_view', 'name': 'View Tables', 'description': 'Can view table status'},
            {'id': 'tables_manage', 'name': 'Manage Tables', 'description': 'Can update table status'},
            
            # Report permissions
            {'id': 'reports_view', 'name': 'View Reports', 'description': 'Can view reports and analytics'},
            {'id': 'reports_export', 'name': 'Export Reports', 'description': 'Can export reports and analytics'},
            
            # Settings permissions
            {'id': 'settings_view', 'name': 'View Settings', 'description': 'Can view system settings'},
            {'id': 'settings_edit', 'name': 'Edit Settings', 'description': 'Can modify system settings'},
            
            # Account permissions
            {'id': 'account_view', 'name': 'View Accounts', 'description': 'Can view account information'},
            {'id': 'account_manage', 'name': 'Manage Accounts', 'description': 'Can manage account settings'},
        ]

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
                self.stdout.write(f"Created permission: {perm.id} - {perm.name}")
            else:
                updated_count += 1
                
        self.stdout.write(f"Permissions: Created {created_count}, Updated {updated_count}")

    def _assign_role_permissions(self):
        """Assign permissions to users based on their roles"""
        role_permissions = {
            UserRoleChoices.SUPER_ADMIN: [
                'menu_view', 'menu_edit', 'orders_view', 'orders_manage',
                'customers_view', 'customers_manage', 'users_view', 'users_manage',
                'inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts',
                'reports_view', 'reports_export', 'settings_view', 'settings_edit',
                'qr_code_view', 'qr_code_manage', 'qr_generate', 'account_view', 'account_manage',
                'tables_view', 'tables_manage'
            ],
            UserRoleChoices.ADMIN: [
                'menu_view', 'menu_edit', 'orders_view', 'orders_manage',
                'customers_view', 'customers_manage', 'users_view', 'users_manage',
                'inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts',
                'reports_view', 'reports_export', 'settings_view', 'settings_edit',
                'qr_code_view', 'qr_code_manage', 'qr_generate', 'account_view', 'account_manage',
                'tables_view', 'tables_manage'
            ],
            UserRoleChoices.MENU_MANAGER: [
                'menu_view', 'menu_edit', 'orders_view', 'inventory_view'
            ],
            UserRoleChoices.ORDER_MANAGER: [
                'orders_view', 'orders_manage', 'customers_view', 'reports_view'
            ],
            UserRoleChoices.CUSTOMER_SUPPORT: [
                'customers_view', 'customers_manage', 'orders_view'
            ],
            UserRoleChoices.QR_CODE_MANAGER: [
                'qr_code_view', 'qr_code_manage', 'qr_generate', 'tables_view', 'tables_manage'
            ],
            UserRoleChoices.ACCOUNT_MANAGER: [
                'account_view', 'account_manage', 'reports_view', 'reports_export'
            ],
            UserRoleChoices.INVENTORY_MANAGER: [
                'inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts'
            ],
        }

        users = CustomUser.objects.all()
        total_users = users.count()
        self.stdout.write(f"Processing {total_users} users...")

        for user in users:
            self.stdout.write(f"Processing user: {user.username} (Role: {user.role})")
            
            # Get permissions for this role
            role_perms = role_permissions.get(user.role, [])
            
            if not role_perms:
                self.stdout.write(self.style.WARNING(f"No permissions defined for role: {user.role}"))
                continue

            # Get permission objects
            permissions = Permission.objects.filter(id__in=role_perms)
            
            # Clear existing permissions and assign new ones
            user.custom_permissions.clear()
            user.custom_permissions.add(*permissions)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Assigned {permissions.count()} permissions to {user.username}"
                )
            ) 