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
    items = serializers.JSONField(required=False, allow_null=True)  # Make items writable and allow null
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



    def validate_items(self, items):
        if not items:
            return []  # Allow empty items instead of raising error
        
        # Ensure items is a list
        if not isinstance(items, list):
            raise serializers.ValidationError("Items must be a list")
        
        # Validate each item
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"Item {i} must be an object")
            
            # Ensure required fields exist
            if not item.get('name'):
                raise serializers.ValidationError(f"Item {i} must have a name")
            
            # Ensure price is a valid number
            try:
                price = float(item.get('price', 0))
                if price < 0:
                    raise serializers.ValidationError(f"Item {i} price cannot be negative")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Item {i} must have a valid price")
            
            # Ensure quantity is a valid positive integer
            try:
                quantity = int(item.get('quantity', 1))
                if quantity <= 0:
                    raise serializers.ValidationError(f"Item {i} quantity must be positive")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Item {i} must have a valid quantity")
        
        return items

    def validate_total(self, total):
        if total <= 0:
            raise serializers.ValidationError("Total must be greater than zero")
        return total

    def to_representation(self, instance):
        """Custom representation to ensure items are properly formatted"""
        try:
            data = super().to_representation(instance)
            
            # Ensure items are properly formatted when reading
            if 'items' in data and data['items'] is not None:
                try:
                    processed_items = []
                    for item in data['items']:
                        if isinstance(item, dict):
                            processed_item = {
                                'id': item.get('id', str(item.get('name', 'Unknown Item'))),
                                'name': item.get('name', 'Unknown Item'),
                                'price': float(item.get('price', 0)),
                                'quantity': int(item.get('quantity', 1))
                            }
                            processed_items.append(processed_item)
                        else:
                            continue
                    data['items'] = processed_items
                except Exception as e:
                    print(f"Error processing items for order {instance.id}: {str(e)}")
                    data['items'] = []
            else:
                data['items'] = []
            
            return data
        except Exception as e:
            print(f"Error in to_representation for order {instance.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return a basic representation if there's an error
            return {
                'id': instance.id,
                'table_name': getattr(instance.table, 'name', 'Unknown Table') if instance.table else 'Unknown Table',
                'items': [],
                'status': instance.status,
                'total': str(instance.total),
                'payment_status': instance.payment_status,
                'payment_method': instance.payment_method,
                'created_at': instance.created_at.isoformat() if instance.created_at else None,
                'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
                'dining_option': instance.dining_option,
                'transaction_uuid': instance.transaction_uuid,
                'special_instructions': instance.special_instructions,
                'customer_name': instance.customer_name,
                'extra_charges_applied': instance.extra_charges_applied or []
            }

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
