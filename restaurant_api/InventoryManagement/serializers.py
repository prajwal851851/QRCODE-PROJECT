from rest_framework import serializers
from .models import (
    InventoryCategory, Supplier, InventoryItem, StockIn, StockOut, IngredientMapping, InventoryAlert
)

class InventoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCategory
        fields = ['id', 'name', 'description', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'contact_person', 'email', 'phone', 'address', 'notes', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class InventoryItemSerializer(serializers.ModelSerializer):
    category = InventoryCategorySerializer(read_only=True)
    supplier = SupplierSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryCategory.objects.all(), source='category', write_only=True, required=False
    )
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), source='supplier', write_only=True, required=False
    )
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'name', 'code', 'unit', 'current_stock', 'minimum_threshold', 'purchase_price',
            'supplier', 'category', 'notes', 'expiry_date', 'created_by', 'created_at', 'updated_at',
            'category_id', 'supplier_id', 'is_low_stock', 'stock_value'
        ]
        read_only_fields = ['id', 'code', 'current_stock', 'created_by', 'created_at', 'updated_at', 'is_low_stock', 'stock_value']

class StockInSerializer(serializers.ModelSerializer):
    item = InventoryItemSerializer(read_only=True)
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(), source='item', write_only=True
    )
    supplier = SupplierSerializer(read_only=True)
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), source='supplier', write_only=True, required=False
    )
    class Meta:
        model = StockIn
        fields = [
            'id', 'item', 'item_id', 'quantity', 'date', 'supplier', 'supplier_id', 'invoice_id',
            'unit_price', 'remarks', 'created_by', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

class StockOutSerializer(serializers.ModelSerializer):
    item = InventoryItemSerializer(read_only=True)
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(), source='item', write_only=True
    )
    class Meta:
        model = StockOut
        fields = [
            'id', 'item', 'item_id', 'quantity', 'date', 'reason', 'dish', 'remarks', 'created_by', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

class IngredientMappingSerializer(serializers.ModelSerializer):
    dish_name = serializers.CharField(source='dish.name', read_only=True)
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    class Meta:
        model = IngredientMapping
        fields = ['id', 'dish', 'dish_name', 'ingredient', 'ingredient_name', 'quantity', 'created_at', 'updated_at']

class InventoryAlertSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    class Meta:
        model = InventoryAlert
        fields = ['id', 'alert_type', 'item', 'item_name', 'message', 'is_read', 'created_at']
