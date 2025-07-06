from django.urls import path
from .views import (
    EsewaCredentialsView, 
    initiate_credential_view, 
    verify_otp_and_view_credentials,
    get_esewa_status,
    get_audit_logs,
    get_secure_credentials_display,
    display_credentials_with_token,
    display_credentials_securely,
    test_session,
    public_esewa_status,
    debug_esewa_credentials,
    disable_esewa_credentials,
    enable_esewa_credentials,
    test_credential_validation
)

urlpatterns = [
    path('', EsewaCredentialsView.as_view(), name='esewa-credentials'),
    path('view/', initiate_credential_view, name='initiate-credential-view'),
    path('verify-otp/', verify_otp_and_view_credentials, name='verify-otp-and-view-credentials'),
    path('status/', get_esewa_status, name='get-esewa-status'),
    path('audit-logs/', get_audit_logs, name='get-audit-logs'),
    path('secure-display/', get_secure_credentials_display, name='get-secure-credentials-display'),
    path('display-with-token/', display_credentials_with_token, name='display-credentials-with-token'),
    path('display-securely/', display_credentials_securely, name='display-credentials-securely'),
    path('test-session/', test_session, name='test-session'),
    path('public-status/', public_esewa_status, name='public-esewa-status'),
    path('debug-esewa/', debug_esewa_credentials, name='debug-esewa-credentials'),
    path('disable/', disable_esewa_credentials, name='disable-esewa-credentials'),
    path('enable/', enable_esewa_credentials, name='enable-esewa-credentials'),
    path('test-validation/', test_credential_validation, name='test-credential-validation'),
]
