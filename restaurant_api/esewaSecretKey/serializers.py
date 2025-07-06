from rest_framework import serializers
from .models import EsewaCredentials, EsewaCredentialAuditLog
from django.core.exceptions import ValidationError
import re


class EsewaCredentialsSerializer(serializers.ModelSerializer):
    """Serializer for eSewa credentials - never exposes secret key"""
    
    product_code = serializers.CharField(
        source='esewa_product_code',
        max_length=100,
        required=False,
        allow_blank=True,
        write_only=True,  # Only for writing, not reading
        help_text="eSewa product code (alphanumeric only)"
    )
    
    secret_key = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="eSewa secret key (will be encrypted)"
    )
    
    display_name = serializers.CharField(
        source='esewa_display_name',
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Display name for the eSewa account"
    )
    
    environment = serializers.ChoiceField(
        choices=[('test', 'Test Environment'), ('production', 'Production Environment')],
        default='test',
        help_text="eSewa environment (test or production)"
    )
    
    is_configured = serializers.SerializerMethodField()
    masked_product_code = serializers.SerializerMethodField()
    masked_secret_key = serializers.SerializerMethodField()
    
    class Meta:
        model = EsewaCredentials
        fields = [
            'id',
            'product_code',  # Keep it for write operations
            'secret_key',
            'display_name',
            'environment',
            'is_configured',
            'masked_product_code',
            'masked_secret_key',
            'is_active',
            'created_at',
            'updated_at',
            'last_accessed',
        ]
        read_only_fields = [
            'id',
            'is_configured',
            'masked_product_code',
            'masked_secret_key',
            'created_at',
            'updated_at',
            'last_accessed',
        ]
    
    def get_is_configured(self, obj):
        """Check if credentials are properly configured"""
        return obj.is_esewa_enabled()
    
    def get_masked_product_code(self, obj):
        """Return masked product code for display"""
        return obj.get_masked_product_code()
    
    def get_masked_secret_key(self, obj):
        """Return masked secret key for display"""
        return obj.get_masked_secret_key()
    
    def to_representation(self, instance):
        """Override to exclude product_code from response for security"""
        data = super().to_representation(instance)
        # Remove product_code from response for security
        data.pop('product_code', None)
        return data
    
    def validate_product_code(self, value):
        """Validate product code format"""
        if value:
            # Check if alphanumeric only
            if not re.match(r'^[A-Za-z0-9]+$', value):
                raise serializers.ValidationError(
                    "Product code must contain only letters and numbers (no spaces, symbols, or special characters)."
                )
            
            # Check minimum length
            if len(value) < 3:
                raise serializers.ValidationError(
                    "Product code must be at least 3 characters long."
                )
            
            # Check maximum length
            if len(value) > 100:
                raise serializers.ValidationError(
                    "Product code must not exceed 100 characters."
                )
            
            # Get the environment from the request data
            environment = self.context.get('request').data.get('environment', 'test')
            
            # Environment-specific validation
            if environment == 'production':
                # Production validation - must start with EPAY (not EP_TEST)
                if not value.upper().startswith('EPAY'):
                    raise serializers.ValidationError(
                        "Production product code must start with 'EPAY' (eSewa production format)."
                    )
                if value.upper().startswith('EP_TEST'):
                    raise serializers.ValidationError(
                        "Production environment cannot use test product codes (EP_TEST). Please use your real eSewa production credentials."
                    )
            else:
                # Test validation - can start with EPAY or EP_TEST
                if not value.upper().startswith(('EPAY', 'EP_TEST')):
                    raise serializers.ValidationError(
                        "Test product code should start with 'EPAY' or 'EP_TEST' (eSewa test format)."
                    )
        
        return value
    
    def validate_secret_key(self, value):
        """Validate secret key format"""
        if value:
            # Check minimum length
            if len(value) < 8:
                raise serializers.ValidationError(
                    "Secret key must be at least 8 characters long."
                )
            
            # Check maximum length (reasonable limit)
            if len(value) > 255:
                raise serializers.ValidationError(
                    "Secret key must not exceed 255 characters."
                )
            
            # Check if it contains only valid characters
            if not re.match(r'^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]+$', value):
                raise serializers.ValidationError(
                    "Secret key contains invalid characters. Use only letters, numbers, and common symbols."
                )
        
        return value

    def validate(self, data):
        """Validate the complete credentials with eSewa"""
        product_code = data.get('esewa_product_code')
        secret_key = data.get('secret_key')
        environment = data.get('environment', 'test')
        
        # Only validate if both product_code and secret_key are provided
        if product_code and secret_key:
            # Import the validation function
            from .views import validate_esewa_credentials
            
            # Validate credentials with eSewa
            is_valid, error_message = validate_esewa_credentials(
                product_code=product_code,
                secret_key=secret_key,
                environment=environment
            )
            
            if not is_valid:
                raise serializers.ValidationError({
                    'product_code': error_message,
                    'secret_key': error_message
                })
        
        return data
    
    def create(self, validated_data):
        """Create new eSewa credentials with encryption"""
        secret_key = validated_data.pop('secret_key', None)
        product_code = validated_data.get('esewa_product_code')
        environment = validated_data.get('environment', 'test')
        
        # Set the admin to the current user
        validated_data['admin'] = self.context['request'].user
        validated_data['created_by'] = self.context['request'].user
        
        # Validate credentials with eSewa before saving
        if product_code and secret_key:
            from .views import validate_esewa_credentials
            is_valid, error_message = validate_esewa_credentials(
                product_code=product_code,
                secret_key=secret_key,
                environment=environment
            )
            
            if not is_valid:
                raise serializers.ValidationError({
                    'product_code': error_message,
                    'secret_key': error_message
                })
        
        try:
            # Create the credentials object
            credentials = EsewaCredentials.objects.create(**validated_data)
            
            # Set and encrypt the secret key if provided
            if secret_key:
                credentials.set_secret_key(secret_key)
                credentials.save()
            
            # Log the creation
            self._log_audit_action(credentials, 'created')
            
            return credentials
        except Exception as e:
            # Provide better error messages
            if 'encrypt' in str(e).lower():
                raise serializers.ValidationError({
                    'secret_key': f"Failed to encrypt secret key. Please try again or contact support if the issue persists."
                })
            else:
                raise serializers.ValidationError(f"Failed to save credentials: {str(e)}")
    
    def update(self, instance, validated_data):
        """Update eSewa credentials with encryption"""
        secret_key = validated_data.pop('secret_key', None)
        product_code = validated_data.get('esewa_product_code', instance.esewa_product_code)
        environment = validated_data.get('environment', instance.environment)
        
        # Validate credentials with eSewa before updating
        if product_code and secret_key:
            from .views import validate_esewa_credentials
            is_valid, error_message = validate_esewa_credentials(
                product_code=product_code,
                secret_key=secret_key,
                environment=environment
            )
            
            if not is_valid:
                raise serializers.ValidationError({
                    'product_code': error_message,
                    'secret_key': error_message
                })
        
        try:
            # Update fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            # Set and encrypt the secret key if provided
            if secret_key is not None:  # Allow clearing the secret key
                instance.set_secret_key(secret_key)
            
            instance.save()
            
            # Log the update
            self._log_audit_action(instance, 'updated')
            
            return instance
        except Exception as e:
            # Provide better error messages
            if 'encrypt' in str(e).lower():
                raise serializers.ValidationError({
                    'secret_key': f"Failed to encrypt secret key. Please try again or contact support if the issue persists."
                })
            else:
                raise serializers.ValidationError(f"Failed to update credentials: {str(e)}")
    
    def _log_audit_action(self, credentials, action):
        """Log audit action for credential changes"""
        try:
            EsewaCredentialAuditLog.objects.create(
                credential=credentials,
                user=self.context['request'].user,
                action=action,
                ip_address=self._get_client_ip(),
                user_agent=self.context['request'].META.get('HTTP_USER_AGENT', ''),
                details={
                    'action': action,
                    'timestamp': credentials.updated_at.isoformat(),
                }
            )
        except Exception as e:
            # Don't fail the main operation if audit logging fails
            print(f"Failed to log audit action: {str(e)}")
    
    def _get_client_ip(self):
        """Get client IP address"""
        x_forwarded_for = self.context['request'].META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.context['request'].META.get('REMOTE_ADDR')
        return ip


class EsewaCredentialsViewSerializer(serializers.ModelSerializer):
    """Serializer for viewing credentials after verification - includes decrypted data"""
    
    product_code = serializers.CharField(source='esewa_product_code')
    secret_key = serializers.SerializerMethodField()
    display_name = serializers.CharField(source='esewa_display_name')
    
    class Meta:
        model = EsewaCredentials
        fields = [
            'product_code',
            'secret_key',
            'display_name',
        ]
    
    def get_secret_key(self, obj):
        """Return decrypted secret key (only after verification)"""
        return obj.decrypt_secret_key()
    
    def to_representation(self, instance):
        """Update last accessed timestamp when credentials are viewed"""
        instance.update_last_accessed()
        
        # Log the view action
        try:
            EsewaCredentialAuditLog.objects.create(
                credential=instance,
                user=self.context['request'].user,
                action='viewed',
                ip_address=self._get_client_ip(),
                user_agent=self.context['request'].META.get('HTTP_USER_AGENT', ''),
                details={
                    'action': 'viewed',
                    'timestamp': instance.last_accessed.isoformat(),
                }
            )
        except Exception as e:
            # Don't fail the main operation if audit logging fails
            print(f"Failed to log view action: {str(e)}")
        
        return super().to_representation(instance)
    
    def _get_client_ip(self):
        """Get client IP address"""
        x_forwarded_for = self.context['request'].META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.context['request'].META.get('REMOTE_ADDR')
        return ip


class EsewaCredentialsStatusSerializer(serializers.ModelSerializer):
    """Serializer for checking eSewa status - minimal data for security"""
    
    is_configured = serializers.SerializerMethodField()
    has_secret_key = serializers.SerializerMethodField()
    
    class Meta:
        model = EsewaCredentials
        fields = [
            'is_configured',
            'has_secret_key',
            'esewa_display_name',
            'environment',
            'updated_at',
        ]
    
    def get_is_configured(self, obj):
        """Check if credentials are properly configured"""
        return obj.is_esewa_enabled()
    
    def get_has_secret_key(self, obj):
        """Check if secret key exists (without revealing it)"""
        return bool(obj.esewa_secret_key_encrypted)


class EsewaCredentialAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs - admin only"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = EsewaCredentialAuditLog
        fields = [
            'id',
            'user_email',
            'action',
            'action_display',
            'ip_address',
            'timestamp',
            'details',
        ]
        read_only_fields = fields
