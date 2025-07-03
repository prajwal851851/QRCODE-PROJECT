from django.apps import AppConfig


class AuthentactionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentaction'

    def ready(self):
        import authentaction.signals
