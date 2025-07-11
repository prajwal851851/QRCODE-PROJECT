from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from Billing.models import Subscription
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = 'Send reminder emails to admins 1 day before their trial or subscription ends.'

    def handle(self, *args, **options):
        now = timezone.now()
        one_day_later = now + timedelta(days=1)
        start_of_window = one_day_later.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_window = one_day_later.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Get the renewal link from settings
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3003')
        renewal_url = f"{frontend_url}/admin/subscribe"

        # Find active subscriptions expiring in 1 day
        expiring_subs = Subscription.objects.filter(
            status='active',
            subscription_end_date__gte=start_of_window,
            subscription_end_date__lte=end_of_window
        )

        # Find trials expiring in 1 day
        expiring_trials = Subscription.objects.filter(
            status='trial',
            trial_end_date__isnull=False,
            trial_end_date__gte=start_of_window,
            trial_end_date__lte=end_of_window
        )

        count = 0
        for sub in expiring_subs:
            user_email = sub.admin.email
            send_mail(
                subject="Your Subscription Will Expire in 1 Day – QR Menu System",
                message="Your subscription will expire in 1 day. Please renew to avoid service interruption.",
                from_email="qrmenu851@gmail.com",
                recipient_list=[user_email],
                fail_silently=True,
                html_message=f"""
                    <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                      <h2 style='color:#eab308;'>Subscription Expiry Reminder</h2>
                      <p>Dear Admin,</p>
                      <p>This is a friendly reminder that your subscription will expire in <b>1 day</b> on <b>{sub.subscription_end_date.strftime('%Y-%m-%d')}</b>.</p>
                      <ul style='background:#fef9c3;padding:16px;border-radius:8px;'>
                        <li><b>Status:</b> Active</li>
                        <li><b>Renewal Required:</b> Please renew your subscription to avoid any interruption in service.</li>
                      </ul>
                      <p style='margin-top:16px;'>
                        <a href='{renewal_url}' style='background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>Renew Subscription</a>
                      </p>
                      <p style='margin-top:24px;'>Thank you for using QR Menu System!</p>
                      <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                      <p style='font-size:12px;color:#6b7280;'>If you have any questions, reply to this email or contact support.</p>
                    </div>
                """
            )
            count += 1

        for sub in expiring_trials:
            user_email = sub.admin.email
            send_mail(
                subject="Your Free Trial Will Expire in 1 Day – QR Menu System",
                message="Your free trial will expire in 1 day. Please subscribe to continue using the service.",
                from_email="qrmenu851@gmail.com",
                recipient_list=[user_email],
                fail_silently=True,
                html_message=f"""
                    <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                      <h2 style='color:#eab308;'>Trial Expiry Reminder</h2>
                      <p>Dear Admin,</p>
                      <p>This is a friendly reminder that your free trial will expire in <b>1 day</b> on <b>{sub.trial_end_date.strftime('%Y-%m-%d')}</b>.</p>
                      <ul style='background:#fef9c3;padding:16px;border-radius:8px;'>
                        <li><b>Status:</b> Trial</li>
                        <li><b>Action Required:</b> Please subscribe to continue using the QR Menu System.</li>
                      </ul>
                      <p style='margin-top:16px;'>
                        <a href='{renewal_url}' style='background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>Subscribe Now</a>
                      </p>
                      <p style='margin-top:24px;'>Thank you for trying QR Menu System!</p>
                      <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                      <p style='font-size:12px;color:#6b7280;'>If you have any questions, reply to this email or contact support.</p>
                    </div>
                """
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Sent {count} reminder emails for expiring subscriptions/trials.')) 