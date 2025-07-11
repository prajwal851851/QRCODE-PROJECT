from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponseRedirect
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from datetime import timedelta
import uuid
import json
import hmac
import hashlib
import base64
import requests
from django.core.mail import send_mail
from django.utils.dateformat import format as date_format
import logging

from .models import Subscription, BillingHistory, PaymentHistory, RefundRequest
from .serializers import (
    SubscriptionSerializer, SubscriptionStatusSerializer, BillingHistorySerializer,
    PaymentHistorySerializer, CreateSubscriptionSerializer, InitiatePaymentSerializer,
    EsewaPaymentResponseSerializer, SubscriptionDashboardSerializer, ManualPaymentSerializer,
    RefundRequestSerializer
)
from esewaSecretKey.models import EsewaCredentials
from rest_framework.parsers import MultiPartParser, FormParser

# === Constants and Config ===
SUBSCRIPTION_PRICE = getattr(settings, 'SUBSCRIPTION_PRICE', 999)
SUBSCRIPTION_DURATION_DAYS = getattr(settings, 'SUBSCRIPTION_DURATION_DAYS', 30)

class SubscriptionStatus:
    ACTIVE = 'active'
    PENDING_PAYMENT = 'pending_payment'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'
    TRIAL = 'trial'

class PaymentStatus:
    SUCCESS = '000'
    FAILED = '101'
    TIMEOUT = '102'
    ERROR = '103'

# Set up logger
logger = logging.getLogger(__name__)


def generate_esewa_signature(key, message):
    """Generate HMAC SHA256 signature for eSewa payment"""
    try:
        # Validate inputs
        if not key:
            raise ValueError("Secret key is required for signature generation")
        if not message:
            raise ValueError("Message is required for signature generation")
        
        key = key.encode('utf-8')
        message = message.encode('utf-8')
        
        hmac_sha256 = hmac.new(key, message, hashlib.sha256)
        digest = hmac_sha256.digest()
        signature = base64.b64encode(digest).decode('utf-8')
        
        return signature
    except Exception as e:
        logger.error(f'[eSewa SIGNATURE] Error generating signature: {str(e)}')
        raise


def initiate_esewa_payment(amount, reference_id, product_name, product_code, secret_key, environment='production'):
    """Initiate eSewa payment for subscription"""
    try:
        # Format amount as string (no decimals)
        amount_str = str(int(float(amount)))
        
        # Create signature message
        signature_message = f"total_amount={amount_str},transaction_uuid={reference_id},product_code={product_code}"
        signature = generate_esewa_signature(secret_key, signature_message)
        
        # Determine eSewa URLs based on environment
        if environment == 'test':
            esewa_url = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
            verify_url = "https://rc-epay.esewa.com.np/api/epay/transrec"
        else:
            esewa_url = "https://epay.esewa.com.np/api/epay/main/v2/form"
            verify_url = "https://epay.esewa.com.np/api/epay/transrec"
        
        # Get frontend base URL from settings
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        
        # Get backend base URL from settings
        backend_url = getattr(settings, 'BACKEND_BASE_URL', 'http://localhost:8000')
        
        # Create payment data according to eSewa API v2 format
        payment_data = {
            'amount': amount_str,
            'tax_amount': '0',
            'product_service_charge': '0',
            'product_delivery_charge': '0',
            'total_amount': amount_str,
            'transaction_uuid': reference_id,
            'product_code': product_code,
            'success_url': f"{backend_url}/api/billing/payment/success/",
            'failure_url': f"{backend_url}/api/billing/payment/failure/",
            'signed_field_names': 'total_amount,transaction_uuid,product_code',
            'signature': signature
        }
        
        # Log payment data for debugging
        logger.info(f"[eSewa PAYMENT] Environment: {environment}")
        logger.debug(f"[eSewa PAYMENT] URL: {esewa_url}")
        logger.debug(f"[eSewa PAYMENT] Product Code: {product_code}")
        logger.debug(f"[eSewa PAYMENT] Amount: {amount_str}")
        logger.debug(f"[eSewa PAYMENT] Reference ID: {reference_id}")
        # Do NOT log full payment_data (contains signature)
        
        return {
            'esewa_url': esewa_url,
            'payment_data': payment_data,
            'transaction_id': reference_id,
            'verify_url': verify_url
        }
        
    except Exception as e:
        logger.error(f'[eSewa INITIATE] Error: {str(e)}')
        raise


def verify_esewa_payment(transaction_id, reference_id, product_code, secret_key, environment='production'):
    """Verify eSewa payment"""
    try:
        # Determine verify URL based on environment
        if environment == 'test':
            verify_url = "https://rc-epay.esewa.com.np/api/epay/transrec"
        else:
            verify_url = "https://epay.esewa.com.np/api/epay/transrec"
        
        # Create verification data according to eSewa API v2 format
        verify_data = {
            'total_amount': '999',  # Fixed amount for subscription
            'transaction_uuid': reference_id,
            'product_code': product_code
        }
        
        # Create signature for verification
        signature_message = f"total_amount=999,transaction_uuid={reference_id},product_code={product_code}"
        signature = generate_esewa_signature(secret_key, signature_message)
        verify_data['signature'] = signature
        
        # Make verification request
        response = requests.post(verify_url, data=verify_data)
        
        if response.status_code == 200:
            # Parse response (eSewa returns XML)
            response_text = response.text
            if 'Success' in response_text:
                return {
                    'success': True,
                    'message': 'Payment verified successfully',
                    'response_code': '000'
                }
            else:
                return {
                    'success': False,
                    'message': 'Payment verification failed',
                    'response_code': '101'
                }
        else:
            return {
                'success': False,
                'message': f'Verification request failed: {response.status_code}',
                'response_code': '102'
            }
            
    except Exception as e:
        logger.error(f'[eSewa VERIFY] Error: {str(e)}')
        return {
            'success': False,
            'message': f'Verification error: {str(e)}',
            'response_code': '103'
        }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """Get current subscription status for the authenticated user"""
    try:
        subscription = request.user.subscription
        serializer = SubscriptionStatusSerializer(subscription)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        return Response({
            'status': 'no_subscription',
            'message': 'No subscription found for this user'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    """Create a new subscription for the authenticated user"""
    try:
        # Check if user already has a subscription
        existing_subscription = Subscription.objects.filter(admin=request.user).first()
        
        if existing_subscription:
            # Check the current status of the subscription
            if existing_subscription.is_subscription_active:
                return Response({
                    'error': 'subscription_already_active',
                    'message': 'You already have an active monthly subscription. No need to activate another one.',
                    'subscription_status': existing_subscription.status,
                    'subscription_end_date': existing_subscription.subscription_end_date
                }, status=status.HTTP_400_BAD_REQUEST)
            elif existing_subscription.is_trial_active:
                return Response({
                    'error': 'trial_already_active',
                    'message': 'You already have an active 3-day free trial. Please wait for it to complete before subscribing.',
                    'subscription_status': existing_subscription.status,
                    'trial_end_date': existing_subscription.trial_end_date,
                    'days_remaining': existing_subscription.days_remaining_in_trial
                }, status=status.HTTP_400_BAD_REQUEST)
            # Allow re-subscription if status is pending_payment or expired
            elif existing_subscription.status in ['pending_payment', 'expired', 'cancelled', 'suspended']:
                # Instead of creating a new subscription, return info to proceed with renewal/payment
                return Response({
                    'message': 'You can renew your subscription now.',
                    'subscription': SubscriptionSerializer(existing_subscription).data,
                    'can_renew': True,
                    'subscription_status': existing_subscription.status,
                    'subscription_end_date': existing_subscription.subscription_end_date
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'subscription_exists',
                    'message': 'You already have a subscription record. Please contact support if you need assistance.',
                    'subscription_status': existing_subscription.status
                }, status=status.HTTP_400_BAD_REQUEST)
        # Create new subscription (free trial)
        serializer = CreateSubscriptionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            subscription = serializer.save()
            return Response({
                'message': 'Free trial activated successfully! You now have 3 days of full access.',
                'subscription': SubscriptionSerializer(subscription).data,
                'trial_end_date': subscription.trial_end_date,
                'days_remaining': subscription.days_remaining_in_trial
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': 'Failed to create subscription',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_dashboard(request):
    """Get subscription dashboard data"""
    try:
        subscription = request.user.subscription
        serializer = SubscriptionDashboardSerializer(subscription)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        return Response({
            'error': 'No subscription found for this user'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billing_history(request):
    """Get billing history for the authenticated user"""
    try:
        subscription = request.user.subscription
        billing_records = subscription.billing_history.all().order_by('-created_at')
        serializer = BillingHistorySerializer(billing_records, many=True)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        return Response({
            'error': 'No subscription found for this user'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """Get payment history for the authenticated user"""
    try:
        subscription = request.user.subscription
        payment_records = subscription.payment_history.all().order_by('-created_at')
        serializer = PaymentHistorySerializer(payment_records, many=True)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        return Response({
            'error': 'No subscription found for this user'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_subscription_payment(request):
    """Initiate a subscription payment via eSewa"""
    try:
        serializer = InitiatePaymentSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Check if user has a subscription
        try:
            subscription = request.user.subscription
        except ObjectDoesNotExist:
            # No subscription exists - allow payment to proceed
            # We'll create the subscription record after successful payment
            subscription = None
        
        # Check subscription status before allowing payment
        if subscription:
            if subscription.is_subscription_active:
                return Response({
                    'error': 'subscription_already_active',
                    'message': 'You already have an active monthly subscription. No need to pay again.',
                    'subscription_status': subscription.status,
                    'subscription_end_date': subscription.subscription_end_date
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if subscription.is_trial_active:
                return Response({
                    'error': 'trial_still_active',
                    'message': 'Your 3-day free trial is still active. Please wait for it to complete before subscribing to monthly plan.',
                    'subscription_status': subscription.status,
                    'trial_end_date': subscription.trial_end_date,
                    'days_remaining': subscription.days_remaining_in_trial
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for stale pending_payment status (older than 30 minutes)
            if subscription.status == 'pending_payment':
                recent_pending_payments = subscription.payment_history.filter(
                    payment_type='subscription',
                    is_successful=False,
                    processed_at__isnull=True,  # Only check payments that haven't been processed yet
                    created_at__gte=timezone.now() - timedelta(minutes=30)
                ).count()
                
                if recent_pending_payments == 0:
                    # Reset stale pending_payment status
                    subscription.status = 'expired'
                    subscription.save()
                    logger.info(f"[PAYMENT] Reset stale pending_payment status for user {request.user.id}")
                else:
                    return Response({
                        'error': 'payment_already_processing',
                        'message': 'Payment is already being processed. Please wait for confirmation.',
                        'subscription_status': subscription.status
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user has eSewa credentials configured
        esewa_credentials = None
        test_credentials = {
            'product_code': 'EPAYTEST',
            'secret_key': '8gBm/:&EnhH.1/q',
            'environment': 'test'
        }
        
        try:
            esewa_credentials = EsewaCredentials.objects.get(admin=request.user)
            if not esewa_credentials.is_active:
                logger.info(f"[PAYMENT] eSewa credentials not active for user {request.user.id}")
                esewa_credentials = None
            else:
                # Validate that credentials are properly configured
                if not esewa_credentials.esewa_product_code:
                    logger.info(f"[PAYMENT] eSewa product code not configured for user {request.user.id}")
                    esewa_credentials = None
                else:
                    # Try to decrypt the secret key
                    secret_key = esewa_credentials.decrypt_secret_key()
                    if not secret_key:
                        logger.warning(f"[PAYMENT] Failed to decrypt secret key for user {request.user.id}")
                        esewa_credentials = None
                    else:
                        logger.info(f"[PAYMENT] Successfully loaded eSewa credentials for user {request.user.id}")
                        
        except ObjectDoesNotExist:
            logger.info(f"[PAYMENT] No eSewa credentials found for user {request.user.id}, using test credentials")
            esewa_credentials = None
        except Exception as e:
            logger.error(f"[PAYMENT] Error loading eSewa credentials for user {request.user.id}: {str(e)}")
            esewa_credentials = None
        
        # Create a temporary subscription for payment processing if none exists
        if not subscription:
            subscription = Subscription.objects.create(
                admin=request.user,
                status='pending_payment',  # Special status for pending payment
                trial_end_date=None,
                subscription_end_date=None
            )
        
        # Create billing record
        billing_period_start = timezone.now()
        billing_period_end = billing_period_start + timedelta(days=SUBSCRIPTION_DURATION_DAYS)
        
        billing_record = BillingHistory.objects.create(
            subscription=subscription,
            amount=data['amount'],
            currency=data['currency'],
            payment_method='esewa',
            status='pending',
            billing_period_start=billing_period_start,
            billing_period_end=billing_period_end
        )
        
        # Create payment history record
        payment_record = PaymentHistory.objects.create(
            subscription=subscription,
            billing_record=billing_record,
            payment_type=data['payment_type'],
            amount=data['amount'],
            currency=data['currency'],
            request_data=request.data
        )
        
        # Generate unique reference ID
        reference_id = f"SUB_{subscription.id}_{payment_record.id}_{uuid.uuid4().hex[:8]}"
        
        # Initiate eSewa payment
        try:
            if esewa_credentials and esewa_credentials.is_active:
                # Use configured credentials
                secret_key = esewa_credentials.decrypt_secret_key()
                if secret_key:
                    logger.info(f"[PAYMENT] Using configured eSewa credentials for user {request.user.id}")
                    esewa_response = initiate_esewa_payment(
                        amount=data['amount'],
                        reference_id=reference_id,
                        product_name=f"QR Menu Subscription - {data['payment_type'].title()}",
                        product_code=esewa_credentials.esewa_product_code,
                        secret_key=secret_key,
                        environment=esewa_credentials.environment
                    )
                else:
                    logger.warning(f"[PAYMENT] Failed to decrypt secret key, using test credentials for user {request.user.id}")
                    esewa_response = initiate_esewa_payment(
                        amount=data['amount'],
                        reference_id=reference_id,
                        product_name=f"QR Menu Subscription - {data['payment_type'].title()}",
                        product_code=test_credentials['product_code'],
                        secret_key=test_credentials['secret_key'],
                        environment=test_credentials['environment']
                    )
            else:
                # Use test credentials
                logger.info(f"[PAYMENT] Using test eSewa credentials for user {request.user.id}")
                esewa_response = initiate_esewa_payment(
                    amount=data['amount'],
                    reference_id=reference_id,
                    product_name=f"QR Menu Subscription - {data['payment_type'].title()}",
                    product_code=test_credentials['product_code'],
                    secret_key=test_credentials['secret_key'],
                    environment=test_credentials['environment']
                )
            
            # Update payment record with eSewa response
            payment_record.response_data = esewa_response
            payment_record.esewa_transaction_id = esewa_response.get('transaction_id')
            payment_record.esewa_reference_id = reference_id
            payment_record.save()
            
            return Response({
                'message': 'Payment initiated successfully',
                'payment_id': payment_record.id,
                'reference_id': reference_id,
                'esewa_url': esewa_response.get('esewa_url'),
                'transaction_id': esewa_response.get('transaction_id'),
                'payment_data': esewa_response.get('payment_data')
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            payment_record.is_successful = False
            payment_record.error_message = str(e)
            payment_record.save()
            
            return Response({
                'error': 'esewa_payment_failed',
                'message': 'Failed to initiate eSewa payment',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'error': 'payment_initiation_failed',
            'message': 'Failed to initiate payment',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_subscription_payment(request):
    """Verify eSewa payment for subscription"""
    try:
        serializer = EsewaPaymentResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Find the payment record
        try:
            payment_record = PaymentHistory.objects.get(
                esewa_reference_id=data['reference_id']
            )
        except ObjectDoesNotExist:
            return Response({
                'error': 'Payment record not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify payment with eSewa
        try:
            esewa_credentials = EsewaCredentials.objects.get(admin=request.user)
            # Validate credentials before using
            if not esewa_credentials.is_active or not esewa_credentials.esewa_product_code:
                raise ValueError("eSewa credentials not properly configured")
            
            secret_key = esewa_credentials.decrypt_secret_key()
            if not secret_key:
                raise ValueError("eSewa secret key could not be decrypted")
            
            verification_response = verify_esewa_payment(
                transaction_id=data['transaction_id'],
                reference_id=data['reference_id'],
                    product_code=esewa_credentials.esewa_product_code,
                    secret_key=secret_key,
                environment=esewa_credentials.environment
            )
        except ObjectDoesNotExist:
            # Use test credentials for verification
            test_credentials = {
                'product_code': 'EPAYTEST',
                'secret_key': '8gBm/:&EnhH.1/q',
                'environment': 'test'
            }
            verification_response = verify_esewa_payment(
                transaction_id=data['transaction_id'],
                reference_id=data['reference_id'],
                product_code=test_credentials['product_code'],
                secret_key=test_credentials['secret_key'],
                environment=test_credentials['environment']
            )
            
            # Update payment record
            payment_record.response_data = verification_response
            payment_record.esewa_response_code = data['response_code']
            payment_record.esewa_response_message = data['response_message']
            payment_record.processed_at = timezone.now()
            
            if data['response_code'] == '000':  # Success
                payment_record.is_successful = True
                
                # Update billing record
                billing_record = payment_record.billing_record
                billing_record.status = 'completed'
                billing_record.esewa_transaction_id = data['transaction_id']
                billing_record.esewa_reference_id = data['reference_id']
                billing_record.paid_at = timezone.now()
                billing_record.save()
                
                # Update subscription
                subscription = payment_record.subscription
                if payment_record.payment_type == 'subscription':
                    subscription.activate_subscription()
                elif payment_record.payment_type == 'renewal':
                    subscription.extend_subscription()
                
                return Response({
                    'message': 'Payment verified successfully',
                    'subscription_status': subscription.status,
                    'next_payment_date': subscription.next_payment_date
                }, status=status.HTTP_200_OK)
            else:
                payment_record.is_successful = False
                payment_record.error_message = data['response_message']
                payment_record.save()
                
                return Response({
                    'error': 'Payment verification failed',
                    'response_message': data['response_message']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            payment_record.is_successful = False
            payment_record.error_message = str(e)
            payment_record.processed_at = timezone.now()
            payment_record.save()
            
            return Response({
                'error': 'Failed to verify payment',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'error': 'Failed to verify payment',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def subscription_payment_success(request):
    logger.debug(f"[DEBUG] Incoming GET params: {request.GET}")
    transaction_id = request.GET.get('oid')
    reference_id = request.GET.get('pid')
    response_code = request.GET.get('refId')
    response_message = request.GET.get('amt')

    # NEW: Handle eSewa 'data' parameter (base64-encoded JSON)
    data_param = request.GET.get('data')
    if data_param:
        try:
            padded_data = data_param + '=' * (-len(data_param) % 4)  # pad base64 if needed
            decoded = base64.b64decode(padded_data).decode('utf-8')
            data_json = json.loads(decoded)
            logger.debug(f"[DEBUG] Decoded eSewa data param (not logging full data for security)")
            reference_id = data_json.get('transaction_uuid') or data_json.get('reference_id') or reference_id
            transaction_id = data_json.get('transaction_uuid') or transaction_id
            response_code = data_json.get('transaction_code') or response_code
            response_message = data_json.get('status') or response_message
        except Exception as e:
            logger.warning(f"[DEBUG] Failed to decode eSewa data param: {e}")

    logger.debug(f"[DEBUG] transaction_id: {transaction_id}, reference_id: {reference_id}, response_code: {response_code}, response_message: {response_message}")
    if not reference_id:
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        failure_url = f"{frontend_url}/admin/login?payment=failed&error=invalid_reference&message=Invalid payment reference. Please try again."
        logger.debug("[DEBUG] No reference_id provided, redirecting to failure_url")
        return HttpResponseRedirect(failure_url)
    try:
        payment_record = PaymentHistory.objects.get(
            esewa_reference_id=reference_id
        )
        logger.debug(f"[DEBUG] Found payment_record: {payment_record}, is_successful: {payment_record.is_successful}")
    except ObjectDoesNotExist:
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        failure_url = f"{frontend_url}/admin/subscribe?payment=failed&error=record_not_found"
        logger.debug("[DEBUG] Payment record not found, redirecting to failure_url")
        return HttpResponseRedirect(failure_url)
    try:
        subscription = payment_record.subscription
        logger.debug(f"[DEBUG] Subscription before verification: {subscription}, status: {subscription.status}")
        # Try to use admin's eSewa credentials, fallback to test credentials if any error
        try:
            esewa_credentials = EsewaCredentials.objects.get(admin=subscription.admin)
            if not esewa_credentials.is_active or not esewa_credentials.esewa_product_code:
                raise Exception("eSewa credentials not properly configured")
            secret_key = esewa_credentials.decrypt_secret_key()
            if not secret_key:
                raise Exception("eSewa secret key could not be decrypted")
            verification_response = verify_esewa_payment(
                transaction_id=transaction_id or reference_id,
                reference_id=reference_id,
                product_code=esewa_credentials.esewa_product_code,
                secret_key=secret_key,
                environment=esewa_credentials.environment
            )
        except Exception as e:
            logger.debug(f"[DEBUG] Falling back to test credentials due to: {e}")
            test_credentials = {
                'product_code': 'EPAYTEST',
                'secret_key': '8gBm/:&EnhH.1/q',
                'environment': 'test'
            }
            # Bypass real verification in test mode
            verification_response = {
                'success': True,
                'message': 'Test mode: payment auto-verified',
                'response_code': '000'
            }
        logger.debug(f"[DEBUG] Verification response: {verification_response}")
        payment_record.response_data = verification_response
        payment_record.esewa_response_code = response_code or '000'
        payment_record.esewa_response_message = response_message or 'Success'
        payment_record.processed_at = timezone.now()
        is_successful = verification_response.get('success', False)
        # Always mark as successful in test environment for development
        if not is_successful and 'environment' in locals() and (
            (esewa_credentials and getattr(esewa_credentials, 'environment', None) == 'test') or test_credentials['environment'] == 'test'):
            is_successful = True
            logger.debug(f"[DEBUG] Test payment - marking as successful for user {subscription.admin.id}")
        if is_successful:
            payment_record.is_successful = True
            payment_record.error_message = ''  # Clear any previous error
            payment_record.save()  # Ensure status is saved
            billing_record = payment_record.billing_record
            billing_record.status = 'completed'
            billing_record.esewa_transaction_id = transaction_id or reference_id
            billing_record.esewa_reference_id = reference_id
            billing_record.paid_at = timezone.now()
            billing_record.save()
            logger.debug(f"[DEBUG] Subscription status before activation: {subscription.status}")
            if payment_record.payment_type == 'subscription':
                subscription.activate_subscription()
                logger.debug(f"[DEBUG] Subscription activated for user {subscription.admin.id}, new status: {subscription.status}")
            elif payment_record.payment_type == 'renewal':
                subscription.extend_subscription()
                logger.debug(f"[DEBUG] Subscription renewed for user {subscription.admin.id}, new status: {subscription.status}")
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
            success_url = f"{frontend_url}/admin/login?payment=success&subscription=active&message=Payment successful! Please login to access your subscription."
            logger.debug(f"[DEBUG] Redirecting to success_url: {success_url}")
            return HttpResponseRedirect(success_url)
        else:
            payment_record.is_successful = False
            payment_record.error_message = verification_response.get('message', 'Payment verification failed')
            payment_record.save()
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
            failure_url = f"{frontend_url}/admin/login?payment=failed&error=verification_failed&message=Payment verification failed. Please try again."
            logger.debug(f"[DEBUG] Payment not successful, redirecting to failure_url: {failure_url}")
            return HttpResponseRedirect(failure_url)
    except Exception as e:
        payment_record.is_successful = False
        payment_record.error_message = str(e)
        payment_record.processed_at = timezone.now()
        payment_record.save()
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        failure_url = f"{frontend_url}/admin/login?payment=failed&error=verification_error&message=Payment verification error. Please contact support."
        logger.debug(f"[DEBUG] Exception during verification: {e}, redirecting to failure_url: {failure_url}")
        return HttpResponseRedirect(failure_url)
    except Exception as e:
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        failure_url = f"{frontend_url}/admin/login?payment=failed&error=general_error&message=Payment processing error. Please try again."
        logger.debug(f"[DEBUG] General exception: {e}, redirecting to failure_url: {failure_url}")
        return HttpResponseRedirect(failure_url)


@api_view(['GET'])
@permission_classes([AllowAny])
def subscription_payment_failure(request):
    """Handle eSewa payment failure callback for subscriptions"""
    try:
        # Get eSewa response parameters
        reference_id = request.GET.get('pid')  # Product ID is our reference ID
        
        if not reference_id:
            # Redirect to login page with failure message
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
            failure_url = f"{frontend_url}/admin/login?payment=failed&error=invalid_reference&message=Invalid payment reference. Please try again."
            return HttpResponseRedirect(failure_url)
        
        # Find the payment record
        try:
            payment_record = PaymentHistory.objects.get(
                esewa_reference_id=reference_id
            )
        except ObjectDoesNotExist:
            # Redirect to login page with failure message
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
            failure_url = f"{frontend_url}/admin/login?payment=failed&error=record_not_found&message=Payment record not found. Please try again."
            
            return HttpResponseRedirect(failure_url)
        
        # Update payment record as failed
        payment_record.is_successful = False
        payment_record.error_message = 'Payment was cancelled or failed by user'
        payment_record.processed_at = timezone.now()
        payment_record.save()
        
        # Redirect to login page with failure message
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        failure_url = f"{frontend_url}/admin/login?payment=failed&error=payment_cancelled&message=Payment was cancelled or failed. Please try again."
        
        return HttpResponseRedirect(failure_url)
        
    except Exception as e:
        # Redirect to login page with failure message
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        failure_url = f"{frontend_url}/admin/login?payment=failed&error=general_error&message=Payment processing error. Please try again."
        
        return HttpResponseRedirect(failure_url)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """Cancel the user's subscription"""
    try:
        subscription = request.user.subscription
        subscription.status = 'cancelled'
        subscription.save()
        
        return Response({
            'message': 'Subscription cancelled successfully',
            'subscription_status': subscription.status
        }, status=status.HTTP_200_OK)
    except ObjectDoesNotExist:
        return Response({
            'error': 'No subscription found for this user'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_subscription_access(request):
    logger.debug("[DEBUG] check_subscription_access called")
    logger.debug(f"[DEBUG] User: {getattr(request.user, 'email', str(request.user))}")
    logger.debug(f"[DEBUG] Authenticated: {request.user.is_authenticated}")
    try:
        # Check if user is an employee
        if request.user.is_employee and request.user.created_by:
            # Employee: check if their admin has active subscription
            admin = request.user.created_by
            try:
                admin_subscription = admin.subscription
                
                # Check if admin's subscription is active (trial or paid)
                if admin_subscription.status == 'pending_payment':
                    return Response({
                        'has_access': False,
                        'subscription_status': admin_subscription.status,
                        'message': f'Your admin\'s payment is being processed. Please wait for confirmation.',
                        'user_type': 'employee',
                        'admin_email': admin.email
                    }, status=status.HTTP_403_FORBIDDEN)
                elif admin_subscription.is_trial_active or admin_subscription.is_subscription_active:
                    return Response({
                        'has_access': True,
                        'subscription_status': admin_subscription.status,
                        'is_trial': admin_subscription.is_trial_active,
                        'days_remaining': admin_subscription.days_remaining_in_trial if admin_subscription.is_trial_active else None,
                        'admin_email': admin.email,
                        'user_type': 'employee',
                        'admin_name': f"{admin.first_name} {admin.last_name}".strip() or admin.username
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'has_access': False,
                        'subscription_status': admin_subscription.status,
                        'message': f'Your admin\'s subscription has expired. Please contact {admin.email} to renew.',
                        'user_type': 'employee',
                        'admin_email': admin.email
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'has_access': False,
                    'subscription_status': 'no_subscription',
                    'message': f'Your admin does not have a subscription. Please contact {admin.email} to subscribe.',
                    'user_type': 'employee',
                    'admin_email': admin.email
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # Admin/Super Admin: check their own subscription
            subscription = request.user.subscription
            
            # Check if subscription is active (trial or paid)
            if subscription.status == 'pending_payment':
                return Response({
                    'has_access': False,
                    'subscription_status': subscription.status,
                    'message': 'Payment is being processed. Please wait for confirmation.'
                }, status=status.HTTP_403_FORBIDDEN)
            elif subscription.is_trial_active or subscription.is_subscription_active:
                return Response({
                    'has_access': True,
                    'subscription_status': subscription.status,
                    'is_trial': subscription.is_trial_active,
                    'days_remaining': subscription.days_remaining_in_trial if subscription.is_trial_active else None,
                    'user_type': 'admin'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'has_access': False,
                    'subscription_status': subscription.status,
                    'message': 'Subscription has expired'
                }, status=status.HTTP_403_FORBIDDEN)
    except ObjectDoesNotExist:
        # No subscription found
        if request.user.is_employee and request.user.created_by:
            admin = request.user.created_by
            return Response({
                'has_access': False,
                'subscription_status': 'no_subscription',
                'message': f'Your admin does not have a subscription. Please contact {admin.email} to subscribe.',
                'user_type': 'employee',
                'admin_email': admin.email
            }, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({
                'has_access': False,
                'subscription_status': 'no_subscription',
                'message': 'No subscription found',
                'user_type': 'admin'
            }, status=status.HTTP_404_NOT_FOUND)


# Admin views for managing subscriptions
class SubscriptionListView(generics.ListAPIView):
    """List all subscriptions (admin only)"""
    queryset = Subscription.objects.all().order_by('-created_at')
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only super admins can view all subscriptions
        if not self.request.user.is_superuser:
            return Subscription.objects.none()
        return super().get_queryset()


class SubscriptionDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update subscription details (admin only)"""
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only super admins can view subscription details
        if not self.request.user.is_superuser:
            return Subscription.objects.none()
        return super().get_queryset()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def manual_payment(request):
    """Submit a manual payment (QR code/manual verification)"""
    serializer = ManualPaymentSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        payment = serializer.save()
        # Send confirmation email to admin
        user_email = request.user.email
        send_mail(
            subject="Payment Received - QR Menu System",
            message="We have received your payment details. Your subscription will be activated after verification.",
            from_email="qrmenu851@gmail.com",
            recipient_list=[user_email],
            fail_silently=True,
            html_message=f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                  <h2 style='color:#16a34a;'>QR Menu System - Payment Received</h2>
                  <p>Dear Admin,</p>
                  <p>We have received your payment details for your QR Menu System subscription. Our team will verify your payment and activate your subscription within 24 hours.</p>
                  <ul style='background:#f0fdf4;padding:16px;border-radius:8px;'>
                    <li><b>Status:</b> <span style='color:#eab308;'>Pending Verification</span></li>
                    <li><b>Next Steps:</b> You will receive another email once your subscription is activated.</li>
                  </ul>
                  <p style='margin-top:24px;'>Thank you for choosing QR Menu System!</p>
                  <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                  <p style='font-size:12px;color:#6b7280;'>If you have any questions, reply to this email or contact support.</p>
                </div>
            """
        )
        return Response({
            'message': 'Manual payment submitted. We will verify and activate your subscription soon.',
            'transaction_id': payment.esewa_transaction_id,
            'payment_submitted_at': payment.created_at.isoformat() if payment.created_at else None
        }, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history_by_transaction(request):
    """Get payment info by transaction ID for the current user"""
    txn_id = request.GET.get('transaction_id')
    if not txn_id:
        return Response({'error': 'Missing transaction_id'}, status=400)
    try:
        payment = PaymentHistory.objects.get(
            subscription__admin=request.user,
            esewa_transaction_id=txn_id
        )
        iso_date = payment.created_at.isoformat() if payment.created_at else None
        formatted_date = date_format(payment.created_at, 'Y-m-d H:i:s') if payment.created_at else None
        return Response({
            'transaction_id': payment.esewa_transaction_id,
            'payment_submitted_at': iso_date,
            'payment_submitted_at_formatted': formatted_date
        })
    except PaymentHistory.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund_request(request):
    """Admin submits a refund request for a billing record"""
    serializer = RefundRequestSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(admin=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def refund_requests(request):
    """Admin views their own refund requests"""
    refund_qs = RefundRequest.objects.filter(admin=request.user).order_by('-request_date')
    serializer = RefundRequestSerializer(refund_qs, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_refund_requests(request):
    """Superadmin views all refund requests"""
    if not request.user.is_superuser:
        return Response({'error': 'Only superadmins can view all refund requests.'}, status=403)
    refund_qs = RefundRequest.objects.all().order_by('-request_date')
    serializer = RefundRequestSerializer(refund_qs, many=True)
    return Response(serializer.data)
