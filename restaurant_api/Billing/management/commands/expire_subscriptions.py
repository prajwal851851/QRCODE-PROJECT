from django.core.management.base import BaseCommand
from Billing.models import Subscription
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = 'Expire subscriptions that have passed their end date'

    def handle(self, *args, **options):
        now = timezone.now()
        # Send reminder 1 day before subscription end
        one_day_later = now + timezone.timedelta(days=1)
        soon_expiring = Subscription.objects.filter(
            status='active',
            subscription_end_date__date=one_day_later.date()
        )
        for sub in soon_expiring:
            user_email = sub.admin.email
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://qr-menu-code.netlify.app')
            subscription_url = f"{frontend_url}/admin/subscribe"
            end_date = sub.subscription_end_date.strftime('%B %d, %Y') if sub.subscription_end_date else 'soon'
            send_mail(
                subject="Your Subscription is Expiring Soon – Action Required",
                message=f"Your subscription will expire on {end_date}. Please renew to avoid interruption.",
                from_email="qrmenu851@gmail.com",
                recipient_list=[user_email],
                fail_silently=True,
                html_message=f"""
                    <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                      <h2 style='color:#eab308;'>Subscription Expiry Reminder</h2>
                      <p>Dear Admin,</p>
                      <p>Your subscription will expire on <b style='color:#eab308;'>{end_date}</b>.</p>
                      <ul style='background:#fef9c3;padding:16px;border-radius:8px;'>
                        <li><b>Status:</b> Active</li>
                        <li><b>Expiry Date:</b> {end_date}</li>
                        <li><b>Renewal Required:</b> Please renew your subscription to avoid service interruption.</li>
                      </ul>
                      <p style='margin-top:16px;'>
                        <a href='{subscription_url}' style='background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>Renew Subscription</a>
                      </p>
                      <p style='margin-top:24px;'>If you have any questions, reply to this email or contact support.</p>
                      <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                      <p style='font-size:12px;color:#6b7280;'>Thank you for using QR Menu System.</p>
                    </div>
                """
            )
        # Send reminder 1 day before trial end
        soon_trial_expiring = Subscription.objects.filter(
            status='trial',
            trial_end_date__isnull=False,
            trial_end_date__date=one_day_later.date()
        )
        for sub in soon_trial_expiring:
            user_email = sub.admin.email
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://qr-menu-code.netlify.app')
            subscription_url = f"{frontend_url}/admin/subscribe"
            end_date = sub.trial_end_date.strftime('%B %d, %Y') if sub.trial_end_date else 'soon'
            send_mail(
                subject="Your Free Trial is Ending Soon – Action Required",
                message=f"Your free trial will expire on {end_date}. Please subscribe to continue using the service.",
                from_email="qrmenu851@gmail.com",
                recipient_list=[user_email],
                fail_silently=True,
                html_message=f"""
                    <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
                      <h2 style='color:#eab308;'>Trial Expiry Reminder</h2>
                      <p>Dear Admin,</p>
                      <p>Your free trial will expire on <b style='color:#eab308;'>{end_date}</b>.</p>
                      <ul style='background:#fef9c3;padding:16px;border-radius:8px;'>
                        <li><b>Status:</b> Trial</li>
                        <li><b>Expiry Date:</b> {end_date}</li>
                        <li><b>Action Required:</b> Please subscribe to continue using the QR Menu System.</li>
                      </ul>
                      <p style='margin-top:16px;'>
                        <a href='{subscription_url}' style='background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>Subscribe Now</a>
                      </p>
                      <p style='margin-top:24px;'>If you have any questions, reply to this email or contact support.</p>
                      <hr style='margin:24px 0;border:none;border-top:1px solid #e5e7eb;'>
                      <p style='font-size:12px;color:#6b7280;'>Thank you for using QR Menu System.</p>
                    </div>
                """
            )
        # Expire active subscriptions whose subscription_end_date has passed
        expired = Subscription.objects.filter(
            status='active',
            subscription_end_date__lt=now
        )
        count_active = expired.update(status='pending_payment')
        self.stdout.write(self.style.SUCCESS(f'Set {count_active} active subscriptions to pending_payment'))

        # Expire trial subscriptions whose trial_end_date has passed
        expired_trials = Subscription.objects.filter(
            status='trial',
            trial_end_date__isnull=False,
            trial_end_date__lt=now
        )
        count_trial = expired_trials.update(status='pending_payment')
        self.stdout.write(self.style.SUCCESS(f'Set {count_trial} trial subscriptions to pending_payment')) 