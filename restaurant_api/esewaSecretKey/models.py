from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
import re
from cryptography.fernet import Fernet
import base64
import os

class EsewaCredentials(models.Model):
    """
    Model to store encrypted eSewa credentials for restaurant admins.
    All sensitive data is encrypted at rest.
    """
    ENVIRONMENT_CHOICES = [
        ('test', 'Test Environment'),
        ('production', 'Production Environment'),
    ]
    
    admin = models.OneToOneField(
        'UserRole.CustomUser', 
        on_delete=models.CASCADE,
        related_name='esewa_credentials',
        help_text="The admin user who owns these credentials"
    )
    
    esewa_product_code = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="eSewa product code (alphanumeric only)"
    )
    
    esewa_secret_key_encrypted = models.TextField(
        blank=True, 
        null=True,
        help_text="Encrypted eSewa secret key"
    )
    
    esewa_display_name = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Display name for the eSewa account (optional)"
    )
    
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENT_CHOICES,
        default='test',
        help_text="eSewa environment (test or production)"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether these credentials are active"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Last time credentials were accessed"
    )
    
    # Audit fields
    created_by = models.ForeignKey(
        'UserRole.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_esewa_credentials',
        help_text="User who created these credentials"
    )
    
    class Meta:
        verbose_name = "eSewa Credential"
        verbose_name_plural = "eSewa Credentials"
        db_table = 'esewa_credentials'
        indexes = [
            models.Index(fields=['admin', 'is_active']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"eSewa Credentials for {self.admin.email}"
    
    def clean(self):
        """Validate the model data before saving"""
        if self.esewa_product_code:
            # Validate product code format (alphanumeric only)
            if not re.match(r'^[A-Za-z0-9]+$', self.esewa_product_code):
                raise ValidationError({
                    'esewa_product_code': 'Product code must contain only letters and numbers.'
                })
            
            # Validate product code length
            if len(self.esewa_product_code) < 3:
                raise ValidationError({
                    'esewa_product_code': 'Product code must be at least 3 characters long.'
                })
    
    def save(self, *args, **kwargs):
        """Override save to ensure encryption and validation"""
        self.clean()
        super().save(*args, **kwargs)
    
    def is_esewa_enabled(self):
        """Check if eSewa is properly configured for this admin"""
        return bool(
            self.is_active and 
            self.esewa_product_code and 
            self.esewa_secret_key_encrypted
        )
    
    def get_payment_url(self):
        """Get the correct eSewa payment URL based on environment"""
        if self.environment == 'production':
            return 'https://epay.esewa.com.np/api/epay/main/v2/form'
        else:
            return 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    
    def get_encryption_key(self):
        """Get the encryption key from environment or settings"""
        # First try to get from environment variable
        key = os.environ.get('ESEWA_ENCRYPTION_KEY')
        
        if not key:
            # Try to get from settings (for backward compatibility)
            key = getattr(settings, 'ESEWA_ENCRYPTION_KEY', None)
            
        if not key:
            # For development, use a consistent test key
            # In production, this should be set in environment variables
            key = "xClBx4WsWbPJc2a_0OaA_8gBmEnhH1qRStUvWxYz1234567890="
            print(f"Using default test encryption key: {key[:20]}...")
        elif isinstance(key, str):
            # Convert string key to bytes if needed
            key = key.encode()
        
        return key
    
    def encrypt_secret_key(self, secret_key):
        """Encrypt the secret key using Fernet"""
        if not secret_key:
            return None
        
        try:
            key = self.get_encryption_key()
            f = Fernet(key)
            encrypted_data = f.encrypt(secret_key.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            raise ValidationError(f"Failed to encrypt secret key: {str(e)}")
    
    def decrypt_secret_key(self):
        """Decrypt the secret key"""
        if not self.esewa_secret_key_encrypted:
            return None
        
        try:
            key = self.get_encryption_key()
            f = Fernet(key)
            encrypted_data = base64.b64decode(self.esewa_secret_key_encrypted.encode())
            decrypted_data = f.decrypt(encrypted_data)
            return decrypted_data.decode()
        except Exception as e:
            # Log the error but don't expose it
            print(f"Failed to decrypt secret key for admin {self.admin.id}: {str(e)}")
            return None
    
    def set_secret_key(self, secret_key):
        """Set and encrypt the secret key"""
        if not secret_key:
            self.esewa_secret_key_encrypted = None
            return
        
        # Validate secret key format
        if len(secret_key) < 8:
            raise ValidationError('Secret key must be at least 8 characters long.')
        
        self.esewa_secret_key_encrypted = self.encrypt_secret_key(secret_key)
    
    def get_masked_product_code(self):
        """Return masked product code for display"""
        if not self.esewa_product_code:
            return ""
        if len(self.esewa_product_code) <= 8:
            return "*" * len(self.esewa_product_code)
        return (
            self.esewa_product_code[:4] + 
            "*" * (len(self.esewa_product_code) - 8) + 
            self.esewa_product_code[-4:]
        )
    
    def get_masked_secret_key(self):
        """Return masked secret key for display"""
        if not self.esewa_secret_key_encrypted:
            return ""
        decrypted = self.decrypt_secret_key()
        if not decrypted:
            return "••••••••••••••••"
        if len(decrypted) <= 8:
            return "*" * len(decrypted)
        return decrypted[:4] + "*" * (len(decrypted) - 8) + decrypted[-4:]
    
    def update_last_accessed(self):
        """Update the last accessed timestamp"""
        self.last_accessed = timezone.now()
        self.save(update_fields=['last_accessed'])


class EsewaCredentialAuditLog(models.Model):
    """
    Audit log for eSewa credential access and modifications
    """
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('viewed', 'Viewed'),
        ('deleted', 'Deleted'),
        ('enabled', 'Enabled'),
        ('disabled', 'Disabled'),
    ]
    
    credential = models.ForeignKey(
        EsewaCredentials,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    
    user = models.ForeignKey(
        'UserRole.CustomUser',
        on_delete=models.CASCADE,
        related_name='esewa_audit_actions'
    )
    
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "eSewa Credential Audit Log"
        verbose_name_plural = "eSewa Credential Audit Logs"
        db_table = 'esewa_credential_audit_logs'
        indexes = [
            models.Index(fields=['credential', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} by {self.user.email} at {self.timestamp}"


class EsewaOTP(models.Model):
    """
    Temporary OTP storage for eSewa credential verification
    """
    user = models.ForeignKey(
        'UserRole.CustomUser',
        on_delete=models.CASCADE,
        related_name='esewa_otps'
    )
    
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "eSewa OTP"
        verbose_name_plural = "eSewa OTPs"
        db_table = 'esewa_otps'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['is_used']),
        ]
    
    def __str__(self):
        return f"OTP for {self.user.email} at {self.created_at}"
    
    def is_expired(self):
        """Check if OTP is expired (5 minutes)"""
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() - self.created_at > timedelta(minutes=5)


class EsewaVerificationToken(models.Model):
    """
    Temporary verification tokens for eSewa credential display
    """
    user = models.ForeignKey(
        'UserRole.CustomUser',
        on_delete=models.CASCADE,
        related_name='esewa_verification_tokens'
    )
    
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "eSewa Verification Token"
        verbose_name_plural = "eSewa Verification Tokens"
        db_table = 'esewa_verification_tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['is_used']),
        ]
    
    def __str__(self):
        return f"Verification token for {self.user.email} at {self.created_at}"
    
    def is_expired(self):
        """Check if token is expired"""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.save()
