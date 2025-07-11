from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail

User = get_user_model()

class Subscription(models.Model):
    """Model for managing restaurant subscriptions"""
    
    SUBSCRIPTION_STATUS = (
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
        ('pending_payment', 'Pending Payment'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    status = models.CharField(max_length=20, choices=SUBSCRIPTION_STATUS, default='trial')
    
    # Trial period
    trial_start_date = models.DateTimeField(auto_now_add=True)
    trial_end_date = models.DateTimeField(null=True, blank=True)
    
    # Subscription period
    subscription_start_date = models.DateTimeField(null=True, blank=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    
    # Billing details
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=999.00)
    currency = models.CharField(max_length=3, default='NPR')
    
    # Payment tracking
    last_payment_date = models.DateTimeField(null=True, blank=True)
    next_payment_date = models.DateTimeField(null=True, blank=True)
    
    # eSewa integration
    esewa_merchant_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'subscriptions'
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
    
    def __str__(self):
        return f"Subscription for {self.admin.email} - {self.status}"
    
    def save(self, *args, **kwargs):
        # Set trial end date to 3 days from creation if not set and status is trial
        if self.status == 'trial' and not self.trial_end_date:
            self.trial_end_date = timezone.now() + timedelta(days=3)
        # Automatically set subscription period if status is set to 'active' and dates are not set
        if self.status == 'active' and not self.subscription_start_date:
            self.subscription_start_date = timezone.now()
            self.subscription_end_date = self.subscription_start_date + timedelta(days=30)
            self.last_payment_date = self.subscription_start_date
            self.next_payment_date = self.subscription_end_date
        super().save(*args, **kwargs)
    
    @property
    def is_trial_active(self):
        """Check if trial period is still active"""
        if self.status == 'trial' and self.trial_end_date:
            return timezone.now() < self.trial_end_date
        return False
    
    @property
    def is_subscription_active(self):
        """Check if subscription is active"""
        if self.status == 'active':
            if self.subscription_end_date:
                return timezone.now() < self.subscription_end_date
            return True
        return False
    
    @property
    def days_remaining_in_trial(self):
        """Get remaining days in trial"""
        if self.is_trial_active and self.trial_end_date:
            remaining = self.trial_end_date - timezone.now()
            return max(0, remaining.days)
        return 0
    
    def activate_subscription(self, payment_date=None):
        """Activate subscription after successful payment"""
        self.status = 'active'
        self.subscription_start_date = payment_date or timezone.now()
        self.subscription_end_date = self.subscription_start_date + timedelta(days=30)
        self.last_payment_date = self.subscription_start_date
        self.next_payment_date = self.subscription_end_date
        self.save()
    
    def extend_subscription(self, payment_date=None):
        """Extend subscription for another month"""
        payment_date = payment_date or timezone.now()
        self.last_payment_date = payment_date
        self.subscription_end_date = payment_date + timedelta(days=30)
        self.next_payment_date = self.subscription_end_date
        self.save()


class BillingHistory(models.Model):
    """Model for tracking billing history"""
    
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    
    PAYMENT_METHOD = (
        ('esewa', 'eSewa'),
        ('cash', 'Cash'),
        ('other', 'Other'),
        ('manual', 'Manual'),  # Added manual payment method
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='billing_history')
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='NPR')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD, default='esewa')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    # eSewa specific fields
    esewa_transaction_id = models.CharField(max_length=100, null=True, blank=True)
    esewa_reference_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Billing period
    billing_period_start = models.DateTimeField()
    billing_period_end = models.DateTimeField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'billing_history'
        verbose_name = 'Billing History'
        verbose_name_plural = 'Billing History'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Billing {self.id} - {self.subscription.admin.email} - {self.status}"
    
    def mark_as_paid(self, paid_at=None):
        """Mark payment as completed"""
        self.status = 'completed'
        self.paid_at = paid_at or timezone.now()
        self.save()


class PaymentHistory(models.Model):
    """Model for tracking payment attempts and responses"""
    
    PAYMENT_TYPE = (
        ('subscription', 'Subscription Payment'),
        ('trial_activation', 'Trial Activation'),
        ('renewal', 'Subscription Renewal'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payment_history')
    billing_record = models.ForeignKey(BillingHistory, on_delete=models.CASCADE, related_name='payment_attempts', null=True, blank=True)
    
    # Payment details
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='NPR')
    payment_method = models.CharField(max_length=20, default='manual')  # Add payment_method for manual

    # Manual payment details
    payer_name = models.CharField(max_length=100, null=True, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    screenshot = models.ImageField(upload_to='manual_payment_screenshots/', null=True, blank=True)

    # eSewa response data
    esewa_transaction_id = models.CharField(max_length=100, null=True, blank=True)
    esewa_reference_id = models.CharField(max_length=100, null=True, blank=True)
    esewa_response_code = models.CharField(max_length=10, null=True, blank=True)
    esewa_response_message = models.TextField(null=True, blank=True)
    
    # Request/Response data
    request_data = models.JSONField(null=True, blank=True)
    response_data = models.JSONField(null=True, blank=True)
    
    # Status
    is_successful = models.BooleanField(default=False)
    error_message = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payment_history'
        verbose_name = 'Payment History'
        verbose_name_plural = 'Payment History'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} - {self.payment_type} - {'Success' if self.is_successful else 'Failed'} - eSewa Txn: {self.esewa_transaction_id or 'N/A'}"


class RefundRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("refunded", "Refunded"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name="refund_requests")
    billing_record = models.ForeignKey(BillingHistory, on_delete=models.CASCADE, related_name="refund_requests")
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    request_date = models.DateTimeField(auto_now_add=True)
    processed_date = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="processed_refunds")
    response_message = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "refund_requests"
        verbose_name = "Refund Request"
        verbose_name_plural = "Refund Requests"
        ordering = ["-request_date"]

    def __str__(self):
        return f"RefundRequest({self.admin.email}, {self.status}, {self.request_date.date()})"


@receiver(post_save, sender=PaymentHistory)
def send_activation_email_on_payment(sender, instance, created, **kwargs):
    # Only send if payment is successful and subscription is active
    if instance.is_successful and instance.subscription.status == 'active':
        user_email = instance.subscription.admin.email
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://qr-menu-code.netlify.app')
        admin_panel_url = f"{frontend_url}/admin/login"
        # Send to admin
        send_mail(
            subject="Your Admin Panel is Now Accessible - QR Menu System",
            message="Your subscription is now active! You can access the admin panel.",
            from_email="qrmenu851@gmail.com",
            recipient_list=[user_email],
            fail_silently=True,
            html_message=f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                  <h2 style='color:#2563eb;'>QR Menu System - Admin Panel Access</h2>
                  <p>Dear Admin,</p>
                  <p>Congratulations! Your subscription is now <b style='color:#16a34a;'>active</b>.</p>
                  <ul style='background:#eff6ff;padding:16px;border-radius:8px;'>
                    <li><b>Status:</b> <span style='color:#16a34a;'>Active</span></li>
                    <li><b>Access:</b> You can now log in and use all premium features.</li>
                    <li><b>Admin Panel:</b> <a href='{admin_panel_url}' style='color:#2563eb;text-decoration:underline;'>Click here to access your admin panel</a></li>
                  </ul>
                  <p style='margin-top:24px;'>Thank you for being a valued customer!</p>
                  <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                  <p style='font-size:12px;color:#6b7280;'>If you have any questions, reply to this email or contact support.</p>
                </div>
            """
        )
        # Send to site owner
        send_mail(
            subject=f"New Subscription Activated: {user_email}",
            message=f"A new subscription has been activated for admin: {user_email}.",
            from_email="qrmenu851@gmail.com",
            recipient_list=["qrmenu851@gmail.com"],
            fail_silently=True,
            html_message=f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                  <h2 style='color:#2563eb;'>New Subscription Activated</h2>
                  <p>A new subscription has been activated.</p>
                  <ul style='background:#eff6ff;padding:16px;border-radius:8px;'>
                    <li><b>Admin Email:</b> {user_email}</li>
                    <li><b>Status:</b> Active</li>
                  </ul>
                  <p style='margin-top:24px;'>Check the admin panel for more details.</p>
                </div>
            """
        )

@receiver(post_save, sender=PaymentHistory)
def send_esewa_transaction_email(sender, instance, created, **kwargs):
    # Only send if esewa_transaction_id is set and not empty
    if instance.esewa_transaction_id:
        admin = instance.subscription.admin
        admin_email = admin.email
        admin_name = getattr(admin, 'full_name', None) or getattr(admin, 'name', None) or str(admin)
        transaction_id = instance.esewa_transaction_id
        from django.conf import settings
        send_mail(
            subject=f"[eSewa Payment Submitted] Admin: {admin_email}",
            message=f"Admin {admin_name} ({admin_email}) submitted eSewa Transaction ID: {transaction_id}",
            from_email="qrmenu851@gmail.com",
            recipient_list=["qrmenu851@gmail.com"],
            fail_silently=True,
            html_message=f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                  <h2 style='color:#2563eb;'>eSewa Payment Submitted</h2>
                  <p>An admin has submitted an eSewa payment:</p>
                  <ul style='background:#eff6ff;padding:16px;border-radius:8px;'>
                    <li><b>Admin Name:</b> {admin_name}</li>
                    <li><b>Admin Email:</b> {admin_email}</li>
                    <li><b>Transaction ID:</b> {transaction_id}</li>
                  </ul>
                  <p style='margin-top:24px;'>Check the admin panel for more details.</p>
                  <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                  <p style='font-size:12px;color:#6b7280;'>QR Menu System Notification</p>
                </div>
            """
        )

@receiver(post_save, sender=Subscription)
def send_pending_payment_email(sender, instance, created, **kwargs):
    # Only send if status is pending_payment and it was not just created
    if not created and instance.status == 'pending_payment':
        user_email = instance.admin.email
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://qr-menu-code.netlify.app')
        subscription_url = f"{frontend_url}/admin/subscribe"
        # Email to admin
        send_mail(
            subject="Your Subscription is Pending Renewal – Action Required",
            message="Your subscription has expired and is currently pending renewal. Kindly complete the payment to restore access.If you have already submitted your eSewa transaction ID, please disregard this message and allow some time for our team to verify and confirm your renewal.Thank you for your patience and support.",
                    
                    
            from_email="qrmenu851@gmail.com",
            recipient_list=[user_email],
            fail_silently=True,
            html_message=f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                  <h2 style='color:#eab308;'>Subscription Pending Renewal</h2>
                  <p>Dear Admin,</p>
                  <p>Your subscription has expired and is now <b style='color:#eab308;'>pending payment</b>.</p>
                  <ul style='background:#fef9c3;padding:16px;border-radius:8px;'>
                    <li><b>Status:</b> Pending Payment</li>
                    <li><b>Renewal Required:</b> Please renew your subscription to avoid service interruption.</li>
                  </ul>
                  <p style='margin-top:16px;'>
                    <a href='{subscription_url}' style='background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>Renew Subscription</a>
                  </p>
                  <p style='margin-top:24px;'>If you have any questions, reply to this email or contact support.</p>
                  <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                  <p style='font-size:12px;color:#6b7280;'>Thank you for using QR Menu System.</p>
                </div>
            """
        )
        # Email to site owner
        send_mail(
            subject=f"[Admin Warning] Subscription Pending Payment: {user_email}",
            message=f"Admin {user_email} subscription is now pending payment.",
            from_email="qrmenu851@gmail.com",
            recipient_list=["qrmenu851@gmail.com"],
            fail_silently=True,
            html_message=f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                  <h2 style='color:#eab308;'>Admin Subscription Pending Payment</h2>
                  <p>The following admin's subscription is now pending payment:</p>
                  <ul style='background:#fef9c3;padding:16px;border-radius:8px;'>
                    <li><b>Admin Email:</b> {user_email}</li>
                    <li><b>Status:</b> Pending Payment</li>
                  </ul>
                  <p style='margin-top:16px;'>They have been notified to renew. You may wish to follow up if needed.</p>
                  <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                  <p style='font-size:12px;color:#6b7280;'>QR Menu System Notification</p>
                </div>
            """
        )
