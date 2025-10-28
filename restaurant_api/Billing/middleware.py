from django.shortcuts import redirect
from django.conf import settings
import logging
logger = logging.getLogger(__name__)

class SubscriptionPaymentPendingMiddleware:
    """
    Middleware to force admins with pending payment subscriptions to the payment pending page.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Allow unauthenticated users to proceed
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return self.get_response(request)

        user = request.user
        if hasattr(user, 'role') and user.role == 'admin':
            subscription = getattr(user, 'subscription', None)
            status = getattr(subscription, 'status', None)
            logger.info(f"[SubscriptionPaymentPendingMiddleware] Admin {user.username} subscription status: {status}")
            if subscription and status == 'pending_payment':
                allowed_paths = [
                    '/admin/subscribe/payment-pending/',
                    '/admin/logout/',
                    '/logout/',
                ]
                if request.path not in allowed_paths:
                    if getattr(settings, 'DEBUG', False):
                        pending_url = 'http://localhost:3003/admin/subscribe/payment-pending'
                    else:
                        pending_url = 'https://qr-menu-code.netlify.app/admin/subscribe/payment-pending'
                    logger.info(f"[SubscriptionPaymentPendingMiddleware] Redirecting {user.username} to {pending_url} from {request.path}")
                    return redirect(pending_url)

        return self.get_response(request) 