from django.shortcuts import render
from django.contrib.auth import authenticate, update_session_auth_hash
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets
from .models import OTP, UserEvent
from UserRole.models import CustomUser
from .serializers import (
    OTPSerializer, UserEventSerializer
)
from .signals import send_otp_email
import random
from datetime import timedelta
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from datetime import datetime





class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        
        # Validate input
        if not all([name, email, password, confirm_password]):
            return Response({'error': 'All fields are required.'}, status=400)
        if password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=400)
        if CustomUser.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=400)
            
        try:
            # Create user with is_active=True and set as super_admin for main admin signups
            user = CustomUser.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=name,
                is_active=True,  # Set to True by default
                is_staff=True,
                role='super_admin'  # Explicitly set role to super_admin for main admin signups
            )
            
            # Generate and save OTP
            otp_code = str(random.randint(100000, 999999))
            otp = OTP.objects.create(
                user=user,
                code=otp_code,
                expires_at=timezone.now() + timedelta(minutes=10),
                purpose='signup'
            )
            
            # Send OTP email asynchronously to prevent blocking
            from .signals import send_otp_email_async
            import threading
            email_thread = threading.Thread(target=send_otp_email_async, args=(user.email, otp_code, 'signup'))
            email_thread.daemon = True
            email_thread.start()
            
            # Log signup event
            UserEvent.objects.create(
                user=user,
                event_type='signup',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
            
            # Generate tokens for immediate login
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'User created successfully. OTP sent to email.',
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.first_name,
                    'is_active': user.is_active
                }
            }, status=201)
            
        except Exception as e:
            return Response({'error': f'Error creating user: {str(e)}'}, status=500)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('otp')
        
        if not email or not code:
            return Response({'error': 'Email and OTP are required.'}, status=400)
            
        try:
            user = CustomUser.objects.get(email=email)
            otp = OTP.objects.filter(
                user=user,
                code=code,
                purpose='signup',
                is_used=False
            ).last()
            
            if not otp:
                return Response({'error': 'Invalid OTP.'}, status=400)
                
            if not otp.is_valid():
                return Response({'error': 'OTP has expired.'}, status=400)
                
            # Mark OTP as used
            otp.is_used = True
            otp.save()
            
            # Generate new tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'OTP verified successfully.',
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.first_name,
                    'is_active': user.is_active
                }
            })
            
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        except Exception as e:
            return Response({'error': f'Error verifying OTP: {str(e)}'}, status=500)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=400)
            
        try:
            # First check if user exists
            user_obj = CustomUser.objects.get(email=email)
            
            if not user_obj.is_active:
                return Response({'error': 'Account is not active. Please verify your email.'}, status=401)
            
            # Try multiple authentication methods for compatibility with Django admin
            
            # Method 1: Using username (email) auth
            user = authenticate(request, username=email, password=password)
            
            # Method 2: Using email auth
            if not user:
                user = authenticate(request, email=email, password=password)
            
            # Method 3: Direct password check for Django admin created users
            if not user and user_obj.check_password(password):
                user = user_obj
            
            if user is not None:
                refresh = RefreshToken.for_user(user)
                # Update last login
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                
                # Log login event
                UserEvent.objects.create(
                    user=user,
                    event_type='login',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
                
                # Determine redirect URL based on user role and permissions
                redirect_url = '/admin/'

                # For debugging, print user info
                print(f"\n{'='*50}\nLOGIN for user: {user.username}\nIs Employee: {user.is_employee}\nRole: {user.role}\n")

                # --- ADMIN SUBSCRIPTION/PAYMENT CHECK ---
                if not user.is_employee and (getattr(user, 'role', None) in ['super_admin', 'admin'] or getattr(user, 'is_superuser', False)):
                    try:
                        from Billing.models import Subscription, PaymentHistory
                        subscription = getattr(user, 'subscription', None)
                        if subscription and subscription.is_subscription_active:
                            has_successful_payment = subscription.payment_history.filter(is_successful=True).exists()
                            if has_successful_payment:
                                redirect_url = '/admin/welcome/'
                            else:
                                redirect_url = '/admin/subscribe/'
                        else:
                            redirect_url = '/admin/subscribe/'
                    except Exception as e:
                        print(f"Error in admin subscription/payment check: {e}")
                        redirect_url = '/admin/subscribe/'
                # --- END ADMIN SUBSCRIPTION/PAYMENT CHECK ---

                # If user is an employee, redirect to our custom admin with appropriate section
                if user.is_employee:
                    # Change default redirect to our custom admin site
                    redirect_url = '/restaurant/'
                    
                    # Get user permissions for more specific redirects
                    user_permissions = [str(p.id).lower() for p in user.custom_permissions.all()]
                    print(f"User permissions: {user_permissions}")
                    
                    # Comprehensive check for all permission variations (like in middleware)
                    order_perms = ['orders_view', 'orders_manage', 'order_view', 'order_manage', 'view_order', 'manage_order']
                    menu_perms = ['menu_view', 'menu_edit', 'menu_manage', 'view_menu', 'edit_menu', 'manage_menu']
                    customer_perms = ['customers_view', 'customers_manage', 'customer_view', 'customer_manage']
                    user_perms = ['users_view', 'users_manage', 'user_view', 'user_manage']
                    
                    # Check permissions more flexibly
                    has_order_perm = any(perm in [p.lower() for p in order_perms] for perm in user_permissions)
                    has_menu_perm = any(perm in [p.lower() for p in menu_perms] for perm in user_permissions)
                    has_customer_perm = any(perm in [p.lower() for p in customer_perms] for perm in user_permissions)
                    has_user_perm = any(perm in [p.lower() for p in user_perms] for perm in user_permissions)
                    
                    print(f"Permission check results - Orders: {has_order_perm}, Menu: {has_menu_perm}")
                    print(f"Customers: {has_customer_perm}, Users: {has_user_perm}")
                    
                    # Redirect based on permission priority - use explicit URLs with proper admin site prefix
                    try:
                        from django.urls import reverse
                        if has_order_perm:
                            print(f"Redirecting {user.username} to orders section")
                            redirect_url = reverse('restaurant_admin:qrgenerator_order_changelist')
                            print(f"Generated URL: {redirect_url}")
                        elif has_menu_perm:
                            print(f"Redirecting {user.username} to menu section")
                            redirect_url = reverse('restaurant_admin:our_menu_menuitem_changelist')
                        elif has_customer_perm:
                            print(f"Redirecting {user.username} to customer section")
                            redirect_url = reverse('restaurant_admin:qrgenerator_waitercall_changelist')
                        elif has_user_perm:
                            print(f"Redirecting {user.username} to user section")
                            redirect_url = reverse('restaurant_admin:UserRole_customuser_changelist')
                        else:
                            # If no specific permissions, still redirect to orders as fallback
                            print(f"No specific permissions found, using fallback")
                            redirect_url = reverse('restaurant_admin:qrgenerator_order_changelist')
                    except Exception as e:
                        # Fallback to hardcoded paths if reverse fails
                        print(f"Error generating reverse URL: {e}")
                        if has_order_perm:
                            redirect_url = '/restaurant/qrgenerator/order/'
                        elif has_menu_perm:
                            redirect_url = '/restaurant/our_menu/menuitem/'
                        elif has_customer_perm:
                            redirect_url = '/restaurant/qrgenerator/waitercall/'
                        elif has_user_perm:
                            redirect_url = '/restaurant/userrole/customuser/'
                        else:
                            redirect_url = '/restaurant/qrgenerator/order/'
                
                # Get user data for response
                user_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'is_active': user.is_active,
                    'permissions': {perm.id: True for perm in user.custom_permissions.all()},
                    'redirect_url': redirect_url  # Include redirect URL in the response
                }
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': user_data
                })
            else:
                return Response({'error': 'Invalid password. Please check your password and try again.'}, status=401)
        except CustomUser.DoesNotExist:
            return Response({'error': 'No account found with this email.'}, status=401)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        try:
            user = CustomUser.objects.get(email=email)
            otp_code = str(random.randint(100000, 999999))
            otp = OTP.objects.create(user=user, code=otp_code, expires_at=timezone.now() + timedelta(minutes=10), purpose='forgot')
            # Send OTP email asynchronously to prevent blocking
            from .signals import send_otp_email_async
            import threading
            email_thread = threading.Thread(target=send_otp_email_async, args=(user.email, otp_code, 'forgot'))
            email_thread.daemon = True
            email_thread.start()
            return Response({'message': 'OTP sent to email.'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('otp')
        new_password = request.data.get('new_password')
        try:
            user = CustomUser.objects.get(email=email)
            otp = OTP.objects.filter(user=user, code=code, purpose='forgot', is_used=False).last()
            if otp and otp.is_valid():
                user.set_password(new_password)
                user.save()
                otp.is_used = True
                otp.save()
                return Response({'message': 'Password reset successful.'})
            else:
                return Response({'error': 'Invalid or expired OTP.'}, status=400)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

class ProtectedHelloView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'message': f'Hello, {request.user.email}! This is a protected endpoint.'})

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        print(f"Changing password for user: {user.email} (id={user.id})")
        print(f"Request headers: {request.headers}")
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=400)
        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)
        return Response({'message': 'Password changed successfully.'})

class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            
            # Set access token cookie
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access_token,
                expires=datetime.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH']
            )
            
            # Set refresh token cookie
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                expires=datetime.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH']
            )
            
            # Remove tokens from response body
            response.data.pop('access', None)
            response.data.pop('refresh', None)
            
        return response

class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            request.data['refresh'] = refresh_token
            
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            access_token = response.data.get('access')
            new_refresh_token = response.data.get('refresh')
            
            # Set new access token cookie
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access_token,
                expires=datetime.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH']
            )
            
            # Set new refresh token cookie if provided
            if new_refresh_token:
                response.set_cookie(
                    key='refresh_token',
                    value=new_refresh_token,
                    expires=datetime.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                    path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH']
                )
            
            # Remove tokens from response body
            response.data.pop('access', None)
            response.data.pop('refresh', None)
            
        return response

def logout_view(request):
    response = Response({"detail": "Successfully logged out."})
    
    # Clear the cookies
    response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
    response.delete_cookie('refresh_token')
    
    return response
