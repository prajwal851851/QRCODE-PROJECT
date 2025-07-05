from django.core.management.base import BaseCommand
from UserRole.models import CustomUser, Permission, UserRoleChoices

class Command(BaseCommand):
    help = 'Assigns permissions to users based on their roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Specific username to assign permissions to',
        )
        parser.add_argument(
            '--role',
            type=str,
            choices=[choice[0] for choice in UserRoleChoices.choices],
            help='Specific role to assign permissions to',
        )

    def handle(self, *args, **options):
        # Define role-to-permission mappings
        role_permissions = {
            UserRoleChoices.SUPER_ADMIN: [
                'menu_view', 'menu_edit', 'orders_view', 'orders_manage',
                'customers_view', 'customers_manage', 'users_view', 'users_manage',
                'inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts',
                'reports_view', 'reports_export', 'settings_view', 'settings_edit',
                'qr_code_view', 'qr_code_manage', 'qr_generate', 'account_view', 'account_manage'
            ],
            UserRoleChoices.ADMIN: [
                'menu_view', 'menu_edit', 'orders_view', 'orders_manage',
                'customers_view', 'customers_manage', 'users_view', 'users_manage',
                'inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts',
                'reports_view', 'reports_export', 'settings_view', 'settings_edit',
                'qr_code_view', 'qr_code_manage', 'qr_generate', 'account_view', 'account_manage'
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

        # Get users to process
        if options['user']:
            users = CustomUser.objects.filter(username=options['user'])
        elif options['role']:
            users = CustomUser.objects.filter(role=options['role'])
        else:
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

        self.stdout.write(self.style.SUCCESS("Permission assignment completed!")) 