from rest_framework import serializers
from .models import Table, Order, WaiterCall
from our_menu.models import MenuItem, Discount

class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = ['id', 'name', 'qr_code_url', 'section', 'size', 'active', 'created_at', 'updated_at', 'public_id']

class OrderItemSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True, default='')  # Make id optional with default
    name = serializers.CharField(required=False, allow_blank=True, default='Unknown Item')
    price = serializers.FloatField(required=False, default=0.0)
    quantity = serializers.IntegerField(required=False, default=1)
    
    def validate(self, data):
        # Ensure we have the required fields with fallbacks
        if not data.get('name'):
            data['name'] = 'Unknown Item'
        if data.get('price') is None:
            data['price'] = 0.0
        if data.get('quantity') is None:
            data['quantity'] = 1
        # Make id optional - if not provided, we'll use a default value
        if not data.get('id'):
            data['id'] = str(data.get('name', 'Unknown Item'))
        return data

class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    table_name = serializers.CharField(source='table.name', read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    table = serializers.PrimaryKeyRelatedField(queryset=Table.objects.all(), required=False)
    table_id = serializers.PrimaryKeyRelatedField(source='table', queryset=Table.objects.all(), required=False, write_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'table', 'table_id', 'table_name', 'items', 'status', 'total', 'extra_charges_applied',
            'special_instructions', 'customer_name', 'payment_status',
            'payment_method', 'created_at', 'updated_at', 'dining_option', 'transaction_uuid'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_items(self, obj):
        """Custom method to handle items serialization with error handling"""
        try:
            if not obj.items:
                return []
            
            # Ensure each item has the required fields
            processed_items = []
            for item in obj.items:
                if isinstance(item, dict):
                    processed_item = {
                        'id': item.get('id', str(item.get('name', 'Unknown Item'))),
                        'name': item.get('name', 'Unknown Item'),
                        'price': float(item.get('price', 0)),
                        'quantity': int(item.get('quantity', 1))
                    }
                    processed_items.append(processed_item)
                else:
                    # If item is not a dict, skip it
                    continue
            
            return processed_items
        except Exception as e:
            print(f"Error processing items for order {obj.id}: {str(e)}")
            return []

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one item is required")
        return items

    def validate_total(self, total):
        if total <= 0:
            raise serializers.ValidationError("Total must be greater than zero")
        return total

class MenuItemSerializer(serializers.ModelSerializer):
    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'image', 'category', 'available', 'discount_percentage']

    def get_discount_percentage(self, obj):
        # The discount_percentage is added to the object in the view
        return obj.get('discount_percentage', 0)

class DiscountSerializer(serializers.ModelSerializer):
    applicable_items = serializers.PrimaryKeyRelatedField(queryset=MenuItem.objects.all(), many=True, required=False)

    class Meta:
        model = Discount
        fields = ['id', 'description', 'discount_percentage', 'active', 'applicable_items', 'start_date', 'end_date', 'created_at', 'updated_at']

class WaiterCallSerializer(serializers.ModelSerializer):
    table_name = serializers.CharField(source='table.name', read_only=True)
    class Meta:
        model = WaiterCall
        fields = '__all__'
