from rest_framework import serializers
from .models import EsewaTransaction

class EsewaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EsewaTransaction
        fields = '__all__'
