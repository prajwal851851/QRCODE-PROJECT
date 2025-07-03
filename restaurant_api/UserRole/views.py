from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .models import CustomUser, Permission, UserStatus
from .serializers import UserSerializer, LoginSerializer, PermissionSerializer
from .permissions import IsAdminOrSuperAdmin, IsEmployeeOrAdmin, CanModifyCredentials
from rest_framework import serializers
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model



class LoginView(APIView):
    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            # First check if user exists before attempting authentication
            try:
                user_obj = CustomUser.objects.get(email=email)
                
                # Try authenticating with different methods
                
                # Method 1: Using EmailBackend
                user = authenticate(request, email=email, password=password)
                
                # Method 2: Using ModelBackend with username
                if not user:
                    user = authenticate(request, username=user_obj.username, password=password)
                
                # Method 3: Direct password check
                # This is crucial for users created through Django admin
                if not user and user_obj.check_password(password):
                    user = user_obj
                    
                # If all methods fail but user exists, it's a password issue
                if not user:
                    return Response({"error": "Invalid password. Please check your password and try again."}, 
                                  status=status.HTTP_401_UNAUTHORIZED)
                    
            except CustomUser.DoesNotExist:
                # User doesn't exist with this email
                return Response({"error": f"No user found with email: {email}."}, 
                              status=status.HTTP_401_UNAUTHORIZED)

            if user:
                # Check if user is active
                if not user.is_active:
                    return Response({"error": f"User account is not active (status: {user.status})"}, 
                                  status=status.HTTP_401_UNAUTHORIZED)

                # Ensure user has proper permissions based on role
                if user.role == 'super_admin':
                    user.custom_permissions.set(Permission.objects.all())
                else:
                    default_permissions_map = {
                        'admin': Permission.objects.exclude(id='users_manage'),
                        'menu_manager': Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
                        'order_manager': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'orders_manage']),
                        'customer_support': Permission.objects.filter(id__in=['menu_view', 'orders_view', 'customers_view']),
                        'qr_code_manager': Permission.objects.filter(id__in=['menu_view', 'qr_code_view', 'qr_code_manage', 'qr_generate']),
                        'account_manager': Permission.objects.filter(id__in=['menu_view', 'customers_view', 'account_view', 'account_manage']),
                        'inventory_manager': Permission.objects.filter(id__in=['inventory_view', 'inventory_edit', 'inventory_manage', 'inventory_alerts']),
                    }
                    role_based_perms = default_permissions_map.get(user.role, Permission.objects.none())
                    user.custom_permissions.set(role_based_perms)

                refresh = RefreshToken.for_user(user)
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])

                # Add role and permissions to response
                user_data = UserSerializer(user).data
                user_data['is_admin_or_super_admin'] = user.is_admin_or_super_admin()
                user_data['permissions'] = {perm.id: True for perm in user.custom_permissions.all()}
                
                # Check if user is an employee (not admin or super_admin) and determine redirect URL
                redirect_url = None
                if user.is_employee and user.role not in ['super_admin', 'admin']:
                    # Get user permissions
                    user_permissions = [str(p.id) for p in user.custom_permissions.all()]
                    
                    # Define permission groups
                    order_perms = ['orders_view', 'orders_manage', 'order_view', 'order_manage', 'view_order', 'manage_order']
                    menu_perms = ['menu_view', 'menu_edit', 'menu_manage', 'view_menu', 'edit_menu', 'manage_menu']
                    customer_perms = ['customers_view', 'customers_manage', 'customer_view', 'customer_manage']
                    user_perms = ['users_view', 'users_manage', 'user_view', 'user_manage']
                    
                    # Check permissions
                    has_order_perm = any(perm in order_perms for perm in user_permissions)
                    has_menu_perm = any(perm in menu_perms for perm in user_permissions)
                    has_customer_perm = any(perm in customer_perms for perm in user_permissions)
                    has_user_perm = any(perm in user_perms for perm in user_permissions)
                    
                    # Determine redirect URL based on permissions
                    if has_order_perm:
                        redirect_url = '/restaurant/qrgenerator/order/'
                    elif has_menu_perm:
                        redirect_url = '/restaurant/our_menu/menuitem/'
                    elif has_customer_perm:
                        redirect_url = '/restaurant/qrgenerator/waitercall/'
                    elif has_user_perm:
                        redirect_url = '/restaurant/UserRole/customuser/'
                    else:
                        # Default fallback if no specific permission
                        redirect_url = '/restaurant/qrgenerator/order/'

                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': user_data,
                    'redirect_url': redirect_url  # Include redirect URL in response
                })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Ensure super admin has all permissions
            if request.user.role == 'super_admin':
                request.user.custom_permissions.set(Permission.objects.all())

            serializer = UserSerializer(request.user)
            data = serializer.data
            data['is_admin_or_super_admin'] = request.user.is_admin_or_super_admin()
            data['permissions'] = {perm.id: True for perm in request.user.custom_permissions.all()}
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class UserListCreateView(generics.ListCreateAPIView):
    queryset = CustomUser.objects.all().prefetch_related('custom_permissions')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        try:
            current_user = self.request.user
            print(f"UserListCreateView - Current user: {current_user.username} (ID: {current_user.id}) with role: {current_user.role}")
            
            # Start with base query
            from django.db.models import Q
            base_query = Q()
            
            # For super_admin role:
            if current_user.role == 'super_admin':
                # Super admin can see:
                # 1. Themselves
                # 2. Users they created (but not other super_admins)
                base_query = Q(id=current_user.id) | (Q(created_by=current_user) & ~Q(role='super_admin'))
            # For admin role:
            elif current_user.role == 'admin':
                # Admin can see:
                # 1. Themselves
                # 2. Non-admin users they created
                base_query = Q(id=current_user.id) | (Q(created_by=current_user) & ~Q(role__in=['admin', 'super_admin']))
            # For employee role:
            else:
                # Employee can only see their own profile
                base_query = Q(id=current_user.id)
            
            # Apply the query and prefetch related permissions
            queryset = CustomUser.objects.filter(base_query).prefetch_related('custom_permissions')
            return queryset
            
        except Exception as e:
            print(f"Error in UserListCreateView get_queryset: {str(e)}")
            raise PermissionDenied(str(e))

    def perform_create(self, serializer):
        try:
            # Set the current user as created_by
            user = serializer.save(created_by=self.request.user)
            # If the creator is an admin, set is_employee and is_staff to True for non-admin, non-superadmin users only
            if self.request.user.role == 'admin' and user.role not in ['admin', 'super_admin']:
                user.is_employee = True
                user.is_staff = True
                user.save(update_fields=['is_employee', 'is_staff'])
        except Exception as e:
            print(f"Error in perform_create: {str(e)}")
            raise PermissionDenied(str(e))

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.set_cookie('csrftoken', request.META.get('CSRF_COOKIE', ''), samesite='Lax')
        return response

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.set_cookie('csrftoken', request.META.get('CSRF_COOKIE', ''), samesite='Lax')
        return response

class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all().prefetch_related('custom_permissions')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin | CanModifyCredentials]

    def get_queryset(self):
        try:
            current_user = self.request.user
            
            # If user is super_admin, show all users
            if current_user.role == 'super_admin':
                return CustomUser.objects.all().prefetch_related('custom_permissions')
                
            # If user is admin, only show employees they created
            if current_user.role == 'admin':
                return CustomUser.objects.filter(created_by=current_user).prefetch_related('custom_permissions')
                
            # If user is employee, only show their own profile
            return CustomUser.objects.filter(id=current_user.id).prefetch_related('custom_permissions')
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            raise PermissionDenied(str(e))

    def get_object(self):
        """Override get_object to enforce access control at the object level"""
        obj = super().get_object()
        current_user = self.request.user
        
        # Super admins can access any user
        if current_user.role == 'super_admin':
            return obj
            
        # Admins can only access users they created or themselves - STRICTLY ENFORCED
        if current_user.role == 'admin':
            # Admins can only access:
            # 1. Their own user record
            # 2. Non-admin users they created
            if obj.id == current_user.id:
                return obj
            # Block access to any admin or super_admin
            if obj.role in ['admin', 'super_admin']:
                print(f"Access DENIED: Admin {current_user.username} attempted to access admin/super_admin {obj.username}")
                raise PermissionDenied("You cannot view or edit other admin users.")
            # Allow only if created_by is current admin
            if obj.created_by and obj.created_by.id == current_user.id:
                return obj
            print(f"Access DENIED: Admin {current_user.username} attempted to access user {obj.username} not created by them")
            raise PermissionDenied("You can only view or edit users you have created.")
            
        # Regular users can only access their own profile
        elif obj.id != current_user.id:
            print(f"Access denied: User {current_user.username} attempted to access another user {obj.username}")
            raise PermissionDenied("You can only view or edit your own profile.")
            
        return obj

    def perform_update(self, serializer):
        try:
            instance = serializer.instance
            update_kwargs = {}
            
            # Handle permission restrictions for non-super admins
            if self.request.user.role != 'super_admin':
                # Only super admin can modify credentials
                if 'email' in self.request.data and self.request.data.get('email') != instance.email:
                    raise serializers.ValidationError({"detail": "Only super admins can change user emails."})
                if 'password' in self.request.data and self.request.data.get('password'):
                    raise serializers.ValidationError({"detail": "Only super admins can change user passwords."})
            
            # Handle permissions from frontend
            if 'permissions' in self.request.data:
                permissions_data = self.request.data.get('permissions', {})
                update_kwargs['permissions_data'] = permissions_data
            
            # Update the user
            instance = serializer.save(**update_kwargs)
            return instance
        except Exception as e:
            print(f"Error in perform_update: {str(e)}")
            raise PermissionDenied(str(e))

class PermissionListView(generics.ListAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin | IsEmployeeOrAdmin]
    required_permission = 'users_view'


class MyUsersView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    
    def get_queryset(self):
        try:
            current_user = self.request.user
            print(f"MyUsersView - Current user: {current_user.username} (ID: {current_user.id}) with role: {current_user.role}")
            
            # Debug: Print all users and their created_by relationships
            all_users = CustomUser.objects.all()
            print(f"Total users in system: {all_users.count()}")
            for user in all_users:
                creator_id = user.created_by_id if user.created_by_id else 'None'
                creator_name = user.created_by.username if user.created_by else 'None'
                print(f"User {user.username} (ID: {user.id}, Role: {user.role}) - Created by: {creator_name} (ID: {creator_id})")
            
            # Start with base query
            from django.db.models import Q
            base_query = Q()
            
            # For super_admin role:
            if current_user.role == 'super_admin':
                # Super admin can see:
                # 1. Themselves
                # 2. Users they created (but not other super_admins)
                base_query = Q(id=current_user.id) | (Q(created_by=current_user) & ~Q(role='super_admin'))
                print(f"Super admin {current_user.username} sees self and users they created (excluding other super_admins)")
            # For admin role:
            elif current_user.role == 'admin':
                # Admin can see:
                # 1. Themselves
                # 2. Non-admin users they created
                base_query = Q(id=current_user.id) | (Q(created_by=current_user) & ~Q(role__in=['admin', 'super_admin']))
                print(f"Admin {current_user.username} sees self and non-admin users they created")
            
            # Apply the query and prefetch related permissions
            queryset = CustomUser.objects.filter(base_query).prefetch_related('custom_permissions')
            print(f"Final queryset count: {queryset.count()}")
            
            return queryset
            
        except Exception as e:
            print(f"Error in MyUsersView get_queryset: {str(e)}")
            raise PermissionDenied(str(e))
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.set_cookie('csrftoken', request.META.get('CSRF_COOKIE', ''), samesite='Lax')
        return response


class RoleDescriptionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Return descriptions for all user roles"""
        role_descriptions = {
            'super_admin': {
                'title': 'Super Admin',
                'description': 'Full access to all features and settings. Can manage other users and assign permissions.',
                'permissions': 'All permissions enabled'
            },
            'admin': {
                'title': 'Admin',
                'description': 'Administrative access to most features but with some restrictions.',
                'permissions': 'Can view users, manage orders, and edit menus'
            },
            'menu_manager': {
                'title': 'Menu Manager',
                'description': 'Manages restaurant menu items, categories, and availability.',
                'permissions': 'Menu editing, QR code generation'
            },
            'order_manager': {
                'title': 'Order Manager',
                'description': 'Handles orders, tracks status, and manages table assignments.',
                'permissions': 'Order management, table management'
            },
            'customer_support': {
                'title': 'Customer Support',
                'description': 'Provides customer assistance and handles basic inquiries.',
                'permissions': 'View customer data, orders and menu items'
            },
            'qr_code_manager': {
                'title': 'QR-Code Manager',
                'description': 'Manages QR codes for tables and menu items throughout the restaurant.',
                'permissions': 'QR code generation, editing, and management'
            },
            'account_manager': {
                'title': 'Account Manager',
                'description': 'Manages customer accounts and handles account-related inquiries.',
                'permissions': 'View and manage customer accounts and related data'
            },
            'inventory_manager': {
                'title': 'Inventory Manager',
                'description': 'Manages inventory items, stock levels, suppliers, and inventory alerts.',
                'permissions': 'View, edit, and manage inventory items, stock operations, and alerts'
            }
        }
        return Response(role_descriptions)
