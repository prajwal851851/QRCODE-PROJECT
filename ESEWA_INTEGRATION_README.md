# eSewa Integration Feature

## Overview

The eSewa Integration feature allows restaurant admins to securely configure and manage their eSewa payment gateway credentials. This feature provides a secure, user-friendly interface for managing sensitive payment information with bank-level security measures.

## Features

### 🔐 Security Features
- **Two-Factor Authentication**: Password + OTP verification for viewing credentials
- **Encrypted Storage**: All sensitive data is encrypted before storage
- **Masked Display**: Credentials are never shown in plain text
- **Access Control**: Only admins and super admins can access this feature
- **Audit Logging**: All credential access is logged for security

### 🎨 User Interface
- **Clean Design**: Modern, responsive interface with clear visual hierarchy
- **Status Indicators**: Clear indication of configuration status
- **Form Validation**: Real-time validation with helpful error messages
- **Loading States**: Smooth loading and saving states
- **Toast Notifications**: User-friendly success and error messages

### 🔧 Technical Features
- **API Endpoints**: Secure REST API for credential management
- **Token Verification**: JWT-based authentication
- **Error Handling**: Comprehensive error handling and user feedback
- **TypeScript**: Fully typed for better development experience

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── integrate-esewa/
│   │       └── page.tsx                    # Main eSewa integration page
│   └── api/
│       └── admin/
│           └── esewa-credentials/
│               ├── route.ts                # GET/POST credentials
│               ├── view/
│               │   └── route.ts            # Password verification
│               └── verify-otp/
│                   └── route.ts            # OTP verification
├── components/
│   ├── admin-sidebar.tsx                   # Updated with eSewa menu item
│   └── responsive-admin-sidebar.tsx        # Updated with eSewa menu item
└── lib/
    └── auth-utils.ts                       # Token verification utilities
```

## Usage

### For Admins

1. **Access the Feature**
   - Navigate to Admin Panel
   - Click on "Integrate eSewa" in the sidebar
   - Only admins and super admins will see this option

2. **Configure Credentials**
   - Enter your eSewa Product Code
   - Enter your eSewa Secret Key (will be encrypted)
   - Optionally add an Account Name for reference
   - Click "Save Credentials"

3. **View Credentials**
   - Click "View Full Credentials"
   - Enter your current password
   - Check your email for OTP
   - Enter the 6-digit OTP
   - View your masked credentials

### For Developers

#### API Endpoints

**GET /api/admin/esewa-credentials**
- Returns masked credentials for the authenticated admin
- Requires admin/super admin permissions

**POST /api/admin/esewa-credentials**
- Saves encrypted credentials for the authenticated admin
- Validates input data
- Requires admin/super admin permissions

**POST /api/admin/esewa-credentials/view**
- Initiates credential viewing process
- Verifies password and sends OTP
- Requires admin/super admin permissions

**POST /api/admin/esewa-credentials/verify-otp**
- Verifies OTP and returns decrypted credentials
- Requires admin/super admin permissions

#### Security Considerations

1. **Encryption**: Use proper encryption (Fernet, AES) in production
2. **Token Verification**: Implement proper JWT verification with your Django backend
3. **OTP Storage**: Store OTPs securely with expiration times
4. **Rate Limiting**: Implement rate limiting for OTP requests
5. **Audit Logging**: Log all credential access attempts

## Configuration

### Environment Variables (Production)

```env
# JWT Configuration
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRY=24h

# Encryption
ENCRYPTION_KEY=your-32-byte-encryption-key

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
OTP_RATE_LIMIT=5
OTP_RATE_LIMIT_WINDOW=300000
```

### Database Schema (Django)

```python
class EsewaCredentials(models.Model):
    admin = models.OneToOneField('UserRole.CustomUser', on_delete=models.CASCADE)
    product_code = models.CharField(max_length=50)
    secret_key = models.CharField(max_length=255)  # Encrypted
    account_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OTPVerification(models.Model):
    user = models.ForeignKey('UserRole.CustomUser', on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50)  # 'view_credentials'
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
```

## Testing

### Frontend Testing
- Test form validation
- Test password/OTP flow
- Test responsive design
- Test error handling

### API Testing
- Test authentication
- Test authorization
- Test input validation
- Test encryption/decryption

### Security Testing
- Test rate limiting
- Test OTP expiration
- Test access control
- Test audit logging

## Future Enhancements

1. **Multiple Payment Methods**: Support for other payment gateways
2. **Bulk Operations**: Manage multiple admin credentials
3. **Test Mode**: Test credentials before going live
4. **Advanced Security**: Hardware security modules (HSM)
5. **Analytics**: Payment success rate tracking
6. **Webhooks**: Real-time payment notifications

## Support

For technical support or questions about the eSewa integration:

1. Check the Django backend logs for detailed error messages
2. Verify your eSewa credentials are correct
3. Ensure your email is configured for OTP delivery
4. Contact the development team for additional assistance

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never log sensitive data**: Ensure no sensitive information is logged
2. **Use HTTPS**: Always use HTTPS in production
3. **Regular audits**: Regularly audit credential access logs
4. **Key rotation**: Implement key rotation policies
5. **Backup encryption**: Ensure backups are also encrypted
6. **Access monitoring**: Monitor for unusual access patterns

This feature implements bank-level security measures to protect sensitive payment credentials while providing a smooth user experience for restaurant administrators. 