from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import EsewaCredentials, EsewaCredentialAuditLog


@admin.register(EsewaCredentials)
class EsewaCredentialsAdmin(admin.ModelAdmin):
    """Admin interface for eSewa credentials with security measures"""
    
    list_display = [
        'admin_email',
        'product_code_masked',
        'has_secret_key',
        'is_active',
        'is_configured',
        'created_at',
        'updated_at',
    ]
    
    list_filter = [
        'is_active',
        'created_at',
        'updated_at',
    ]
    
    search_fields = [
        'admin__email',
        'admin__first_name',
        'admin__last_name',
        'esewa_product_code',
        'esewa_display_name',
    ]
    
    readonly_fields = [
        'admin',
        'created_at',
        'updated_at',
        'last_accessed',
        'created_by',
        'product_code_masked',
        'has_secret_key',
        'is_configured',
        'audit_logs_link',
    ]
    
    fieldsets = (
        ('Admin Information', {
            'fields': ('admin', 'created_by', 'is_active')
        }),
        ('eSewa Credentials', {
            'fields': (
                'esewa_product_code',
                'esewa_secret_key_encrypted',
                'esewa_display_name',
            ),
            'description': 'Sensitive data is encrypted at rest. Never log or display secret keys.'
        }),
        ('Status Information', {
            'fields': (
                'product_code_masked',
                'has_secret_key',
                'is_configured',
                'last_accessed',
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('audit_logs_link',),
            'classes': ('collapse',)
        }),
    )
    
    def admin_email(self, obj):
        """Display admin email with link"""
        if obj.admin:
            return format_html(
                '<a href="{}">{}</a>',
                reverse('admin:UserRole_customuser_change', args=[obj.admin.id]),
                obj.admin.email
            )
        return '-'
    admin_email.short_description = 'Admin Email'
    admin_email.admin_order_field = 'admin__email'
    
    def product_code_masked(self, obj):
        """Display masked product code"""
        return obj.get_masked_product_code() or '-'
    product_code_masked.short_description = 'Product Code (Masked)'
    
    def has_secret_key(self, obj):
        """Display if secret key exists"""
        if obj.esewa_secret_key_encrypted:
            return format_html(
                '<span style="color: green;">✓ Yes</span>'
            )
        return format_html(
            '<span style="color: red;">✗ No</span>'
        )
    has_secret_key.short_description = 'Has Secret Key'
    
    def is_configured(self, obj):
        """Display if eSewa is properly configured"""
        if obj.is_esewa_enabled():
            return format_html(
                '<span style="color: green;">✓ Configured</span>'
            )
        return format_html(
            '<span style="color: orange;">⚠ Not Configured</span>'
        )
    is_configured.short_description = 'eSewa Status'
    
    def audit_logs_link(self, obj):
        """Link to audit logs"""
        count = obj.audit_logs.count()
        if count > 0:
            return format_html(
                '<a href="{}?credential__id__exact={}">View {} Audit Logs</a>',
                reverse('admin:esewaSecretKey_esewacredentialauditlog_changelist'),
                obj.id,
                count
            )
        return 'No audit logs'
    audit_logs_link.short_description = 'Audit Logs'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('admin', 'created_by')
    
    def save_model(self, request, obj, form, change):
        """Override save to set created_by and handle encryption"""
        if not change:  # Creating new object
            obj.created_by = request.user
        
        # Ensure secret key is encrypted if provided
        if 'esewa_secret_key_encrypted' in form.changed_data:
            # This field should be handled by the model's set_secret_key method
            # Admin should not directly edit encrypted fields
            pass
        
        super().save_model(request, obj, form, change)
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of credentials"""
        return False
    
    def has_add_permission(self, request):
        """Only superusers can add credentials"""
        return request.user.is_superuser


@admin.register(EsewaCredentialAuditLog)
class EsewaCredentialAuditLogAdmin(admin.ModelAdmin):
    """Admin interface for eSewa credential audit logs"""
    
    list_display = [
        'credential_admin',
        'user_email',
        'action',
        'ip_address',
        'timestamp',
    ]
    
    list_filter = [
        'action',
        'timestamp',
        'credential__admin__email',
    ]
    
    search_fields = [
        'credential__admin__email',
        'user__email',
        'ip_address',
        'action',
    ]
    
    readonly_fields = [
        'credential',
        'user',
        'action',
        'ip_address',
        'user_agent',
        'timestamp',
        'details_formatted',
    ]
    
    fieldsets = (
        ('Audit Information', {
            'fields': ('credential', 'user', 'action', 'timestamp')
        }),
        ('Request Details', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Additional Details', {
            'fields': ('details_formatted',),
            'classes': ('collapse',)
        }),
    )
    
    def credential_admin(self, obj):
        """Display credential admin email"""
        if obj.credential and obj.credential.admin:
            return obj.credential.admin.email
        return '-'
    credential_admin.short_description = 'Credential Admin'
    credential_admin.admin_order_field = 'credential__admin__email'
    
    def user_email(self, obj):
        """Display user email"""
        if obj.user:
            return obj.user.email
        return '-'
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'
    
    def details_formatted(self, obj):
        """Format details as readable text"""
        if obj.details:
            formatted = []
            for key, value in obj.details.items():
                formatted.append(f"<strong>{key}:</strong> {value}")
            return mark_safe('<br>'.join(formatted))
        return '-'
    details_formatted.short_description = 'Details'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related(
            'credential__admin', 'user'
        )
    
    def has_add_permission(self, request):
        """Audit logs are read-only"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs are read-only"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete audit logs"""
        return request.user.is_superuser
