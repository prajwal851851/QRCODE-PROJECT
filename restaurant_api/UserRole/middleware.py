from django.shortcuts import redirect
from django.urls import reverse, resolve
from django.http import HttpResponseRedirect
import logging

# Get a logger for debugging
logger = logging.getLogger(__name__)

class EmployeeRedirectMiddleware:
    """
    Middleware to redirect employees to their designated sections based on permissions.
    Prevents employees from accessing the main admin dashboard.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        logger.info("EmployeeRedirectMiddleware initialized")
    
    def _get_permission_ids(self, user):
        """Get a list of permission IDs for a user (consistent with admin site)"""
        try:
            return [str(p.id) for p in user.custom_permissions.all()]
        except Exception as e:
            logger.error(f"Error getting permissions: {e}")
            return []
        
    def __call__(self, request):
        # Process request before view
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return self.get_response(request)
        
        # Check if we're on the admin or restaurant admin index
        path = request.path
        if path == '/admin/' or path == '/restaurant/':
            logger.info(f"Admin dashboard access attempt: {request.user.username} at {path}")
            
            # Only apply to employees, not admins
            if hasattr(request.user, 'is_employee') and request.user.is_employee:
                if request.user.is_superuser or request.user.role in ['super_admin', 'admin']:
                    logger.info(f"Admin user allowed dashboard access: {request.user.username}")
                else:
                    # Get user permissions (using same helper method as admin site)
                    user_permissions = self._get_permission_ids(request.user)
                    logger.info(f"Employee dashboard access - User: {request.user.username}, Permissions: {user_permissions}")
                    
                    # Comprehensive check for all permission variations (same as admin site)
                    order_perms = ['orders_view', 'orders_manage', 'order_view', 'order_manage', 'view_order', 'manage_order']
                    menu_perms = ['menu_view', 'menu_edit', 'menu_manage', 'view_menu', 'edit_menu', 'manage_menu']
                    customer_perms = ['customers_view', 'customers_manage', 'customer_view', 'customer_manage']
                    user_perms = ['users_view', 'users_manage', 'user_view', 'user_manage']
                    
                    # Check permissions more flexibly
                    has_order_perm = any(perm.lower() in [p.lower() for p in order_perms] for perm in user_permissions)
                    has_menu_perm = any(perm.lower() in [p.lower() for p in menu_perms] for perm in user_permissions)
                    has_customer_perm = any(perm.lower() in [p.lower() for p in customer_perms] for perm in user_permissions)
                    has_user_perm = any(perm.lower() in [p.lower() for p in user_perms] for perm in user_permissions)
                    
                    # Redirect based on permission priority
                    try:
                        # Use reverse for consistent URL patterns with admin site
                        if has_order_perm:
                            logger.info(f"Redirecting employee to orders section: {request.user.username}")
                            return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_order_changelist'))
                        elif has_menu_perm:
                            logger.info(f"Redirecting employee to menu section: {request.user.username}")
                            return HttpResponseRedirect(reverse('restaurant_admin:our_menu_menuitem_changelist'))
                        elif has_customer_perm:
                            logger.info(f"Redirecting employee to customer section: {request.user.username}")
                            return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_waitercall_changelist'))
                        elif has_user_perm:
                            logger.info(f"Redirecting employee to user section: {request.user.username}")
                            return HttpResponseRedirect(reverse('restaurant_admin:UserRole_customuser_changelist'))
                        else:
                            # Default fallback - still redirect employees away from dashboard
                            logger.info(f"No specific permissions, using fallback redirect: {request.user.username}")
                            return HttpResponseRedirect(reverse('restaurant_admin:qrgenerator_order_changelist'))
                    except Exception as e:
                        # Fallback to hardcoded URLs if reverse fails
                        logger.error(f"Error in URL reverse: {e}")
                        if has_order_perm:
                            return HttpResponseRedirect('/restaurant/qrgenerator/order/')
                        elif has_menu_perm:
                            return HttpResponseRedirect('/restaurant/our_menu/menuitem/')
                        else:
                            return HttpResponseRedirect('/restaurant/qrgenerator/order/')
        
        # Process response after view
        response = self.get_response(request)
        return response
