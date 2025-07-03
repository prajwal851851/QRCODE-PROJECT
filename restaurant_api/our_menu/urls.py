from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import ExtraChargeViewSet

router = DefaultRouter()
router.register(r'extra-charges', ExtraChargeViewSet, basename='extracharge')

urlpatterns = [
    path('csrf/', views.CSRFTokenView.as_view(), name='csrf-token'),
    path('our_menu/', views.MenuItemList.as_view(), name='menu-item-list'),
    path('our_menu/<int:id>/', views.MenuItemDetail.as_view(), name='menu-item-detail'),
    path('our_menu/specials/', views.SpecialMenuItemList.as_view(), name='special-menu-item-list'),
    path('categories/', views.CategoryList.as_view(), name='category-list'),
    path('categories/public/', views.public_category_list, name='public-category-list'),
    path('menu/categorized/', views.CategorizedMenuItemList.as_view(), name='categorized-menu-item-list'),
    # Extra charges endpoint for customer menu pages
    path('extra-charges/by-user/<int:user_id>/', views.ExtraChargesByUserView.as_view(), name='extra-charges-by-user'),
    # Explicitly include the router URLs to ensure they're properly registered
    path('', include(router.urls)),
]
