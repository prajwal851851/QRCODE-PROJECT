from django.contrib import admin
from .models import MenuItem, Category, Discount, ExtraCharge

# Import our custom admin site
from UserRole.admin import restaurant_admin_site

class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'category', 'available')
    list_filter = ('available', 'category')
    search_fields = ('name', 'description')

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

class DiscountAdmin(admin.ModelAdmin):
    list_display = ('discount_percentage', 'active', 'start_date', 'end_date')
    list_filter = ('active', 'start_date', 'end_date')
    search_fields = ('description',)
    date_hierarchy = 'start_date'
    fields = ('description', 'discount_percentage', 'active', 'applicable_items', 'start_date', 'end_date')
    filter_horizontal = ('applicable_items',)

class ExtraChargeAdmin(admin.ModelAdmin):
    list_display = ('label', 'amount', 'active', 'created_at', 'updated_at')
    list_filter = ('active',)
    search_fields = ('label',)

    def save_model(self, request, obj, form, change):
        # Auto-assign user if not set
        if not obj.user:
            obj.user = request.user
        super().save_model(request, obj, form, change)

# Register with restaurant_admin_site
# This avoids duplicate registration errors while ensuring our redirection works
try:
    restaurant_admin_site.register(MenuItem, MenuItemAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    restaurant_admin_site.register(Category, CategoryAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    restaurant_admin_site.register(Discount, DiscountAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    restaurant_admin_site.register(ExtraCharge, ExtraChargeAdmin)
except admin.sites.AlreadyRegistered:
    pass

# ALSO register with the default admin site
# This ensures models appear in both admin interfaces
try:
    admin.site.register(MenuItem, MenuItemAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    admin.site.register(Category, CategoryAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    admin.site.register(Discount, DiscountAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    admin.site.register(ExtraCharge, ExtraChargeAdmin)
except admin.sites.AlreadyRegistered:
    pass

print("Successfully registered menu models with both admin sites")