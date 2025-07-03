from django.contrib import admin
from .models import OTP, UserEvent
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin




admin.site.register(OTP)
admin.site.register(UserEvent)


