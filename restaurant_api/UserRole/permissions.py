from rest_framework import permissions
from .models import Permission, CustomUser
from django.db import models

class HasRequiredPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Super admin has all permissions
        if request.user.role == 'super_admin':
            return True
            
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return True
            
        return request.user.has_permission(required_permission)

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'super_admin'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """Permission check for admin or super admin with strict access controls."""
    def has_permission(self, request, view):
        print(f"IsAdminOrSuperAdmin - Checking if user {request.user.username} (role: {request.user.role}) has admin permissions")
        
        # Check if user has a valid role
        if not hasattr(request.user, 'role'):
            print(f"User {request.user.username} has no role attribute")
            return False
            
        # Super admin has all permissions
        if request.user.role == 'super_admin':
            print(f"User {request.user.username} is super_admin, granting access")
            return True
            
        # Admin users have permission but with restrictions
        if request.user.role == 'admin':
            print(f"User {request.user.username} is admin, checking specific access permissions")
            
            # If it's a list/create view, restrict to only seeing their own created users
            if view.__class__.__name__ in ['UserListCreateView', 'MyUsersView']:
                print(f"Admin {request.user.username} granted access to user list with filtering")
                return True
                
            # For detail views (retrieve/update/destroy), check object permission
            if view.__class__.__name__ == 'UserRetrieveUpdateDestroyView':
                # Object permission will be checked in has_object_permission
                print(f"Admin {request.user.username} accessing detail view, will check object permission")
                return True
                
            return True
            
        print(f"User {request.user.username} with role {request.user.role} denied admin access")
        return False
        
    def has_object_permission(self, request, view, obj):
        print(f"IsAdminOrSuperAdmin - Checking object permission for user {request.user.username} (role: {request.user.role})")
        
        # Super admin has all permissions
        if request.user.role == 'super_admin':
            print(f"Object permission granted to super_admin {request.user.username}")
            return True
            
        # Admin users can only access their own profile or users they created
        if request.user.role == 'admin':
            # If accessing own profile
            if hasattr(obj, 'id') and obj.id == request.user.id:
                print(f"Admin {request.user.username} accessing their own profile, granted")
                return True
                
            # If accessing user they created - STRICT CHECK
            if hasattr(obj, 'created_by') and obj.created_by and obj.created_by.id == request.user.id:
                print(f"Admin {request.user.username} accessing user they created, granted")
                return True
                
            # DENY ACCESS to other admin-created users
            if hasattr(obj, 'role'):
                if obj.role == 'admin':
                    print(f"Admin {request.user.username} DENIED access to another admin {obj.username}")
                    return False
                    
                if hasattr(obj, 'created_by') and obj.created_by and obj.created_by.role == 'admin' and obj.created_by.id != request.user.id:
                    print(f"Admin {request.user.username} DENIED access to user created by another admin")
                    return False
            
            print(f"Admin {request.user.username} denied access to object {obj}")
            return False
            
        print(f"User {request.user.username} with role {request.user.role} denied object permission")
        return False

class CanModifyCredentials(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Debug logging
        print(f"Checking credential modification for user: {request.user}")
        print(f"User role: {request.user.role}")
        print(f"Object: {obj}")
        
        # Allow if user is modifying their own credentials and has permission
        if request.user == obj:
            can_modify = request.user.can_modify_credentials()
            print(f"User modifying own credentials, can_modify: {can_modify}")
            return can_modify
        # Allow if user is admin/super_admin modifying employee credentials
        is_admin = request.user.is_admin_or_super_admin()
        is_employee = obj.is_employee
        print(f"User is admin: {is_admin}, object is employee: {is_employee}")
        return is_admin and is_employee

class IsEmployeeOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            print("User is not authenticated")
            return False
            
        # Debug logging
        print(f"Checking employee/admin permissions for user: {request.user}")
        print(f"User role: {request.user.role}")
        print(f"Is admin or super admin: {request.user.is_admin_or_super_admin()}")
            
        # Allow if user is admin/super_admin
        if request.user.is_admin_or_super_admin():
            print("User is admin/super_admin - granting permission")
            return True
            
        # Allow if user is employee and has required permission
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            print("No required permission specified - granting access")
            return True
            
        # Check if user has the required permission
        has_perm = request.user.is_employee and request.user.has_permission(required_permission)
        print(f"User is employee: {request.user.is_employee}, has required permission: {has_perm}")
        
        # If user has permission, ensure they can only access their admin's data
        if has_perm and hasattr(view, 'get_queryset'):
            # Get the admin who created this employee
            admin = request.user.created_by
            if admin:
                # Filter queryset to only show data associated with the admin
                # This includes both data created by the admin and data where admin is the owner
                view.queryset = view.queryset.filter(
                    models.Q(created_by=admin) | models.Q(admin=admin)
                )
                print(f"Filtered queryset for employee {request.user.username} to show admin {admin.username}'s data")
        
        return has_perm

    def has_object_permission(self, request, view, obj):
        # Super admin can access everything
        if request.user.role == 'super_admin':
            return True
            
        # Admin can access their own data and data they created
        if request.user.role == 'admin':
            return obj.created_by == request.user or obj.admin == request.user or obj.id == request.user.id
            
        # Employee can only access data created by their admin or where admin is the owner
        if request.user.is_employee:
            admin = request.user.created_by
            if admin:
                return obj.created_by == admin or obj.admin == admin
            
        return False
