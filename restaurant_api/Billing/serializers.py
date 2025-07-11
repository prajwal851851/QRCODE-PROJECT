from rest_framework import serializers
from .models import Subscription, BillingHistory, PaymentHistory, RefundRequest
from django.utils import timezone
from datetime import timedelta
import requests


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model"""
    
    is_trial_active = serializers.ReadOnlyField()
    is_subscription_active = serializers.ReadOnlyField()
    days_remaining_in_trial = serializers.ReadOnlyField()
    admin_email = serializers.ReadOnlyField(source='admin.email')
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'admin', 'admin_email', 'status', 'trial_start_date', 'trial_end_date',
            'subscription_start_date', 'subscription_end_date', 'monthly_fee', 'currency',
            'last_payment_date', 'next_payment_date', 'esewa_merchant_id',
            'created_at', 'updated_at', 'is_trial_active', 'is_subscription_active',
            'days_remaining_in_trial'
        ]
        read_only_fields = [
            'id', 'admin', 'trial_start_date', 'trial_end_date', 'subscription_start_date',
            'subscription_end_date', 'last_payment_date', 'next_payment_date',
            'created_at', 'updated_at', 'is_trial_active', 'is_subscription_active',
            'days_remaining_in_trial'
        ]


class SubscriptionStatusSerializer(serializers.ModelSerializer):
    """Simplified serializer for subscription status"""
    
    is_trial_active = serializers.ReadOnlyField()
    is_subscription_active = serializers.ReadOnlyField()
    days_remaining_in_trial = serializers.ReadOnlyField()
    admin_email = serializers.ReadOnlyField(source='admin.email')
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'status', 'trial_start_date', 'trial_end_date', 'subscription_start_date', 
            'subscription_end_date', 'monthly_fee', 'currency', 'last_payment_date', 
            'next_payment_date', 'is_trial_active', 'is_subscription_active', 
            'days_remaining_in_trial', 'admin_email'
        ]


class BillingHistorySerializer(serializers.ModelSerializer):
    """Serializer for BillingHistory model"""
    
    subscription_admin_email = serializers.ReadOnlyField(source='subscription.admin.email')
    
    class Meta:
        model = BillingHistory
        fields = [
            'id', 'subscription', 'subscription_admin_email', 'amount', 'currency',
            'payment_method', 'status', 'esewa_transaction_id', 'esewa_reference_id',
            'billing_period_start', 'billing_period_end', 'created_at', 'updated_at',
            'paid_at'
        ]
        read_only_fields = [
            'id', 'subscription', 'subscription_admin_email', 'created_at', 'updated_at'
        ]


class PaymentHistorySerializer(serializers.ModelSerializer):
    """Serializer for PaymentHistory model"""
    
    subscription_admin_email = serializers.ReadOnlyField(source='subscription.admin.email')
    
    class Meta:
        model = PaymentHistory
        fields = [
            'id', 'subscription', 'subscription_admin_email', 'billing_record',
            'payment_type', 'amount', 'currency', 'esewa_transaction_id',
            'esewa_reference_id', 'esewa_response_code', 'esewa_response_message',
            'is_successful', 'error_message', 'created_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'subscription', 'subscription_admin_email', 'created_at', 'processed_at'
        ]


class CreateSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for creating new subscriptions"""
    
    class Meta:
        model = Subscription
        fields = ['admin', 'monthly_fee', 'currency']
        read_only_fields = ['admin']
    
    def create(self, validated_data):
        # Set the admin from the request user
        validated_data['admin'] = self.context['request'].user
        return super().create(validated_data)


class InitiatePaymentSerializer(serializers.Serializer):
    """Serializer for initiating subscription payments"""
    
    payment_type = serializers.ChoiceField(choices=[
        ('subscription', 'Subscription Payment'),
        ('trial_activation', 'Trial Activation'),
        ('renewal', 'Subscription Renewal'),
    ])
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(max_length=3, default='NPR')
    
    def validate(self, data):
        user = self.context['request'].user
        
        # Check if user has a subscription
        try:
            subscription = user.subscription
        except Subscription.DoesNotExist:
            # No subscription exists - this is allowed for new subscription payments
            if data['payment_type'] == 'subscription':
                return data
            else:
                raise serializers.ValidationError("No subscription found for this user")
        
        # Validate payment type based on subscription status
        if data['payment_type'] == 'subscription':
            if subscription.status == 'trial':
                raise serializers.ValidationError("Cannot make subscription payment during trial period")
            elif subscription.status == 'active':
                raise serializers.ValidationError("Subscription is already active")
            elif subscription.status == 'pending_payment':
                # Check if there are any recent pending payments (within last 30 minutes)
                # that are still being processed (not yet processed)
                from django.utils import timezone
                from datetime import timedelta
                
                recent_pending_payments = subscription.payment_history.filter(
                    payment_type='subscription',
                    is_successful=False,
                    processed_at__isnull=True,  # Only check payments that haven't been processed yet
                    created_at__gte=timezone.now() - timedelta(minutes=30)
                ).count()
                
                if recent_pending_payments > 0:
                    raise serializers.ValidationError("Payment is already being processed")
                else:
                    # Reset stale pending_payment status to allow new payment
                    subscription.status = 'expired'
                    subscription.save()
                    return data
        
        if data['payment_type'] == 'trial_activation' and subscription.status != 'trial':
            raise serializers.ValidationError("Trial activation only available for trial subscriptions")
        
        if data['payment_type'] == 'renewal' and subscription.status != 'active':
            raise serializers.ValidationError("Renewal only available for active subscriptions")
        
        return data


class EsewaPaymentResponseSerializer(serializers.Serializer):
    """Serializer for eSewa payment response"""
    
    transaction_id = serializers.CharField()
    reference_id = serializers.CharField()
    response_code = serializers.CharField()
    response_message = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    
    def validate_response_code(self, value):
        """Validate eSewa response code"""
        if value not in ['000', '100', '101', '102', '103', '104', '105']:
            raise serializers.ValidationError("Invalid eSewa response code")
        return value


class SubscriptionDashboardSerializer(serializers.ModelSerializer):
    """Serializer for subscription dashboard data"""
    
    is_trial_active = serializers.ReadOnlyField()
    is_subscription_active = serializers.ReadOnlyField()
    days_remaining_in_trial = serializers.ReadOnlyField()
    days_remaining_in_subscription = serializers.SerializerMethodField()
    subscription_start_date = serializers.ReadOnlyField()
    subscription_end_date = serializers.ReadOnlyField()
    total_payments = serializers.SerializerMethodField()
    total_amount_paid = serializers.SerializerMethodField()
    recent_payments = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'status', 'trial_end_date', 'subscription_start_date', 'subscription_end_date', 'monthly_fee',
            'is_trial_active', 'is_subscription_active', 'days_remaining_in_trial', 'days_remaining_in_subscription',
            'total_payments', 'total_amount_paid', 'recent_payments'
        ]
    
    def get_days_remaining_in_subscription(self, obj):
        if obj.is_subscription_active and obj.subscription_end_date:
            remaining = obj.subscription_end_date - timezone.now()
            return max(0, remaining.days)
        return 0
    
    def get_total_payments(self, obj):
        """Get total number of successful payments"""
        return obj.billing_history.filter(status='completed').count()
    
    def get_total_amount_paid(self, obj):
        """Get total amount paid"""
        completed_payments = obj.billing_history.filter(status='completed')
        return sum(payment.amount for payment in completed_payments)
    
    def get_recent_payments(self, obj):
        """Get recent payment history"""
        recent_payments = obj.billing_history.filter(status='completed').order_by('-created_at')[:5]
        return BillingHistorySerializer(recent_payments, many=True).data


class ManualPaymentSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=100)
    payer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    payment_date = serializers.DateTimeField(required=False, allow_null=True)
    screenshot = serializers.ImageField(required=False, allow_null=True)

    def validate_transaction_id(self, value):
        # Check if transaction ID is already used
        if PaymentHistory.objects.filter(esewa_transaction_id=value).exists():
            raise serializers.ValidationError('This eSewa transaction ID has already been submitted.')
        # --- eSewa verification temporarily disabled for testing ---
        # To re-enable, uncomment the code below:
        # import requests
        # if value and len(value) >= 6:
        #     verify_url = 'https://epay.esewa.com.np/api/epay/transrec'
        #     payload = {
        #         'reference_id': value,
        #         # Add other required fields if needed
        #     }
        #     try:
        #         response = requests.post(verify_url, data=payload, timeout=5)
        #         if response.status_code != 200 or 'Success' not in response.text:
        #             raise serializers.ValidationError('This eSewa transaction ID could not be verified. Please enter a valid transaction ID.')
        #     except Exception:
        #         raise serializers.ValidationError('Could not verify this transaction ID with eSewa. Please try again later or check the ID.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        try:
            subscription = Subscription.objects.get(admin=user)
        except Subscription.DoesNotExist:
            raise serializers.ValidationError({'subscription': 'No subscription found for this user. Please create a subscription first.'})
        # Prevent duplicate transaction IDs (already checked in validate_transaction_id)
        # Create a billing record for this manual payment
        billing_record = BillingHistory.objects.create(
            subscription=subscription,
            amount=999,  # You may want to make this dynamic
            currency='NPR',
            payment_method='manual',
            status='pending',
            billing_period_start=timezone.now(),
            billing_period_end=timezone.now() + timedelta(days=30)
        )
        payment = PaymentHistory.objects.create(
            subscription=subscription,
            billing_record=billing_record,
            payment_type='subscription',
            amount=999,  # You may want to make this dynamic
            currency='NPR',
            payment_method='manual',
            payer_name=validated_data.get('payer_name'),
            payment_date=validated_data.get('payment_date'),
            screenshot=validated_data.get('screenshot'),
            esewa_transaction_id=validated_data.get('transaction_id'),
            is_successful=False,
        )
        # Set subscription status to pending_payment
        subscription.status = 'pending_payment'
        subscription.save()
        return payment


class RefundRequestSerializer(serializers.ModelSerializer):
    admin_email = serializers.ReadOnlyField(source='admin.email')
    billing_record_id = serializers.ReadOnlyField(source='billing_record.id')
    processed_by_email = serializers.ReadOnlyField(source='processed_by.email')

    class Meta:
        model = RefundRequest
        fields = [
            'id', 'admin', 'admin_email', 'billing_record', 'billing_record_id', 'reason', 'status',
            'request_date', 'processed_date', 'processed_by', 'processed_by_email', 'response_message'
        ]
        read_only_fields = ['id', 'admin', 'admin_email', 'request_date', 'processed_date', 'processed_by_email']
