from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TableViewSet, OrderViewSet, menu_redirect_view, CreateOrderFromMenuView, DiscountViewSet, WaiterCallViewSet, customer_menu_view

router = DefaultRouter()
router.register(r'tables', TableViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'discounts', DiscountViewSet)
router.register(r'waiter_call', WaiterCallViewSet, basename='waiter_call')

urlpatterns = [
    path('', include(router.urls)),
    path('redirect/<int:tableId>/', menu_redirect_view, name='menu-redirect'),  # Ensure consistent naming
    path('create-order/', CreateOrderFromMenuView.as_view(), name='create-order'),
    path('menu/customer/', customer_menu_view, name='customer-menu'),
]
