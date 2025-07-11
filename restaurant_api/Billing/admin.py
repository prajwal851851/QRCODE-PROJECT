from django.contrib import admin
from .models import Subscription, BillingHistory, PaymentHistory, RefundRequest


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'admin', 'status', 'trial_end_date', 'subscription_end_date', 
        'monthly_fee', 'get_trial_status', 'get_subscription_status', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'trial_end_date', 'subscription_end_date']
    search_fields = ['admin__email', 'admin__username']
    readonly_fields = [
        'id', 'trial_start_date', 'created_at', 'updated_at',
        'get_trial_status', 'get_subscription_status', 'get_days_remaining'
    ]
    actions = ['activate_selected_subscriptions']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'admin', 'status', 'monthly_fee', 'currency')
        }),
        ('Trial Period', {
            'fields': ('trial_start_date', 'trial_end_date', 'get_trial_status', 'get_days_remaining')
        }),
        ('Subscription Period', {
            'fields': ('subscription_start_date', 'subscription_end_date', 'get_subscription_status')
        }),
        ('Payment Tracking', {
            'fields': ('last_payment_date', 'next_payment_date', 'esewa_merchant_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def activate_selected_subscriptions(self, request, queryset):
        from django.utils import timezone
        for sub in queryset:
            sub.activate_subscription(payment_date=timezone.now())
        self.message_user(request, f"Activated {queryset.count()} subscription(s) for 1 month from now.")
    activate_selected_subscriptions.short_description = "Activate selected subscriptions (1 month from now)"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('admin')
    
    def get_trial_status(self, obj):
        """Safely get trial status"""
        try:
            return obj.is_trial_active
        except:
            return False
    get_trial_status.boolean = True
    get_trial_status.short_description = 'Trial Active'
    
    def get_subscription_status(self, obj):
        """Safely get subscription status"""
        try:
            return obj.is_subscription_active
        except:
            return False
    get_subscription_status.boolean = True
    get_subscription_status.short_description = 'Subscription Active'
    
    def get_days_remaining(self, obj):
        """Safely get days remaining"""
        try:
            return obj.days_remaining_in_trial
        except:
            return 0
    get_days_remaining.short_description = 'Days Remaining in Trial'


@admin.register(BillingHistory)
class BillingHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'subscription_admin', 'amount', 'currency', 'payment_method', 
        'status', 'billing_period_start', 'billing_period_end', 'created_at'
    ]
    list_filter = ['status', 'payment_method', 'created_at', 'paid_at']
    search_fields = ['subscription__admin__email', 'esewa_transaction_id', 'esewa_reference_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'subscription', 'amount', 'currency', 'payment_method', 'status')
        }),
        ('eSewa Details', {
            'fields': ('esewa_transaction_id', 'esewa_reference_id'),
            'classes': ('collapse',)
        }),
        ('Billing Period', {
            'fields': ('billing_period_start', 'billing_period_end')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'paid_at'),
            'classes': ('collapse',)
        }),
    )
    
    def subscription_admin(self, obj):
        return obj.subscription.admin.email if obj.subscription else 'N/A'
    subscription_admin.short_description = 'Admin'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('subscription__admin')


@admin.register(PaymentHistory)
class PaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'subscription', 'payment_type', 'amount', 'is_successful', 'esewa_transaction_id', 'payer_name', 'payment_date', 'screenshot')
    search_fields = ('id', 'esewa_transaction_id', 'payer_name')
    readonly_fields = ('esewa_transaction_id', 'payer_name', 'payment_date', 'screenshot', 'created_at', 'processed_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('subscription', 'billing_record', 'payment_type', 'amount', 'currency')
        }),
        ('eSewa Response', {
            'fields': (
                'esewa_transaction_id', 'esewa_reference_id', 
                'esewa_response_code', 'esewa_response_message'
            ),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_successful', 'error_message')
        }),
        ('Data', {
            'fields': ('request_data', 'response_data'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (),
            'classes': ('collapse',)
        }),
    )
    
    def subscription_admin(self, obj):
        return obj.subscription.admin.email if obj.subscription else 'N/A'
    subscription_admin.short_description = 'Admin'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('subscription__admin', 'billing_record')


@admin.register(RefundRequest)
class RefundRequestAdmin(admin.ModelAdmin):
    list_display = [
        'admin', 'billing_record', 'reason', 'status', 'request_date', 'processed_date', 'processed_by', 'response_message'
    ]
    list_filter = ['status', 'request_date', 'processed_date']
    search_fields = ['admin__email', 'billing_record__id', 'reason']
    readonly_fields = ['id', 'request_date']
    fieldsets = (
        ('Refund Request Info', {
            'fields': ('id', 'admin', 'billing_record', 'reason', 'status', 'request_date', 'processed_date', 'processed_by', 'response_message')
        }),
    )
