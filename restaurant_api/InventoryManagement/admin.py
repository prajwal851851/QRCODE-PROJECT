from django.contrib import admin
from .models import (
    InventoryCategory, Supplier, InventoryItem, StockIn, StockOut, IngredientMapping, InventoryAlert
)

@admin.register(InventoryCategory)
class InventoryCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    ordering = ['name']

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone', 'address']
    list_filter = ['created_at']
    ordering = ['name']

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'unit', 'current_stock', 'minimum_threshold', 'purchase_price', 'category', 'supplier', 'is_low_stock']
    search_fields = ['name', 'code', 'notes']
    list_filter = ['unit', 'category', 'supplier', 'created_at']
    ordering = ['name']
    readonly_fields = ['current_stock', 'is_low_stock', 'stock_value']

@admin.register(StockIn)
class StockInAdmin(admin.ModelAdmin):
    list_display = ['item', 'quantity', 'date', 'supplier', 'invoice_id', 'unit_price', 'created_by', 'created_at']
    search_fields = ['item__name', 'supplier__name', 'invoice_id', 'remarks']
    list_filter = ['date', 'supplier', 'created_at']
    ordering = ['-date', '-created_at']
    readonly_fields = ['created_by', 'created_at']

@admin.register(StockOut)
class StockOutAdmin(admin.ModelAdmin):
    list_display = ['item', 'quantity', 'date', 'reason', 'dish', 'created_by', 'created_at']
    search_fields = ['item__name', 'reason', 'dish__name', 'remarks']
    list_filter = ['date', 'reason', 'created_at']
    ordering = ['-date', '-created_at']
    readonly_fields = ['created_by', 'created_at']

@admin.register(IngredientMapping)
class IngredientMappingAdmin(admin.ModelAdmin):
    list_display = ['dish', 'ingredient', 'quantity', 'created_at']
    search_fields = ['dish__name', 'ingredient__name']
    list_filter = ['created_at']
    ordering = ['dish__name', 'ingredient__name']

@admin.register(InventoryAlert)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display = ['alert_type', 'item', 'message', 'is_read', 'created_at']
    search_fields = ['item__name', 'alert_type', 'message']
    list_filter = ['alert_type', 'is_read', 'created_at']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
