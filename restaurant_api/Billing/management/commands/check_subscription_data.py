from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from Billing.models import Subscription

User = get_user_model()

class Command(BaseCommand):
    help = 'Check subscription data for debugging'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to check')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"Found user: {user.email}")
            
            try:
                subscription = user.subscription
                self.stdout.write(f"Subscription ID: {subscription.id}")
                self.stdout.write(f"Status: {subscription.status}")
                self.stdout.write(f"Trial start: {subscription.trial_start_date}")
                self.stdout.write(f"Trial end: {subscription.trial_end_date}")
                self.stdout.write(f"Subscription start: {subscription.subscription_start_date}")
                self.stdout.write(f"Subscription end: {subscription.subscription_end_date}")
                self.stdout.write(f"Monthly fee: {subscription.monthly_fee}")
                self.stdout.write(f"Currency: {subscription.currency}")
                self.stdout.write(f"Last payment: {subscription.last_payment_date}")
                self.stdout.write(f"Next payment: {subscription.next_payment_date}")
                self.stdout.write(f"Is trial active: {subscription.is_trial_active}")
                self.stdout.write(f"Is subscription active: {subscription.is_subscription_active}")
                self.stdout.write(f"Days remaining in trial: {subscription.days_remaining_in_trial}")
                
            except Subscription.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'No subscription found for {user.email}'))
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {email} not found')) 