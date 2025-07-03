from django.db import models
from django.db.models import JSONField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model

User = get_user_model()

class Category(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = ('user', 'name')

    def __str__(self):
        return self.name

class Discount(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='discounts', null=True, blank=True)
    description = models.TextField(blank=True)
    discount_percentage = models.FloatField(help_text="Enter discount as a percentage (e.g., 10 for 10%)", validators=[MinValueValidator(0), MaxValueValidator(100)])
    active = models.BooleanField(default=True, help_text="Is this discount currently active?")
    applicable_items = models.ManyToManyField('MenuItem', blank=True, help_text="Select specific items this discount applies to. Leave blank for all items.")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Discount {self.discount_percentage}%"

class MenuItem(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='menu_items', null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.URLField(blank=True, max_length=1000)
    image_url = models.URLField(blank=True, null=True, max_length=1000)  # Added to match DB column causing error
    rating = models.FloatField(null=True, blank=True)
    is_new = models.BooleanField(default=False)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    attributes = JSONField(default=list)
    available = models.BooleanField(default=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class ExtraCharge(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='extra_charges', null=True, blank=True)
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.label} (${self.amount})"