from rest_framework.routers import DefaultRouter
from .views import (
    InventoryCategoryViewSet, SupplierViewSet, InventoryItemViewSet, StockInViewSet,
    StockOutViewSet, IngredientMappingViewSet, InventoryAlertViewSet
)

router = DefaultRouter()
router.register(r'categories', InventoryCategoryViewSet, basename='inventory-category')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'items', InventoryItemViewSet, basename='inventory-item')
router.register(r'stock-ins', StockInViewSet, basename='stock-in')
router.register(r'stock-outs', StockOutViewSet, basename='stock-out')
router.register(r'ingredient-mappings', IngredientMappingViewSet, basename='ingredient-mapping')
router.register(r'alerts', InventoryAlertViewSet, basename='inventory-alert')

urlpatterns = router.urls

print('DEBUG: InventoryManagement urlpatterns:', urlpatterns)
