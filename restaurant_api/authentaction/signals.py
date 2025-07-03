from django.core.mail import send_mail
from django.conf import settings

def send_otp_email(user_email, otp_code, purpose):
    if purpose == 'signup':
        subject = 'Your Signup OTP Code'
        message = f'Your OTP code for signup is: {otp_code}'
    else:
        subject = 'Your Password Reset OTP Code'
        message = f'Your OTP code for password reset is: {otp_code}'
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user_email],
        fail_silently=False,
    )
