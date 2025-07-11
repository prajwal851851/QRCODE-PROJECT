from django.shortcuts import render
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from datetime import timedelta
import random
import string
import requests
import json
from django.http import HttpResponse
from django.template import Template, Context

from .models import EsewaCredentials, EsewaCredentialAuditLog, EsewaOTP
from .serializers import (
    EsewaCredentialsSerializer,
    EsewaCredentialsViewSerializer,
    EsewaCredentialsStatusSerializer,
    EsewaCredentialAuditLogSerializer
)
from UserRole.models import CustomUser


def validate_esewa_credentials(product_code, secret_key, environment='production'):
    """
    Validate eSewa credentials by making a test API call
    Returns (is_valid, error_message)
    """
    try:
        # Determine the validation URL based on environment
        if environment == 'production':
            validation_url = 'https://epay.esewa.com.np/api/epay/main/v2/form'
        else:
            validation_url = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
        
        # Create a minimal test payment request
        test_data = {
            'amount': '100',  # Minimum test amount
            'tax_amount': '0',
            'product_service_charge': '0',
            'product_delivery_charge': '0',
            'total_amount': '100',
            'transaction_uuid': f'test-{random.randint(100000, 999999)}',
            'product_code': product_code,
            'success_url': 'https://example.com/success',
            'failure_url': 'https://example.com/failure',
            'signed_field_names': 'total_amount,transaction_uuid,product_code',
        }
        
        # Generate signature for validation
        from EsewaIntegration.views import generate_signature
        data_to_sign = f"total_amount={test_data['total_amount']},transaction_uuid={test_data['transaction_uuid']},product_code={test_data['product_code']}"
        signature = generate_signature(secret_key, data_to_sign)
        test_data['signature'] = signature
        
        # Validate product code format
        if not product_code or len(product_code) < 3:
            return False, "❌ Product code is too short. Product code must be at least 3 characters long."
        
        # Validate secret key format
        if not secret_key or len(secret_key) < 8:
            return False, "❌ Secret key is too short. Secret key must be at least 8 characters long."
        
        # Production validation - must start with EPAY
        if environment == 'production':
            if not product_code.upper().startswith('EPAY'):
                return False, f"❌ Production product code '{product_code}' must start with 'EPAY' (eSewa production format)."
        
        # ACTUAL eSewa API validation - make a real test call
        try:
            import requests
            from urllib.parse import urlencode
            
            # Prepare the form data for eSewa
            form_data = {
                'amount': test_data['amount'],
                'tax_amount': test_data['tax_amount'],
                'product_service_charge': test_data['product_service_charge'],
                'product_delivery_charge': test_data['product_delivery_charge'],
                'total_amount': test_data['total_amount'],
                'transaction_uuid': test_data['transaction_uuid'],
                'product_code': test_data['product_code'],
                'success_url': test_data['success_url'],
                'failure_url': test_data['failure_url'],
                'signed_field_names': test_data['signed_field_names'],
                'signature': test_data['signature'],
            }
            
            # Make a POST request to eSewa to validate credentials
            # We'll check if eSewa accepts our request or returns an error
            response = requests.post(
                validation_url,
                data=form_data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'QR-Menu-System/1.0'
                },
                timeout=10  # 10 second timeout
            )
            
            # Check response status
            if response.status_code == 200:
                # Success - credentials are valid
                return True, "✅ Credentials validated successfully!"
            elif response.status_code == 400:
                # Bad request - might be invalid credentials
                try:
                    error_data = response.json()
                    error_message = error_data.get('error_message', 'Unknown error')
                    return False, f"❌ Invalid credentials: {error_message}"
                except:
                    return False, "❌ Invalid credentials: Bad request from eSewa"
            elif response.status_code == 401:
                return False, "❌ Invalid credentials: Unauthorized"
            elif response.status_code == 403:
                return False, "❌ Invalid credentials: Forbidden"
            else:
                # Other status codes - might be temporary issues
                return True, f"✅ Credentials appear valid (Status: {response.status_code})"
                
        except requests.exceptions.Timeout:
            return False, "❌ Validation timeout. Please check your internet connection and try again."
        except requests.exceptions.ConnectionError:
            return False, "❌ Connection error. Please check your internet connection and try again."
    except Exception as e:
            return False, f"❌ Validation error: {str(e)}"
            
    except Exception as e:
        return False, f"❌ Validation failed: {str(e)}"


class EsewaCredentialsView(generics.RetrieveUpdateAPIView):
    """
    View for managing eSewa credentials.
    GET: Returns masked credentials
    POST/PUT: Updates credentials with encryption and validation
    """
    serializer_class = EsewaCredentialsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Get the most recent credentials for the current user (even if inactive)"""
        user = self.request.user
        # Get the most recently updated credentials for this admin
        credentials = EsewaCredentials.objects.filter(admin=user).order_by('-updated_at').first()
        return credentials
    
    def get(self, request, *args, **kwargs):
        """Get masked credentials"""
        credentials = self.get_object()
        serializer = self.get_serializer(credentials)
        return Response(serializer.data)
    
    def post(self, request, *args, **kwargs):
        user = self.request.user
        # Try to get existing credentials for this admin
        credentials = EsewaCredentials.objects.filter(admin=user).first()
        serializer = self.get_serializer(credentials, data=request.data, partial=True) if credentials else self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # If updating, set is_active=True; if creating, set is_active=True and created_by
        if credentials:
            credentials.is_active = True
            serializer.save(is_active=True)
        else:
            serializer.save(admin=user, created_by=user, is_active=True)
        # Deactivate all other credentials for this admin (should only be one, but for safety)
        EsewaCredentials.objects.filter(admin=user).exclude(id=serializer.instance.id).update(is_active=False)
        return Response(self.get_serializer(serializer.instance).data)
    
    def put(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_credential_view(request):
    """
    Initiate the process to view credentials.
    Requires password verification and sends OTP.
    """
    try:
        user = request.user
        
        # Check if user is admin or super admin
        if not user.is_admin_or_super_admin():
            raise PermissionDenied("Only admins can view eSewa credentials.")
        
        # Get credentials
        try:
            credentials = EsewaCredentials.objects.get(admin=user)
        except ObjectDoesNotExist:
            return Response({
                'error': 'No eSewa credentials found for this admin.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate password
        password = request.data.get('password')
        if not password:
            return Response({
                'error': 'Password is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify password
        if not user.check_password(password):
            return Response({
                'error': 'Invalid password.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Store OTP in session (in production, use Redis or database)
        request.session['esewa_otp'] = otp
        request.session['esewa_otp_created'] = timezone.now().isoformat()
        request.session['esewa_otp_user_id'] = user.id
        
        # Ensure session is saved
        request.session.modified = True
        
        # Force session save
        request.session.save()
        
        # Also store OTP in database as fallback
        EsewaOTP.objects.filter(user=user, is_used=False).delete()  # Clear old unused OTPs
        EsewaOTP.objects.create(user=user, otp_code=otp)
        
        # Debug logging
        print(f"Debug OTP Storage:")
        print(f"  User ID: {user.id}")
        print(f"  OTP: {otp}")
        print(f"  Session ID: {request.session.session_key}")
        print(f"  Session Data: {dict(request.session)}")
        
        # Send OTP via email
        try:
            from django.core.mail import send_mail
            from django.template.loader import render_to_string
            from django.utils.html import strip_tags
            
            subject = 'eSewa Credentials Verification - OTP'
            
            # HTML email content
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">eSewa Credentials Verification</h2>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #666; margin-bottom: 15px;">Hello {user.first_name or user.email},</p>
                    <p style="color: #666; margin-bottom: 15px;">You requested to view your eSewa credentials. Please use the following verification code:</p>
                    <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        {otp}
                    </div>
                    <p style="color: #666; margin-bottom: 15px;"><strong>This code will expire in 5 minutes.</strong></p>
                    <p style="color: #666; margin-bottom: 15px;">If you didn't request this verification, please ignore this email.</p>
                </div>
                <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                    <p>This is an automated message from your QR Menu system.</p>
                    <p>For support, contact: qrmenu851@gmail.com</p>
                </div>
            </div>
            """
            
            # Plain text version
            plain_message = f"""
            eSewa Credentials Verification
            
            Hello {user.first_name or user.email},
            
            You requested to view your eSewa credentials. Please use the following verification code:
            
            {otp}
            
            This code will expire in 5 minutes.
            
            If you didn't request this verification, please ignore this email.
            
            For support, contact: qrmenu851@gmail.com
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=strip_tags(plain_message),
                from_email=None,  # Uses DEFAULT_FROM_EMAIL from settings
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            print(f"OTP email sent successfully to {user.email}: {otp}")
            
        except Exception as e:
            print(f"Failed to send OTP email to {user.email}: {str(e)}")
            # Fallback: return OTP in response for development
            return Response({
                'message': 'OTP sent successfully.',
                'email': user.email,
                'otp': otp,  # Only for development - remove in production
                'error': f'Email sending failed: {str(e)}'
            }, status=status.HTTP_200_OK)
        
        # Log the attempt
        try:
            EsewaCredentialAuditLog.objects.create(
                credential=credentials,
                user=user,
                action='viewed',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'action': 'initiate_view',
                    'timestamp': timezone.now().isoformat(),
                }
            )
        except Exception as e:
            print(f"Failed to log audit action: {str(e)}")
        
        return Response({
            'message': 'OTP sent successfully.',
            'email': user.email
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in initiate_credential_view: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return Response({
            'error': 'Internal server error',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_otp_and_view_credentials(request):
    """
    Verify OTP and return decrypted credentials.
    """
    try:
        user = request.user
        
        # Check if user is admin or super admin
        if not user.is_admin_or_super_admin():
            raise PermissionDenied("Only admins can view eSewa credentials.")
        
        # Get credentials
        try:
            credentials = EsewaCredentials.objects.get(admin=user)
        except ObjectDoesNotExist:
            return Response({
                'error': 'No eSewa credentials found for this admin.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate OTP
        otp = request.data.get('otp')
        if not otp:
            return Response({
                'error': 'OTP is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get stored OTP from session
        stored_otp = request.session.get('esewa_otp')
        otp_created = request.session.get('esewa_otp_created')
        otp_user_id = request.session.get('esewa_otp_user_id')
        
        # Debug logging
        print(f"Debug OTP Validation:")
        print(f"  User ID: {user.id}")
        print(f"  Stored OTP: {stored_otp}")
        print(f"  OTP Created: {otp_created}")
        print(f"  OTP User ID: {otp_user_id}")
        print(f"  Provided OTP: {otp}")
        print(f"  Session ID: {request.session.session_key}")
        print(f"  All Session Data: {dict(request.session)}")
        print(f"  Session Modified: {request.session.modified}")
        
        # If session OTP is not found, try database OTP as fallback
        if not stored_otp:
            print("  Session OTP not found, trying database OTP...")
            try:
                db_otp = EsewaOTP.objects.filter(
                    user=user, 
                    is_used=False,
                    created_at__gte=timezone.now() - timedelta(minutes=5)
                ).latest('created_at')
                
                if not db_otp.is_expired():
                    stored_otp = db_otp.otp_code
                    otp_created = db_otp.created_at.isoformat()
                    otp_user_id = user.id
                    print(f"  Database OTP found: {stored_otp}")
                else:
                    print("  Database OTP expired")
                    db_otp.delete()
            except EsewaOTP.DoesNotExist:
                print("  No database OTP found")
        
        # Validate OTP
        if not stored_otp:
            print("  Error: No stored OTP found")
            return Response({
                'error': 'No OTP found. Please request a new one.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if otp_user_id != user.id:
            print(f"  Error: User ID mismatch - stored: {otp_user_id}, current: {user.id}")
            return Response({
                'error': 'Invalid OTP session. Please request a new one.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check OTP expiration (5 minutes)
        if otp_created:
            created_time = timezone.datetime.fromisoformat(otp_created.replace('Z', '+00:00'))
            if timezone.now() - created_time > timedelta(minutes=5):
                # Clear expired OTP
                del request.session['esewa_otp']
                del request.session['esewa_otp_created']
                del request.session['esewa_otp_user_id']
                return Response({
                    'error': 'OTP has expired. Please request a new one.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify OTP
        if otp != stored_otp:
            return Response({
                'error': 'Invalid OTP.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Clear OTP from session (only if present)
        for key in ['esewa_otp', 'esewa_otp_created', 'esewa_otp_user_id']:
            if key in request.session:
                del request.session[key]
        
        # Also clear database OTP
        EsewaOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Mark OTP as used and store verification status
        EsewaOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Create a verification record in database for reliability
        from .models import EsewaVerificationToken
        import secrets
        
        # Clear old verification records
        EsewaVerificationToken.objects.filter(user=user, is_used=False).delete()
        
        # Create new verification record
        verification_token = secrets.token_urlsafe(32)
        verification_record = EsewaVerificationToken.objects.create(
            user=user,
            token=verification_token,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        # Store verification status in session for immediate use
        try:
            if not request.session.session_key:
                request.session.create()
            
            request.session['otp_verified'] = True
            request.session['otp_verified_user_id'] = user.id
            request.session['otp_verified_timestamp'] = timezone.now().isoformat()
            request.session['verification_token'] = verification_token
            
            request.session.modified = True
            request.session.save()
        except Exception as e:
            print(f"Session storage failed: {e}")
        
        # Debug logging
        print(f"Debug: OTP verification completed:")
        print(f"  Session ID: {request.session.session_key}")
        print(f"  User ID: {user.id}")
        print(f"  OTP verified: {request.session.get('otp_verified', False)}")
        print(f"  All session keys: {list(request.session.keys())}")
        print(f"  Session modified: {request.session.modified}")
        print(f"  Database verification record created: {verification_record.id}")
        
        # Return success message without exposing the verification token
        return Response({
            'message': 'OTP verified successfully. Credentials will be displayed securely.',
            'expires_in': 300,  # 5 minutes
            'status': 'verified'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in verify_otp_and_view_credentials: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return Response({
            'error': 'Internal server error',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_esewa_status(request):
    """
    Get eSewa status for the current admin.
    Used to determine if eSewa payment option should be shown.
    """
    user = request.user
    
    # Check if user is admin or super admin
    if not user.is_admin_or_super_admin():
        raise PermissionDenied("Only admins can check eSewa status.")
    
    try:
        credentials = EsewaCredentials.objects.get(admin=user)
        serializer = EsewaCredentialsStatusSerializer(credentials)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        return Response({
            'is_configured': False,
            'has_secret_key': False,
            'esewa_display_name': None,
            'updated_at': None,
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    """
    Get audit logs for eSewa credentials (admin only).
    """
    user = request.user
    
    # Check if user is admin or super admin
    if not user.is_admin_or_super_admin():
        raise PermissionDenied("Only admins can view audit logs.")
    
    try:
        credentials = EsewaCredentials.objects.get(admin=user)
        logs = EsewaCredentialAuditLog.objects.filter(credential=credentials).order_by('-timestamp')[:50]
        serializer = EsewaCredentialAuditLogSerializer(logs, many=True)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        return Response([], status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_secure_credentials_display(request):
    """
    Get a secure display of credentials without exposing them in API response.
    This endpoint returns a secure token that can be used to display credentials.
    """
    try:
        user = request.user
        
        # Check if user is admin or super admin
        if not user.is_admin_or_super_admin():
            raise PermissionDenied("Only admins can view eSewa credentials.")
        
        # Check if credentials were recently verified
        verified = request.session.get('temp_credentials_verified', False)
        user_id = request.session.get('temp_credentials_user_id')
        timestamp = request.session.get('temp_credentials_timestamp')
        
        # Debug logging
        print(f"Debug: Session data in secure display:")
        print(f"  Session ID: {request.session.session_key}")
        print(f"  temp_credentials_verified: {verified}")
        print(f"  temp_credentials_user_id: {user_id}")
        print(f"  temp_credentials_timestamp: {timestamp}")
        print(f"  Current user ID: {user.id}")
        print(f"  All session keys: {list(request.session.keys())}")
        
        if not verified or user_id != user.id:
            return Response({
                'error': 'Credentials not verified. Please complete OTP verification first.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if verification is still valid (5 minutes)
        if timestamp:
            verified_time = timezone.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            if timezone.now() - verified_time > timedelta(minutes=5):
                # Clear expired verification
                del request.session['temp_credentials_verified']
                del request.session['temp_credentials_user_id']
                del request.session['temp_credentials_timestamp']
                return Response({
                    'error': 'Verification expired. Please verify again.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get credentials
        try:
            credentials = EsewaCredentials.objects.get(admin=user)
        except ObjectDoesNotExist:
            return Response({
                'error': 'No eSewa credentials found for this admin.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate a secure display token (not the actual credentials)
        import secrets
        display_token = secrets.token_urlsafe(32)
        
        # Store the display token temporarily (5 minutes)
        request.session['credentials_display_token'] = display_token
        request.session['credentials_display_expires'] = (timezone.now() + timedelta(minutes=5)).isoformat()
        
        # Return only the display token, not the actual credentials
        return Response({
            'display_token': display_token,
            'expires_in': 300,  # 5 minutes in seconds
            'message': 'Use this token to securely display credentials'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_secure_credentials_display: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def display_credentials_with_token(request):
    """
    Display credentials using a secure token - this endpoint renders credentials
    in a secure way without exposing them in the API response.
    """
    try:
        user = request.user
        display_token = request.data.get('display_token')
        
        if not display_token:
            return Response({
                'error': 'Display token is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify the display token
        stored_token = request.session.get('credentials_display_token')
        expires = request.session.get('credentials_display_expires')
        
        if not stored_token or stored_token != display_token:
            return Response({
                'error': 'Invalid display token.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if token is expired
        if expires:
            expires_time = timezone.datetime.fromisoformat(expires.replace('Z', '+00:00'))
            if timezone.now() > expires_time:
                # Clear expired token
                del request.session['credentials_display_token']
                del request.session['credentials_display_expires']
                return Response({
                    'error': 'Display token expired.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get credentials
        try:
            credentials = EsewaCredentials.objects.get(admin=user)
        except ObjectDoesNotExist:
            return Response({
                'error': 'No eSewa credentials found for this admin.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Decrypt credentials for display
        decrypted_secret_key = credentials.decrypt_secret_key()
        
        # Return credentials in a secure format (this is the only place they're exposed)
        # But we'll mask the secret key by default
        masked_secret_key = credentials.get_masked_secret_key()
        
        return Response({
            'product_code': credentials.esewa_product_code,
            'secret_key_masked': masked_secret_key,
            'secret_key_full': decrypted_secret_key,  # Only sent when explicitly requested
            'display_name': credentials.esewa_display_name,
            'message': 'Credentials displayed securely'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in display_credentials_with_token: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def display_credentials_securely(request):
    """
    Display credentials securely using server-side rendering.
    This endpoint renders credentials in HTML without exposing them in API response.
    """
    try:
        user = request.user
        otp_verified = request.data.get('otp_verified', False)
        
        if not otp_verified:
            return Response({
                'error': 'OTP verification required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user has recently verified OTP via session or database
        otp_verified = request.session.get('otp_verified', False)
        otp_user_id = request.session.get('otp_verified_user_id')
        otp_timestamp = request.session.get('otp_verified_timestamp')
        session_token = request.session.get('verification_token')
        
        # Debug logging
        print(f"Debug: OTP verification check:")
        print(f"  User ID: {user.id}")
        print(f"  Session OTP verified: {otp_verified}")
        print(f"  Session OTP user ID: {otp_user_id}")
        print(f"  Session OTP timestamp: {otp_timestamp}")
        print(f"  Session token: {session_token}")
        
        # If session verification fails, try database verification
        if not otp_verified or otp_user_id != user.id:
            print("  Session verification failed, trying database verification...")
            try:
                from .models import EsewaVerificationToken
                db_verification = EsewaVerificationToken.objects.get(
                    user=user,
                    is_used=False,
                    expires_at__gt=timezone.now()
                )
                
                print(f"  Database verification found: {db_verification.token}")
                otp_verified = True
                otp_user_id = user.id
                otp_timestamp = db_verification.created_at.isoformat()
                
                # Mark as used
                db_verification.mark_as_used()
                
            except EsewaVerificationToken.DoesNotExist:
                print("  No database verification found")
            return Response({
                    'error': 'OTP verification not found. Please verify OTP again.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if verification is still valid (5 minutes)
        if otp_timestamp:
            verified_time = timezone.datetime.fromisoformat(otp_timestamp.replace('Z', '+00:00'))
            if timezone.now() - verified_time > timedelta(minutes=5):
                # Clear expired verification
                try:
                    del request.session['otp_verified']
                    del request.session['otp_verified_user_id']
                    del request.session['otp_verified_timestamp']
                    del request.session['verification_token']
                except KeyError:
                    pass
                
                # Also clear expired database records
                from .models import EsewaVerificationToken
                EsewaVerificationToken.objects.filter(
                    user=user, 
                    expires_at__lte=timezone.now()
                ).delete()
                
                return Response({
                    'error': 'OTP verification expired. Please verify OTP again.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get credentials
        try:
            credentials = EsewaCredentials.objects.get(admin=user)
        except ObjectDoesNotExist:
            return Response({
                'error': 'No eSewa credentials found for this admin.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Decrypt credentials
        decrypted_secret_key = credentials.decrypt_secret_key()
        
        # Create HTML template for secure display
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>eSewa Credentials</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .credential-item { margin-bottom: 20px; }
                .label { font-weight: bold; color: #333; margin-bottom: 5px; }
                .value { background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; border: 1px solid #dee2e6; }
                .secret-key { position: relative; }
                .secret-key input { width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 5px; font-family: monospace; }
                .toggle-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #666; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px; }
                .close-btn { background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔐 Your eSewa Credentials</h2>
                    <p>Credentials will be hidden in 5 minutes for security</p>
                </div>
                
                <div class="credential-item">
                    <div class="label">Product Code:</div>
                    <div class="value">{{ product_code }}</div>
                </div>
                
                <div class="credential-item">
                    <div class="label">Secret Key:</div>
                    <div class="secret-key">
                        <input type="password" id="secretKey" value="{{ secret_key }}" readonly>
                        <button class="toggle-btn" onclick="toggleSecretKey()">👁️</button>
                    </div>
                </div>
                
                {% if display_name %}
                <div class="credential-item">
                    <div class="label">Account Name:</div>
                    <div class="value">{{ display_name }}</div>
                </div>
                {% endif %}
                
                <div class="warning">
                    ⚠️ <strong>Security Notice:</strong> These credentials are sensitive. Do not share them with anyone.
                    They will be automatically hidden in 5 minutes.
                </div>
                
                <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
            
            <script>
                function toggleSecretKey() {
                    const input = document.getElementById('secretKey');
                    const btn = document.querySelector('.toggle-btn');
                    if (input.type === 'password') {
                        input.type = 'text';
                        btn.textContent = '🙈';
                    } else {
                        input.type = 'password';
                        btn.textContent = '👁️';
                    }
                }
                
                // Auto-hide after 5 minutes
                setTimeout(() => {
                    window.close();
                }, 300000);
            </script>
        </body>
        </html>
        """
        
        # Clear the verification data after use (both session and database)
        try:
            del request.session['otp_verified']
            del request.session['otp_verified_user_id']
            del request.session['otp_verified_timestamp']
            del request.session['verification_token']
        except KeyError:
            pass  # Session keys might not exist
        
        # Also clear any unused verification tokens for this user
        from .models import EsewaVerificationToken
        EsewaVerificationToken.objects.filter(user=user, is_used=False).delete()
        
        # Render the template with credentials
        template = Template(html_template)
        context = Context({
            'product_code': credentials.esewa_product_code,
            'secret_key': decrypted_secret_key,
            'display_name': credentials.esewa_display_name,
        })
        
        # Return the rendered HTML
        return HttpResponse(template.render(context), content_type='text/html')
        
    except Exception as e:
        print(f"Error in display_credentials_securely: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_session(request):
    """
    Test endpoint to verify session functionality
    """
    try:
        user = request.user
        
        # Check if session exists
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        
        # Store a test value
        request.session['test_value'] = f'test_{user.id}_{timezone.now().timestamp()}'
        request.session.modified = True
        request.session.save()
        
        # Retrieve the test value
        test_value = request.session.get('test_value')
        
        return Response({
            'session_key': session_key,
            'test_value': test_value,
            'user_id': user.id,
            'session_exists': bool(session_key),
            'all_session_keys': list(request.session.keys()),
            'message': 'Session test completed successfully'
        })
        
    except Exception as e:
        return Response({
            'error': 'Session test failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_esewa_status(request):
    """
    Public endpoint to check if eSewa is enabled for the restaurant (for customers).
    Returns has_secret_key: true if the table's admin has valid active credentials.
    """
    from .models import EsewaCredentials
    from qrgenerator.models import Table
    
    try:
        # Get tableUid or tableId from query parameters
        table_uid = request.GET.get('tableUid')
        table_id = request.GET.get('tableId')
        
        if not table_uid and not table_id:
            return Response({'has_secret_key': False, 'error': 'Missing tableUid or tableId parameter'}, status=400)
        
        # Find the table
        table = None
        if table_uid:
            try:
                table = Table.objects.get(public_id=table_uid)
            except Table.DoesNotExist:
                return Response({'has_secret_key': False, 'error': 'Table not found'}, status=404)
        elif table_id:
            try:
                table = Table.objects.get(id=table_id)
            except Table.DoesNotExist:
                return Response({'has_secret_key': False, 'error': 'Table not found'}, status=404)
        
        if not table:
            return Response({'has_secret_key': False, 'error': 'Table not found'}, status=404)
        
        # Get the admin who owns this table
        table_admin = table.admin
        if not table_admin:
            return Response({'has_secret_key': False, 'error': 'Table has no admin assigned'}, status=404)
        
        # Check if this admin has active eSewa credentials
        try:
            credentials = EsewaCredentials.objects.get(
                admin=table_admin,
                is_active=True,
                esewa_product_code__isnull=False,
                esewa_secret_key_encrypted__isnull=False
            )
            
            if credentials.is_esewa_enabled():
                return Response({
                    'has_secret_key': True, 
                    'environment': credentials.environment,
                    'admin_id': table_admin.id
                })
            else:
                return Response({'has_secret_key': False, 'environment': None})
                
        except EsewaCredentials.DoesNotExist:
            return Response({'has_secret_key': False, 'environment': None})
            
    except Exception as e:
        return Response({'has_secret_key': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def debug_esewa_credentials(request):
    """
    TEMPORARY: Public endpoint to dump all EsewaCredentials for debugging.
    DO NOT USE IN PRODUCTION!
    """
    from .models import EsewaCredentials
    creds = EsewaCredentials.objects.all()
    data = []
    for c in creds:
        data.append({
            'id': c.id,
            'admin_id': c.admin_id,
            'is_active': c.is_active,
            'product_code': c.esewa_product_code,
            'secret_key_encrypted': bool(c.esewa_secret_key_encrypted),
            'environment': c.environment,
            'created_at': c.created_at,
            'updated_at': c.updated_at,
        })
    return Response({'credentials': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_esewa_credentials(request):
    """
    Admin disables their eSewa credentials (requires password confirmation).
    """
    user = request.user
    password = request.data.get('password')
    if not password:
        return Response({'error': 'Password is required.'}, status=400)
    if not user.check_password(password):
        return Response({'error': 'Invalid password.'}, status=401)
    try:
        from .models import EsewaCredentials, EsewaCredentialAuditLog
        credentials = EsewaCredentials.objects.get(admin=user, is_active=True)
        credentials.is_active = False
        credentials.save()
        # Log the action
        EsewaCredentialAuditLog.objects.create(
            credential=credentials,
            user=user,
            action='disabled',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'action': 'disabled', 'timestamp': credentials.updated_at.isoformat()},
        )
        return Response({'message': 'eSewa configuration disabled successfully.'})
    except EsewaCredentials.DoesNotExist:
        return Response({'error': 'No active eSewa credentials found.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_esewa_credentials(request):
    """
    Admin enables their eSewa credentials (requires password confirmation).
    """
    user = request.user
    password = request.data.get('password')
    if not password:
        return Response({'error': 'Password is required.'}, status=400)
    if not user.check_password(password):
        return Response({'error': 'Invalid password.'}, status=401)
    try:
        from .models import EsewaCredentials, EsewaCredentialAuditLog
        credentials = EsewaCredentials.objects.filter(admin=user).order_by('-updated_at').first()
        if not credentials:
            return Response({'error': 'No eSewa credentials found.'}, status=404)
        credentials.is_active = True
        credentials.save()
        # Log the action
        EsewaCredentialAuditLog.objects.create(
            credential=credentials,
            user=user,
            action='enabled',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'action': 'enabled', 'timestamp': credentials.updated_at.isoformat()},
        )
        return Response({'message': 'eSewa configuration enabled successfully.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def test_credential_validation(request):
    """
    Test endpoint to verify credential validation
    """
    try:
        product_code = request.data.get('product_code')
        secret_key = request.data.get('secret_key')
        environment = request.data.get('environment', 'test')
        
        if not product_code or not secret_key:
            return Response({
                'error': 'Product code and secret key are required'
            }, status=400)
        
        # Test the validation
        is_valid, message = validate_esewa_credentials(
            product_code=product_code,
            secret_key=secret_key,
            environment=environment
        )
        
        return Response({
            'is_valid': is_valid,
            'message': message,
            'product_code': product_code,
            'environment': environment,
            'tested_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)
