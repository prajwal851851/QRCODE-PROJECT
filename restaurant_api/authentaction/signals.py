from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags

def send_otp_email(user_email, otp_code, purpose):
    if purpose == 'signup':
        subject = 'Admin Account Verification - OTP'
        
        # HTML email content for signup
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Admin Account Verification</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #666; margin-bottom: 15px;">Hello there,</p>
                <p style="color: #666; margin-bottom: 15px;">You requested to create an admin account. Please use the following verification code:</p>
                <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                    {otp_code}
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
        
        # Plain text version for signup
        plain_message = f"""
        Admin Account Verification
        
        Hello there,
        
        You requested to create an admin account. Please use the following verification code:
        
        {otp_code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        For support, contact: qrmenu851@gmail.com
        """
        
    else:
        subject = 'Password Reset Verification - OTP'
        
        # HTML email content for password reset
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Password Reset Verification</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #666; margin-bottom: 15px;">Hello there,</p>
                <p style="color: #666; margin-bottom: 15px;">You requested to reset your password. Please use the following verification code:</p>
                <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                    {otp_code}
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
        
        # Plain text version for password reset
        plain_message = f"""
        Password Reset Verification
        
        Hello there,
        
        You requested to reset your password. Please use the following verification code:
        
        {otp_code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        For support, contact: qrmenu851@gmail.com
        """
    
    # Send email with HTML and plain text versions
    send_mail(
        subject,
        strip_tags(plain_message),
        settings.DEFAULT_FROM_EMAIL,
        [user_email],
        html_message=html_message,
        fail_silently=False,
    )
