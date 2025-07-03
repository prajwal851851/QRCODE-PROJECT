from django.contrib import admin
from django.urls import path, include
from rest_framework.documentation import include_docs_urls
from rest_framework.schemas import get_schema_view
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', TemplateView.as_view(template_name='index.html'), name='root'),
    path('admin/', admin.site.urls),
    path('restaurant/', include('restaurant.urls')),
    path('api/csrf/', ensure_csrf_cookie(TemplateView.as_view()), name='csrf-token'),
    path('api/our_menu/', include('menu.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/menu/categorized/', include('menu.urls')),
    path('api/extra-charges/', include('extra_charges.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/inventory/', include('restaurant_api.InventoryManagement.urls')),
    path('api/', include('rest_framework.urls')),
    path('docs/', include_docs_urls(title='Restaurant API')),
    path('schema/', get_schema_view(
        title='Restaurant API',
        description='API for restaurant management system',
        version='1.0.0'
    ), name='openapi-schema'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 