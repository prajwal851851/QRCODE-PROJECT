from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from Billing.models import Subscription, PaymentHistory

class Command(BaseCommand):
    help = 'Clean up failed payments and reset subscription statuses to allow retry'

    def add_arguments(self, parser):
        parser.add_argument(
            '--older-than',
            type=int,
            default=30,
            help='Clean up payments older than X minutes (default: 30)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned up without making changes',
        )

    def handle(self, *args, **options):
        older_than_minutes = options['older_than']
        dry_run = options['dry_run']
        
        cutoff_time = timezone.now() - timedelta(minutes=older_than_minutes)
        
        # Find failed payments that are older than the cutoff time
        failed_payments = PaymentHistory.objects.filter(
            is_successful=False,
            processed_at__isnull=False,  # Payments that have been processed (failed)
            created_at__lt=cutoff_time
        )
        
        # Find pending payments that are older than the cutoff time
        stale_pending_payments = PaymentHistory.objects.filter(
            is_successful=False,
            processed_at__isnull=True,  # Payments that haven't been processed yet
            created_at__lt=cutoff_time
        )
        
        # Find subscriptions with pending_payment status that should be reset
        stale_subscriptions = Subscription.objects.filter(
            status='pending_payment'
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN - Would clean up:'
                )
            )
            self.stdout.write(f'  - {failed_payments.count()} failed payments older than {older_than_minutes} minutes')
            self.stdout.write(f'  - {stale_pending_payments.count()} stale pending payments older than {older_than_minutes} minutes')
            self.stdout.write(f'  - {stale_subscriptions.count()} subscriptions with pending_payment status')
            return
        
        # Clean up failed payments
        failed_count = failed_payments.count()
        failed_payments.delete()
        
        # Clean up stale pending payments
        stale_count = stale_pending_payments.count()
        stale_pending_payments.delete()
        
        # Reset subscription statuses
        reset_count = 0
        for subscription in stale_subscriptions:
            # Check if there are any recent pending payments
            recent_payments = subscription.payment_history.filter(
                payment_type='subscription',
                is_successful=False,
                processed_at__isnull=True,
                created_at__gte=cutoff_time
            ).count()
            
            if recent_payments == 0:
                subscription.status = 'expired'
                subscription.save()
                reset_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Cleanup completed:'
            )
        )
        self.stdout.write(f'  - Deleted {failed_count} failed payments')
        self.stdout.write(f'  - Deleted {stale_count} stale pending payments')
        self.stdout.write(f'  - Reset {reset_count} subscription statuses')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Users can now retry payments that were previously stuck.'
            )
        ) 