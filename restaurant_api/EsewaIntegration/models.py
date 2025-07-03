from django.db import models
from qrgenerator.models import Order
import json

class EsewaTransaction(models.Model):
    STATUS_CHOICES = [
        ('INITIATED', 'Initiated'),
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='esewa_transactions', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_uuid = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INITIATED')
    order_details = models.TextField(null=True, blank=True, help_text="JSON string of order details for recreation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"eSewa Transaction {self.transaction_uuid} - {self.status}"
    
    def set_order_details(self, order_data):
        """Store order details as JSON string"""
        self.order_details = json.dumps(order_data)
        self.save()
    
    def get_order_details(self):
        """Get order details from JSON string"""
        if self.order_details:
            return json.loads(self.order_details)
        return None
