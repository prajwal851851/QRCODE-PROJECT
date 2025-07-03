from django.contrib import admin
from .models import Table, Order, MenuItem, WaiterCall
from our_menu.models import Discount
from django.utils.html import format_html
from django.utils import timezone

# Import our custom admin site
from UserRole.admin import restaurant_admin_site

# Register your models here
from .models import Order

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'table', 'user', 'total', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('id', 'table__name', 'user__email', 'customer_name')

try:
    restaurant_admin_site.register(Order, OrderAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    admin.site.register(Order, OrderAdmin)
except admin.sites.AlreadyRegistered:
    pass

class TableAdmin(admin.ModelAdmin):
    list_display = ('name', 'section', 'size', 'active', 'qr_code_url_display')

    def qr_code_url_display(self, obj):
        if obj.qr_code_url:
            return format_html("<a href='{0}' target='_blank'>{0}</a>", obj.qr_code_url)
        return "-"

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'table', 'status', 'total', 'payment_status', 'payment_method', 'created_at', 'customer_name')
    list_filter = ('status', 'payment_status', 'payment_method', 'created_at')
    search_fields = ('id', 'table__name', 'customer_name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Order Information', {
            'fields': ('id', 'user', 'table', 'status', 'total', 'special_instructions', 'customer_name')
        }),
        ('Payment Information', {
            'fields': ('payment_status', 'payment_method')
        }),
        ('Items', {
            'fields': ('items',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('table')

    def has_delete_permission(self, request, obj=None):
        # Only allow deletion of pending orders
        if obj and obj.status == 'pending':
            return True
        return False

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data:
            # You could add notification logic here
            pass
        super().save_model(request, obj, form, change)

class WaiterCallAdmin(admin.ModelAdmin):
    list_display = ('table', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('table__name',)
    readonly_fields = ('created_at',)

# CRITICAL: Only register with restaurant_admin_site
# This avoids duplicate registration errors while ensuring our redirection works
try:
    restaurant_admin_site.register(Table, TableAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    restaurant_admin_site.register(Order, OrderAdmin)
except admin.sites.AlreadyRegistered:
    pass

try:
    restaurant_admin_site.register(WaiterCall, WaiterCallAdmin)
except admin.sites.AlreadyRegistered:
    pass

print("Successfully registered qrgenerator models with restaurant admin site")

# Removed DiscountAdmin registration to avoid AlreadyRegistered error

admin.site.register(WaiterCall)

admin.site.register(MenuItem)
