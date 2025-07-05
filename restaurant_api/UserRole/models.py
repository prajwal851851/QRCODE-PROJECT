from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.apps import apps

class UserRoleChoices(models.TextChoices):
    SUPER_ADMIN = 'super_admin', 'Super Admin'
    ADMIN = 'admin', 'Admin'
    MENU_MANAGER = 'menu_manager', 'Menu Manager'
    ORDER_MANAGER = 'order_manager', 'Order Manager'
    CUSTOMER_SUPPORT = 'customer_support', 'Customer Support'
    QR_CODE_MANAGER = 'qr_code_manager', 'QR-Code Manager'
    ACCOUNT_MANAGER = 'account_manager', 'Account Manager'
    INVENTORY_MANAGER = 'inventory_manager', 'Inventory Manager'

class UserStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    PENDING = 'pending', 'Pending'

class BaseModel(models.Model):
    created_by = models.ForeignKey('UserRole.CustomUser', on_delete=models.SET_NULL, null=True, related_name='%(class)s_created')
    admin = models.ForeignKey('UserRole.CustomUser', on_delete=models.CASCADE, null=True, related_name='%(class)s_admin')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # If this is a new object and admin is not set, set it to the creator's admin
        if not self.pk and not self.admin and self.created_by:
            if self.created_by.role == 'admin':
                self.admin = self.created_by
            elif self.created_by.created_by and self.created_by.created_by.role == 'admin':
                self.admin = self.created_by.created_by
        super().save(*args, **kwargs)

    @classmethod
    def get_admin_data(cls, admin):
        """Get all data associated with an admin"""
        return cls.objects.filter(
            models.Q(created_by=admin) | models.Q(admin=admin)
        )

    @classmethod
    def get_employee_data(cls, employee):
        """Get all data that an employee can access"""
        if employee.is_employee and employee.created_by:
            admin = employee.created_by
            return cls.get_admin_data(admin)
        return cls.objects.none()

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=UserRoleChoices.choices, default=UserRoleChoices.MENU_MANAGER)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    created_at = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    is_employee = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=True)
    created_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='created_users')

    def save(self, *args, **kwargs):
        # Store the original role to check if it changed
        original_role = None
        if self.pk:
            try:
                original_user = CustomUser.objects.get(pk=self.pk)
                original_role = original_user.role
            except CustomUser.DoesNotExist:
                pass
        
        # Only set super_admin role for the first user in the system
        if not self.pk and not CustomUser.objects.exists():
            self.role = UserRoleChoices.SUPER_ADMIN
        # Map status to is_active for Django authentication
        self.is_active = self.status == UserStatus.ACTIVE
        # If this is a new user and created_by is not set, set it to the current user
        if not self.pk and not self.created_by and hasattr(self, '_current_user'):
            self.created_by = self._current_user
        # Set is_employee and is_staff True for admin-created users, but NOT if the new user is an admin
        if (
            not self.pk
            and self.created_by
            and self.created_by.role == UserRoleChoices.ADMIN
            and self.role != UserRoleChoices.ADMIN
        ):
            self.is_employee = True
            self.is_staff = True
        # --- FORCE is_employee False for admins and super_admins ---
        if self.role in [UserRoleChoices.ADMIN, UserRoleChoices.SUPER_ADMIN]:
            self.is_employee = False
        # --- END FORCE ---
        super().save(*args, **kwargs)
        
        # Assign permissions based on role (only if role changed or user is new)
        if not self.pk or original_role != self.role:
            self._assign_role_permissions()
    
    def _assign_role_permissions(self):
        """Assign permissions based on user role"""
        try:
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
            
            # Get permissions for this role
            role_perms = role_permissions.get(self.role, [])
            
            if role_perms:
                # Get permission objects
                permissions = Permission.objects.filter(id__in=role_perms)
                
                # Clear existing permissions and assign new ones
                self.custom_permissions.clear()
                self.custom_permissions.add(*permissions)
                
                print(f"Assigned {permissions.count()} permissions to user {self.username} (Role: {self.role})")
        except Exception as e:
            print(f"Error assigning permissions to user {self.username}: {str(e)}")

    def __str__(self):
        return f"{self.username} ({self.email})"

    def has_permission(self, permission_id):
        """Check if user has a specific permission"""
        if self.role == UserRoleChoices.SUPER_ADMIN:
            return True
        return self.custom_permissions.filter(id=permission_id).exists()

    def is_admin_or_super_admin(self):
        """Check if user is an admin or super admin"""
        return self.role in [UserRoleChoices.SUPER_ADMIN, UserRoleChoices.ADMIN]

    def can_modify_credentials(self):
        """Check if user can modify their own credentials"""
        if self.role == UserRoleChoices.SUPER_ADMIN:
            return True
        return self.is_admin_or_super_admin() and not self.is_employee

    def get_admin_data(self):
        """Get all data associated with this admin"""
        if self.role == 'admin':
            data = {}
            # Get all models that inherit from BaseModel
            for model in apps.get_models():
                if issubclass(model, BaseModel) and model != BaseModel:
                    data[model.__name__.lower()] = model.get_admin_data(self)
            return data
        return None

    def get_employee_data(self):
        """Get all data that this employee can access"""
        if self.is_employee and self.created_by:
            admin = self.created_by
            return admin.get_admin_data()
        return None

    class Meta:
        db_table = 'custom_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

class Permission(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    users = models.ManyToManyField('CustomUser', related_name='custom_permissions', blank=True)

    class Meta:
        db_table = 'permission'

    def __str__(self):
        return self.name
