from django.apps import AppConfig


class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'Billing'

    def ready(self):
        import Billing.models  # Ensures signals are registered
