from django.contrib import admin
from django.urls import path, include, re_path
from our_menu.views import root_view
from django.conf.urls.static import static
from django.conf import settings
from qrgenerator.views import menu_redirect_view
from qrgenerator import views as qrgenerator_views # Use a specific alias if needed
from EsewaIntegration.views import initiate_payment, verify_payment, check_transaction_status

# Import our custom admin site
from UserRole.admin import restaurant_admin_site

urlpatterns = [
    path('', root_view, name='root'),
    # Keep the default admin for backward compatibility
    path('admin/', admin.site.urls),
    
    # Our custom admin site that directs employees to their permitted sections
    path('restaurant/', restaurant_admin_site.urls, name='restaurant_admin'),
    path('api/', include('our_menu.urls')),
    path('api/', include('qrgenerator.urls')),
    path('menu', menu_redirect_view, name='menu_redirect'),
    
    path('api/menu/categorized/', qrgenerator_views.categorized_menu_view, name='categorized_menu'),
    path('api/user_role/', include('UserRole.urls')),  # 🧩 employee endpoints
    path('authentaction/', include('authentaction.urls')),  # 🧩 login endpoint
    path('api/', include('PaynmentANDreview.urls')),  # 🧩 review endpoints

     # eSewa Integration URLs
    path('api/payments/esewa/initiate/', initiate_payment, name='esewa-initiate'),
    # Custom regex pattern to handle malformed URLs with double question marks
    re_path(r'^api/esewa/verify/.*$', verify_payment, name='esewa-verify-malformed'),
    path('api/payments/esewa/verify/', verify_payment, name='esewa-verify'),
    path('api/payments/esewa/status/', check_transaction_status, name='esewa-status'),
    path('api/payments/esewa/', include('EsewaIntegration.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/inventory/', include('InventoryManagement.urls')),
    path('api/admin/', include('esewaSecretKey.urls')),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


