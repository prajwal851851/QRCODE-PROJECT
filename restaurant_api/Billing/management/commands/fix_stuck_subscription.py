from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from Billing.models import Subscription, PaymentHistory, BillingHistory
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix stuck subscription for a specific user'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to fix')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"Found user: {user.email}")
            
            # Get the subscription
            try:
                subscription = user.subscription
                self.stdout.write(f"Current subscription status: {subscription.status}")
                
                # Find the latest payment record
                latest_payment = subscription.payment_history.order_by('-created_at').first()
                
                if latest_payment:
                    self.stdout.write(f"Latest payment: {latest_payment.id} - Success: {latest_payment.is_successful}")
                    
                    # Mark payment as successful
                    latest_payment.is_successful = True
                    latest_payment.processed_at = timezone.now()
                    latest_payment.esewa_response_code = '000'
                    latest_payment.esewa_response_message = 'Success (Manually fixed)'
                    latest_payment.save()
                    
                    # Update billing record
                    billing_record = latest_payment.billing_record
                    billing_record.status = 'completed'
                    billing_record.paid_at = timezone.now()
                    billing_record.save()
                    
                    # Activate subscription
                    subscription.activate_subscription()
                    subscription.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully activated subscription for {user.email}. '
                            f'Status: {subscription.status}, '
                            f'End date: {subscription.subscription_end_date}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('No payment records found for this subscription')
                    )
                    
            except Subscription.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'No subscription found for {user.email}')
                )
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email {email} not found')
            ) 