from rest_framework import serializers
from .models import Review

class ReviewSerializer(serializers.ModelSerializer):
    order_id = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'order_id', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_order_id(self, obj):
        return obj.order.id

class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['order', 'rating', 'comment'] 