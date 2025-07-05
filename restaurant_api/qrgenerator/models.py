from django.db import models
from django.db.models import JSONField
from django.utils import timezone
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Table(models.Model):
    id = models.AutoField(primary_key=True)  # Ensure id is unique and auto-incremented
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tables', null=True, blank=True)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_tables', null=True, blank=True)
    name = models.CharField(max_length=50)
    section = models.CharField(max_length=100, default="Main Dining")
    size = models.PositiveIntegerField(default=2)
    active = models.BooleanField(default=True)
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    qr_code_url = models.URLField(blank=True, null=True)  # This will be updated dynamically
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'name')
        ordering = ['name']

    def save(self, *args, **kwargs):
        # Dynamically generate the QR code URL based on the table public_id
        self.qr_code_url = f"https://qr-menu-code.netlify.app/menu?tableUid={self.public_id}"
        # If admin is not set and user is an employee, set admin to user's admin
        if not self.admin and self.user and self.user.is_employee and self.user.created_by:
            self.admin = self.user.created_by
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Table {self.name}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in-progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('esewa', 'eSewa'),
        ('khalti', 'Khalti'),
        ('fonepay', 'FonePay'),
    ]

    id = models.CharField(max_length=10, primary_key=True)  # Format: ORD-XXX
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='orders')
    items = models.JSONField()  # Stores list of items with their quantities
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total = models.DecimalField(max_digits=16, decimal_places=2)
    special_instructions = models.TextField(blank=True, null=True)
    customer_name = models.CharField(max_length=10000, blank=True, null=True)
    payment_status = models.CharField(max_length=2000, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=2000, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    dining_option = models.CharField(max_length=20, choices=[('dine-in', 'Dine-in'), ('takeaway', 'Takeaway'), ('delivery', 'Delivery')], default='dine-in')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    extra_charges_applied = models.JSONField(default=list, blank=True, help_text="Stores applied extra charges (label, amount) at checkout.")
    transaction_uuid = models.CharField(max_length=500, blank=True, null=True, unique=True, help_text="eSewa transaction UUID for linking payments")

    def __str__(self):
        return f"Order {self.id} - Table {self.table.name}"

    class Meta:
        ordering = ['-created_at']


class MenuItem(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qrgenerator_menu_items', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.URLField(blank=True, null=True)
    category = models.CharField(max_length=50, null=True, blank=True)
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class WaiterCall(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    table = models.ForeignKey(Table, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Waiter call for {self.table} at {self.created_at}"
