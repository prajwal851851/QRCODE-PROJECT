from django.apps import AppConfig


class QrgeneratorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'qrgenerator'


def ready(self):
    import qrgenerator.signals
