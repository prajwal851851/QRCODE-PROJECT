from rest_framework import serializers
from .models import CustomUser, Permission, UserRoleChoices, UserStatus

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'description']

class UserSerializer(serializers.ModelSerializer):
    # This field is for displaying permissions in GET requests.
    # The key 'permissions' matches what the frontend expects (e.g., selectedUser.permissions).
    permissions = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    created_by = serializers.SerializerMethodField()
    created_by_id = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    
    # Add a write field to accept permissions from frontend
    permissions_data = serializers.DictField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'status', 
                 'last_login', 'permissions', 'permissions_data', 'created_at', 'password', 
                 'confirm_password', 'is_employee', 'is_staff', 'created_by', 'created_by_id', 'created_by_username']
        read_only_fields = ['id', 'last_login', 'created_at', 'created_by', 
                         'created_by_id', 'created_by_username']

    def get_permissions(self, obj):
        return {str(perm.id): True for perm in obj.custom_permissions.all()}

    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.id
        return None

    def get_created_by_id(self, obj):
        if obj.created_by:
            return obj.created_by.id
        return None

    def get_created_by_username(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None

    def validate(self, data):
        # Password validation
        if 'password' in data:
            if not data.get('confirm_password'):
                raise serializers.ValidationError({"confirm_password": "Please confirm your password."})
            if data['password'] != data['confirm_password']:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
            
            # Validate password strength
            try:
                from django.contrib.auth.password_validation import validate_password
                validate_password(data['password'])
            except Exception as e:
                raise serializers.ValidationError({"password": list(e.messages)})

        # Prevent username change after creation
        if self.instance and 'username' in data and self.instance.username != data['username']:
            raise serializers.ValidationError({"username": "Username cannot be changed after creation."})
        
        # Prevent role changes for employees
        if self.instance and self.instance.is_employee and 'role' in data and self.instance.role != data['role']:
            raise serializers.ValidationError({"role": "Employee roles cannot be changed."})
        
        # Prevent status changes for employees
        if self.instance and self.instance.is_employee and 'status' in data and self.instance.status != data['status']:
            raise serializers.ValidationError({"status": "Employee status cannot be changed."})
        
        return data

    def create(self, validated_data):
        # Remove confirm_password as it's not a model field
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)
        
        # Extract permissions data but don't try to save it directly
        permissions_data = validated_data.pop('permissions_data', {})
        
        # Get the creator (from context) - this is the authenticated user making the request
        creator = self.context.get('request').user if self.context.get('request') else None
        print(f"Creator user for new user: {creator.username if creator else 'None'} (ID: {creator.id if creator else 'None'})")

        # Only set super_admin role for the first user in the system
        if not CustomUser.objects.filter(role=UserRoleChoices.SUPER_ADMIN).exists():
            validated_data['role'] = UserRoleChoices.SUPER_ADMIN

        # --- FORCE is_employee False for new admins and super_admins ---
        if validated_data.get('role') in [UserRoleChoices.ADMIN, UserRoleChoices.SUPER_ADMIN]:
            validated_data['is_employee'] = False
        # --- END FORCE ---

        # Create user instance
        user = CustomUser(**validated_data)
        
        # Set password if provided
        if password:
            user.set_password(password)
        
        # Ensure user is active
        user.is_active = True
        user.status = 'active'
        
        # Set the created_by field to the authenticated user if not specified
        if creator and creator.is_authenticated and not user.created_by:
            user.created_by = creator
            print(f"Setting created_by to {creator.username} (ID: {creator.id})")
        
        # --- FORCE is_employee False for new admins and super_admins after instance creation ---
        if user.role in [UserRoleChoices.ADMIN, UserRoleChoices.SUPER_ADMIN]:
            user.is_employee = False
        # --- END FORCE ---

        # Save user first to get an ID
        user.save()
        
        # Process permissions if provided
        if permissions_data:
            # Get permission IDs that are set to True
            permission_ids = [pid for pid, value in permissions_data.items() if value and pid]
            if permission_ids:
                permissions_to_set = Permission.objects.filter(id__in=permission_ids)
                user.custom_permissions.set(permissions_to_set)
                print(f"Set {len(permission_ids)} permissions for new user {user.username}")
        
        # For super_admin role, always set all permissions
        if user.role == 'super_admin':
            user.custom_permissions.set(Permission.objects.all())
        # For other roles, set default permissions if none specified
        elif not user.custom_permissions.exists():
            default_permissions_map = {
                'admin': Permission.objects.exclude(id='users_manage'),
                'menu_manager': Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
                'order_manager': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'orders_manage']),
                'customer_support': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'customers_view']),
                'inventory_manager': Permission.objects.filter(id__in=['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']),
            }
            role_based_perms = default_permissions_map.get(user.role, Permission.objects.none())
            user.custom_permissions.set(role_based_perms)
        
        return user

    def update(self, instance, validated_data):
        # Remove confirm_password if present
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)

        # Extract permissions data separately
        permissions_data = validated_data.pop('permissions_data', None)

        # Prevent credential changes for employees
        if instance.is_employee:
            if 'email' in validated_data:
                validated_data.pop('email')
            if 'password' in validated_data:
                validated_data.pop('password')

        # Update instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update password if provided
        if password:
            instance.set_password(password)

        # Save the instance
        instance.save()
        
        # Process permissions if provided
        if permissions_data:
            # Get permission IDs that are set to True
            permission_ids = [pid for pid, value in permissions_data.items() if value and pid]
            
            if permission_ids:
                permissions_to_set = Permission.objects.filter(id__in=permission_ids)
                if permissions_to_set.exists():
                    # Directly update the many-to-many relationship
                    instance.custom_permissions.set(permissions_to_set)
                    print(f"Updated permissions for {instance.username}: {permission_ids}")
        
        # For super_admin, always ensure they have all permissions
        if instance.role == 'super_admin':
            instance.custom_permissions.set(Permission.objects.all())
            
        # If role changed and no permissions were explicitly provided, reset to role defaults
        elif 'role' in validated_data and not permissions_data:
            default_permissions_map = {
                'admin': Permission.objects.exclude(id='users_manage'),
                'menu_manager': Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
                'order_manager': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'orders_manage']),
                'customer_support': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'customers_view']),
                'inventory_manager': Permission.objects.filter(id__in=['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']),
            }
            role_based_perms = default_permissions_map.get(instance.role, Permission.objects.none())
            instance.custom_permissions.set(role_based_perms)
        
        return instance

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
