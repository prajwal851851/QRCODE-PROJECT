from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import CustomUser, Permission
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.core.exceptions import ValidationError
from django import forms
from django.contrib.auth.password_validation import validate_password
from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponseRedirect

# Custom Admin Site that redirects employees based on permissions
class RestaurantAdminSite(admin.AdminSite):
    site_header = 'Restaurant Management System'
    site_title = 'Restaurant Admin'
    index_title = 'Restaurant Management'
    
    # Helper method to extract permission IDs as strings
    def _get_permission_ids(self, user):
        """Get a list of permission IDs for a user"""
        try:
            return [str(p.id) for p in user.custom_permissions.all()]
        except Exception as e:
            print(f"Error getting permissions: {e}")
            return []
    
    def index(self, request, extra_context=None):
        # Print useful debugging info for every admin request
        print(f"\n{'='*50}\nADMIN REQUEST: {request.path}\nUser: {request.user.username}\nAuthenticated: {request.user.is_authenticated}\n")
        
        # Check if user is authenticated and has an employee attribute
        if not request.user.is_authenticated:
            print("User not authenticated")
            return super().index(request, extra_context)
            
        # Print important user info for debugging
        print(f"User Role: {getattr(request.user, 'role', 'unknown')}")
        print(f"Is Employee: {getattr(request.user, 'is_employee', False)}")
        print(f"Is Superuser: {getattr(request.user, 'is_superuser', False)}")
        
        # Get permissions using our helper method
        user_permissions = self._get_permission_ids(request.user)
        print(f"User Permissions: {user_permissions}")
        
        # For employee redirection
        if hasattr(request.user, 'is_employee') and request.user.is_employee:
            # Skip redirection only for superusers and admin roles
            if request.user.is_superuser or request.user.role in ['super_admin', 'admin']:
                print(f"Admin user: allowing dashboard access")
            else:
                print(f"Employee detected: {request.user.username} - checking redirect permissions")
                
                # Comprehensive check for order-related permissions (case insensitive)
                order_perms = ['orders_view', 'orders_manage', 'order_view', 'order_manage', 'view_order', 'manage_order']
                menu_perms = ['menu_view', 'menu_edit', 'menu_manage', 'view_menu', 'edit_menu', 'manage_menu']
                customer_perms = ['customers_view', 'customers_manage', 'customer_view', 'customer_manage']
                user_perms = ['users_view', 'users_manage', 'user_view', 'user_manage']
                qr_code_perms = ['qr_code_view', 'qr_code_manage', 'qr_generate']
                account_perms = ['account_view', 'account_manage']
                
                # Check permissions more flexibly (including variations in naming)
                has_order_perm = any(perm.lower() in [p.lower() for p in order_perms] for perm in user_permissions)
                has_menu_perm = any(perm.lower() in [p.lower() for p in menu_perms] for perm in user_permissions)
                has_customer_perm = any(perm.lower() in [p.lower() for p in customer_perms] for perm in user_permissions)
                has_user_perm = any(perm.lower() in [p.lower() for p in user_perms] for perm in user_permissions)
                has_qr_code_perm = any(perm.lower() in [p.lower() for p in qr_code_perms] for perm in user_permissions)
                has_account_perm = any(perm.lower() in [p.lower() for p in account_perms] for perm in user_permissions)
                
                print(f"Permission check results - Orders: {has_order_perm}, Menu: {has_menu_perm}, ")
                print(f"Customers: {has_customer_perm}, Users: {has_user_perm}, ")
                print(f"QR Codes: {has_qr_code_perm}, Accounts: {has_account_perm}")
                
                # Redirect based on permission priority
                if has_order_perm:
                    print(f"Redirecting {request.user.username} to orders section")
                    return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_order_changelist'))
                elif has_menu_perm:
                    print(f"Redirecting {request.user.username} to menu section")
                    return HttpResponseRedirect(reverse('restaurant_admin:our_menu_menuitem_changelist'))
                elif has_customer_perm:
                    print(f"Redirecting {request.user.username} to customer section")
                    return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_waitercall_changelist'))
                elif has_user_perm:
                    print(f"Redirecting {request.user.username} to user section")
                    return HttpResponseRedirect(reverse('restaurant_admin:UserRole_customuser_changelist'))
                elif has_qr_code_perm:
                    print(f"Redirecting {request.user.username} to QR code section")
                    return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_qrcode_changelist'))
                elif has_account_perm:
                    print(f"Redirecting {request.user.username} to account section")
                    # Use an appropriate URL for account management
                    # If you don't have a specific model for accounts yet, you could redirect to the dashboard
                    return HttpResponseRedirect(reverse('restaurant_admin:index'))
                else:
                    # If no specific permissions found, still redirect employees away from dashboard
                    print(f"No specific permissions found, redirecting to orders as fallback")
                    return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_order_changelist'))
        
        # If we get here, either:
        # 1. User is not an employee 
        # 2. User is admin/super_admin
        # 3. User doesn't have is_employee attribute
        # Allow access to admin dashboard
        return super().index(request, extra_context)


# Create instance of custom admin site
restaurant_admin_site = RestaurantAdminSite(name='restaurant_admin')

# Import models from other apps to register with our custom admin site
from django.apps import apps
try:
    # Menu app models
    from our_menu.models import MenuItem, Category, Discount, ExtraCharge
    print("Successfully registered menu models with restaurant admin site")
    
    # QR Generator app models
    from qrgenerator.models import Order, Table, WaiterCall, QRCode
    print("Successfully registered qrgenerator models with restaurant admin site")
    
    # Get the admin classes for each model if they exist
    # This preserves any custom admin configurations
    from django.contrib import admin as django_admin
    
    # Function to get admin class for a model if registered
    def get_admin_class(model):
        try:
            return django_admin.site._registry[model].__class__
        except KeyError:
            return admin.ModelAdmin
    
    # Register all models with our custom admin site
    restaurant_admin_site.register(Category, get_admin_class(Category))
    restaurant_admin_site.register(MenuItem, get_admin_class(MenuItem))
    restaurant_admin_site.register(Discount, get_admin_class(Discount))
    restaurant_admin_site.register(ExtraCharge, get_admin_class(ExtraCharge))
    restaurant_admin_site.register(Order, get_admin_class(Order))
    restaurant_admin_site.register(Table, get_admin_class(Table))
    restaurant_admin_site.register(WaiterCall, get_admin_class(WaiterCall))
    restaurant_admin_site.register(QRCode, get_admin_class(QRCode))
    
    print("Successfully registered models with custom admin site")
    
except Exception as e:
    print(f"Error registering models with custom admin site: {e}")
    # If there's an error, we'll still have the basic functionality


class CustomUserCreationForm(UserCreationForm):
    # Add custom fields for permissions by category
    menu_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Menu-related permissions'
    )
    
    order_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['orders_view', 'orders_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Order-related permissions'
    )
    
    customer_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['customers_view', 'customers_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Customer-related permissions'
    )
    
    qr_code_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['qr_code_view', 'qr_code_manage', 'qr_generate']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='QR code management permissions'
    )
    
    account_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Account management permissions'
    )
    
    user_management_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['users_view', 'users_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='User management permissions'
    )
    
    inventory_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Inventory management permissions'
    )
    
    other_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.exclude(
            id__in=['menu_view', 'menu_edit', 'orders_view', 'orders_manage', 
                   'customers_view', 'customers_manage', 'users_view', 'users_manage',
                   'qr_code_view', 'qr_code_manage', 'qr_generate',
                   'account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Other system permissions'
    )
    
    class Meta(UserCreationForm.Meta):
        model = CustomUser
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'status', 'is_employee')

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise ValidationError("Passwords don't match")
        try:
            validate_password(password2)
        except ValidationError as e:
            self.add_error('password2', e)
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = CustomUser
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'status', 'is_employee')

class CustomUserForm(UserChangeForm):
    # Add custom fields for permissions by category
    menu_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Menu-related permissions'
    )
    
    order_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['orders_view', 'orders_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Order-related permissions'
    )
    
    customer_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['customers_view', 'customers_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Customer-related permissions'
    )
    
    qr_code_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['qr_code_view', 'qr_code_manage', 'qr_generate']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='QR code management permissions'
    )
    
    account_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Account management permissions'
    )
    
    user_management_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['users_view', 'users_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='User management permissions'
    )
    
    inventory_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Inventory management permissions'
    )
    
    other_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.exclude(
            id__in=['menu_view', 'menu_edit', 'orders_view', 'orders_manage', 
                   'customers_view', 'customers_manage', 'users_view', 'users_manage',
                   'qr_code_view', 'qr_code_manage', 'qr_generate',
                   'account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Other system permissions'
    )
    
    class Meta(UserChangeForm.Meta):
        model = CustomUser
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'status', 'is_employee')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Pre-populate permissions if user exists
        if self.instance and self.instance.pk:
            user_perms = self.instance.custom_permissions.all()
            # Set initial values for each permission category
            self.fields['menu_permissions'].initial = [p for p in user_perms if p.id in ['menu_view', 'menu_edit']]
            self.fields['order_permissions'].initial = [p for p in user_perms if p.id in ['orders_view', 'orders_manage']]
            self.fields['customer_permissions'].initial = [p for p in user_perms if p.id in ['customers_view', 'customers_manage']]
            self.fields['user_management_permissions'].initial = [p for p in user_perms if p.id in ['users_view', 'users_manage']]
            self.fields['qr_code_permissions'].initial = [p for p in user_perms if p.id in ['qr_code_view', 'qr_code_manage', 'qr_generate']]
            self.fields['account_permissions'].initial = [p for p in user_perms if p.id in ['account_view', 'account_manage']]
            self.fields['inventory_permissions'].initial = [p for p in user_perms if p.id in ['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']]
            self.fields['other_permissions'].initial = [p for p in user_perms if p.id not in ['menu_view', 'menu_edit', 'orders_view', 'orders_manage', 
                   'customers_view', 'customers_manage', 'users_view', 'users_manage',
                   'qr_code_view', 'qr_code_manage', 'qr_generate',
                   'account_view', 'account_manage', 'inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']]

class CustomUserAdmin(UserAdmin):
    form = CustomUserForm
    add_form = CustomUserCreationForm
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'status', 'is_employee', 'get_permissions')
    list_filter = ('role', 'status', 'is_employee', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    readonly_fields = ('last_login', 'date_joined')
    
    def get_permissions(self, obj):
        if obj.role == 'super_admin':
            return "All Permissions"
        if obj.custom_permissions.exists():
            return f"{obj.custom_permissions.count()} permissions"
        return "No permissions"
    get_permissions.short_description = 'Permissions'
    
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name')}),
        (_('Role & Status'), {
            'fields': ('role', 'status', 'is_employee'),
            'description': 'User role determines default permissions.',
        }),
        (_('Permissions'), {
            'classes': ('collapse',),
            'fields': ('is_active', 'is_staff', 'is_superuser'),
            'description': 'System permissions (different from functional permissions below).',
        }),
        (_('Menu Permissions'), {
            'fields': ('menu_permissions',),
            'description': 'Permissions related to menu management.',
        }),
        (_('Order Permissions'), {
            'fields': ('order_permissions',),
            'description': 'Permissions related to order management.',
        }),
        (_('Customer Permissions'), {
            'fields': ('customer_permissions',),
            'description': 'Permissions related to customer management.',
        }),
        (_('QR Code Permissions'), {
            'fields': ('qr_code_permissions',),
            'description': 'Permissions related to QR code management.',
        }),
        (_('Account Permissions'), {
            'fields': ('account_permissions',),
            'description': 'Permissions related to account management.',       
        }),
        (_('User Management Permissions'), {
            'fields': ('user_management_permissions',),
            'description': 'Permissions related to user management.',
        }),
        (_('Inventory Permissions'), {
            'fields': ('inventory_permissions',),
            'description': 'Permissions related to inventory management.',
        }),
        (_('Other Permissions'), {
            'fields': ('other_permissions',),
            'description': 'Other system permissions.',
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'status', 'is_employee'),
        }),
        (_('Menu Permissions'), {
            'classes': ('wide',),
            'fields': ('menu_permissions',),
        }),
        (_('Order Permissions'), {
            'classes': ('wide',),
            'fields': ('order_permissions',),
        }),
        (_('Customer Permissions'), {
            'classes': ('wide',),
            'fields': ('customer_permissions',),
        }),
        (_('QR Code Permissions'), {
            'classes': ('wide',),
            'fields': ('qr_code_permissions',),
        }),
        (_('Account Permissions'), {
            'classes': ('wide',),
            'fields': ('account_permissions',),
        }),
        (_('User Management'), {
            'classes': ('wide',),
            'fields': ('user_management_permissions',),
        }),
        (_('Inventory Permissions'), {
            'classes': ('wide',),
            'fields': ('inventory_permissions',),
        }),
        (_('Other Permissions'), {
            'classes': ('wide',),
            'fields': ('other_permissions',),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')
    
    def save_model(self, request, obj, form, change):
        # Save the user instance first
        super().save_model(request, obj, form, change)
        
        # Process the custom permission fields we added to the form
        # This collects all permissions selected across all categories
        all_selected_permissions = set()
        
        # List of custom permission fields we added to the form
        permission_fields = [
            'menu_permissions', 
            'order_permissions', 
            'customer_permissions',
            'user_management_permissions',
            'qr_code_permissions',
            'account_permissions',
            'inventory_permissions',
            'other_permissions'
        ]
        
        # Get permissions from each field and add to our set
        for field_name in permission_fields:
            if field_name in form.cleaned_data and form.cleaned_data[field_name]:
                # Add these permissions to our collection
                all_selected_permissions.update(form.cleaned_data[field_name])
        
        # If we have any permissions selected, assign them to the user
        if all_selected_permissions:
            # Convert back to a list for debugging
            perms_list = list(all_selected_permissions)
            # Use a direct database query to ensure clean assignment
            obj.custom_permissions.set(perms_list)
            print(f"Admin UI: Set {len(perms_list)} custom permissions for {obj.username}")
            # Debug: Print the permission IDs to verify
            print(f"Permission IDs: {[p.id for p in perms_list]}")
            return
        
        # No custom permissions explicitly selected, use role defaults if no existing permissions
        if not obj.custom_permissions.exists() or obj.role == 'super_admin':
            print(f"Using default permissions for role {obj.role}")
            default_permissions_map = {
                'super_admin': Permission.objects.all(),
                'admin': Permission.objects.exclude(id='users_manage'),
                'menu_manager': Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
                'order_manager': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'orders_manage']),
                'customer_support': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'customers_view']),
                'qr_code_manager': Permission.objects.filter(id__in=['menu_view', 'qr_code_view', 'qr_code_manage']),
                'account_manager': Permission.objects.filter(id__in=['menu_view', 'customers_view', 'account_view', 'account_manage']),
                'inventory_manager': Permission.objects.filter(id__in=['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']),
            }
            
            # Get permissions based on role
            role_based_perms = default_permissions_map.get(obj.role, Permission.objects.none())
            # Use direct set operation to ensure clean assignment
            obj.custom_permissions.set(role_based_perms)
            print(f"Set {role_based_perms.count()} default permissions for {obj.username}")
        
        # For super_admin, always ensure they have all permissions
        if obj.role == 'super_admin':
            obj.custom_permissions.set(Permission.objects.all())
            print(f"Ensured super_admin {obj.username} has all permissions")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('custom_permissions')

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None:  # If creating new user
            form.base_fields['role'].initial = 'menu_manager'
            form.base_fields['status'].initial = 'active'
            form.base_fields['is_employee'].initial = True
        return form

class PermissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description', 'get_assigned_users_count')
    search_fields = ('id', 'name', 'description')
    ordering = ('id',)
    readonly_fields = ('id',)
    fieldsets = (
        (None, {
            'fields': ('id', 'name', 'description'),
            'description': 'Permission details. ID is used internally by the system.',
        }),
        (_('Assigned Users'), {
            'fields': ('users',),
            'description': 'Users who have this permission assigned.',
        }),
    )
    filter_horizontal = ('users',)
    
    def get_assigned_users_count(self, obj):
        count = obj.users.count()
        return f"{count} user{'s' if count != 1 else ''}"
    get_assigned_users_count.short_description = 'Assigned to'

# Register with the default admin site for backward compatibility
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Permission, PermissionAdmin)

# Register with our custom admin site
restaurant_admin_site.register(CustomUser, CustomUserAdmin)
restaurant_admin_site.register(Permission, PermissionAdmin)
