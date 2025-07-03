from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import OTP, UserEvent



class OTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTP
        fields = ['id', 'user', 'code', 'created_at', 'expires_at', 'purpose', 'is_used']
        read_only_fields = ['id', 'created_at', 'is_used']

    def validate(self, data):
        # Validate code length
        if len(data.get('code', '')) != 6:
            raise serializers.ValidationError("OTP code must be exactly 6 digits.")
        return data


class UserEventSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserEvent
        fields = ['id', 'user', 'user_email', 'event_type', 'timestamp', 'ip_address', 'user_agent']
        read_only_fields = ['id', 'timestamp', 'user_email']
