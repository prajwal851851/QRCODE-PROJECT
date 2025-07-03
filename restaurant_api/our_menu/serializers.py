from rest_framework import serializers
from .models import MenuItem, Category, Discount, ExtraCharge
from our_menu.models import Discount as OurMenuDiscount
from django.utils import timezone
from django.db import models

class CategorySerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = Category
        fields = ['id', 'name', 'user']

class MenuItemSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), allow_null=True)
    discount_percentage = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'image', 'image_url', 'rating', 'is_new', 'original_price', 'attributes', 'available', 'category', 'created_at', 'updated_at', 'discount_percentage', 'final_price']

    def validate(self, data):
        if not data.get('category'):
            data['category'] = None  # Allow null category
        return data

    def get_discount_percentage(self, obj):
        # Calculate applicable discount percentage here
        today = timezone.now().date()
        # Find applicable discounts for this item
        applicable_discounts = OurMenuDiscount.objects.filter(
            (models.Q(start_date__isnull=True) | models.Q(start_date__lte=today)),
            (models.Q(end_date__isnull=True) | models.Q(end_date__gte=today)),
            active=True
        ).filter(models.Q(applicable_items__isnull=True) | models.Q(applicable_items=obj))

        # Find the highest percentage discount among applicable ones
        highest_discount_percentage = max(
            (d.discount_percentage for d in applicable_discounts), default=0
        )
        return highest_discount_percentage

    def get_final_price(self, obj):
        price = float(obj.price)
        discount_percentage = self.get_discount_percentage(obj)
        final_price = price * (1 - discount_percentage / 100)
        return round(final_price, 2)

class DiscountSerializer(serializers.ModelSerializer):
    applicable_items = serializers.PrimaryKeyRelatedField(queryset=MenuItem.objects.all(), many=True, required=False)

    class Meta:
        model = OurMenuDiscount
        fields = ['id', 'description', 'discount_percentage', 'active', 'applicable_items', 'start_date', 'end_date', 'created_at', 'updated_at']

class ExtraChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtraCharge
        fields = '__all__'
        read_only_fields = ['user']