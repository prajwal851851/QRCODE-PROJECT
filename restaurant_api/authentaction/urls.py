from django.urls import path
from .views import SignupView, VerifyOTPView, LoginView, ForgotPasswordView, ResetPasswordView, ProtectedHelloView, ChangePasswordView, CookieTokenObtainPairView, CookieTokenRefreshView, logout_view

urlpatterns = [
    path('token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('login/', LoginView.as_view(), name='login'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('protected-hello/', ProtectedHelloView.as_view(), name='protected-hello'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
