from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth import get_user_model
from our_menu.models import MenuItem
from django.db import transaction
import uuid

User = get_user_model()

class InventoryCategory(models.Model):
    """Categories for grouping inventory items (e.g., Vegetables, Meats, Beverages, Spices)"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="inventory_categories")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Inventory Categories"
        ordering = ['name']
        unique_together = ("name", "created_by")

    def __str__(self):
        return self.name

class Supplier(models.Model):
    """Suppliers for inventory items"""
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="suppliers")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ("name", "created_by")

    def __str__(self):
        return self.name

class InventoryItem(models.Model):
    """Master inventory items (raw materials, stock items)"""
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('l', 'Liter'),
        ('ml', 'Milliliter'),
        ('pcs', 'Pieces'),
        ('pkg', 'Package'),
        ('box', 'Box'),
        ('bottle', 'Bottle'),
        ('can', 'Can'),
        ('bag', 'Bag'),
    ]

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, editable=False)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    current_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    minimum_threshold = models.DecimalField(max_digits=10, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(InventoryCategory, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="inventory_items")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_low_stock(self):
        """Check if current stock is below minimum threshold"""
        return self.current_stock <= self.minimum_threshold

    @property
    def stock_value(self):
        """Calculate total stock value"""
        if self.purchase_price:
            return self.current_stock * self.purchase_price
        return 0

    def save(self, *args, **kwargs):
        if not self.code:
            # Generate a unique code using uuid4
            self.code = uuid.uuid4().hex[:10].upper()
            while InventoryItem.objects.filter(code=self.code).exists():
                self.code = uuid.uuid4().hex[:10].upper()
        super().save(*args, **kwargs)

class StockIn(models.Model):
    """Stock in records (restocking)"""
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='stock_ins')
    quantity = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0.001)])
    date = models.DateField()
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    invoice_id = models.CharField(max_length=100, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Stock In: {self.item.name} - {self.quantity} {self.item.unit} on {self.date}"

    def save(self, *args, **kwargs):
        # Update current stock when saving
        if not self.pk:  # Only on creation
            self.item.current_stock += self.quantity
            self.item.save()
            # Low stock alert logic
            from .models import InventoryAlert
            with transaction.atomic():
                if self.item.is_low_stock:
                    InventoryAlert.objects.update_or_create(
                        item=self.item,
                        alert_type='low_stock',
                        defaults={
                            'message': f'{self.item.name} is in low stock.',
                            'is_read': False
                        }
                    )
                else:
                    InventoryAlert.objects.filter(item=self.item, alert_type='low_stock').delete()
        super().save(*args, **kwargs)

class StockOut(models.Model):
    """Stock out records (usage/consumption)"""
    REASON_CHOICES = [
        ('used', 'Used in Order'),
        ('expired', 'Expired'),
        ('wasted', 'Wasted/Spoiled'),
        ('damaged', 'Damaged'),
        ('other', 'Other'),
    ]

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='stock_outs')
    quantity = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0.001)])
    date = models.DateField()
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    dish = models.ForeignKey(MenuItem, on_delete=models.SET_NULL, null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Stock Out: {self.item.name} - {self.quantity} {self.item.unit} on {self.date}"

    def save(self, *args, **kwargs):
        # Update current stock when saving
        if not self.pk:  # Only on creation
            if self.item.current_stock >= self.quantity:
                self.item.current_stock -= self.quantity
                self.item.save()
                # Low stock alert logic
                from .models import InventoryAlert
                with transaction.atomic():
                    if self.item.is_low_stock:
                        InventoryAlert.objects.update_or_create(
                            item=self.item,
                            alert_type='low_stock',
                            defaults={
                                'message': f'{self.item.name} is in low stock.',
                                'is_read': False
                            }
                        )
                    else:
                        InventoryAlert.objects.filter(item=self.item, alert_type='low_stock').delete()
            else:
                raise ValueError(f"Insufficient stock for {self.item.name}")
        super().save(*args, **kwargs)

class IngredientMapping(models.Model):
    """Mapping between menu items (dishes) and ingredients"""
    dish = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='ingredient_mappings')
    ingredient = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='dish_mappings')
    quantity = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0.001)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['dish', 'ingredient']
        ordering = ['dish__name', 'ingredient__name']

    def __str__(self):
        return f"{self.dish.name} - {self.ingredient.name}: {self.quantity} {self.ingredient.unit}"

class InventoryAlert(models.Model):
    """Alerts for low stock, expiry, etc."""
    ALERT_TYPES = [
        ('low_stock', 'Low Stock'),
        ('expiry', 'Expiring Soon'),
        ('out_of_stock', 'Out of Stock'),
    ]

    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='alerts')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_alert_type_display()}: {self.item.name}"
