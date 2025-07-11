from django.urls import path
from . import views

app_name = 'billing'

urlpatterns = [
    # Subscription management
    path('subscription/status/', views.subscription_status, name='subscription-status'),
    path('subscription/create/', views.create_subscription, name='create-subscription'),
    path('subscription/dashboard/', views.subscription_dashboard, name='subscription-dashboard'),
    path('subscription/cancel/', views.cancel_subscription, name='cancel-subscription'),
    path('subscription/access/', views.check_subscription_access, name='check-access'),
    
    # Payment management
    path('payment/initiate/', views.initiate_subscription_payment, name='initiate-payment'),
    path('payment/verify/', views.verify_subscription_payment, name='verify-payment'),
    path('payment/success/', views.subscription_payment_success, name='payment-success'),
    path('payment/failure/', views.subscription_payment_failure, name='payment-failure'),
    
    # History and records
    path('billing/history/', views.billing_history, name='billing-history'),
    path('payment/history/', views.payment_history, name='payment-history'),
    
    # Admin views
    path('admin/subscriptions/', views.SubscriptionListView.as_view(), name='admin-subscription-list'),
    path('admin/subscriptions/<uuid:pk>/', views.SubscriptionDetailView.as_view(), name='admin-subscription-detail'),
    path('manual-payment/', views.manual_payment, name='manual_payment'),
    # Refund requests
    path('refund-request/', views.refund_request, name='refund-request'),
    path('refund-requests/', views.refund_requests, name='refund-requests'),
    path('all-refund-requests/', views.all_refund_requests, name='all-refund-requests'),
]
