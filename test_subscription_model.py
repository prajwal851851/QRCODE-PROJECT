#!/usr/bin/env python3
"""
Test script for subscription model properties
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Add the Django project to the Python path
sys.path.append('restaurant_api')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_api.settings')
django.setup()

from Billing.models import Subscription
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

def test_subscription_properties():
    """Test subscription model properties"""
    
    print("🧪 Testing Subscription Model Properties")
    print("=" * 50)
    
    # Create a test user
    try:
        test_user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User',
                'is_active': True
            }
        )
        if created:
            print(f"✅ Created test user: {test_user.email}")
        else:
            print(f"✅ Using existing test user: {test_user.email}")
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return
    
    # Test 1: Create subscription with None trial_end_date
    print("\n1. Testing subscription with None trial_end_date...")
    try:
        subscription = Subscription.objects.create(
            admin=test_user,
            status='trial',
            trial_end_date=None  # This was causing the error
        )
        print(f"   ✅ Created subscription: {subscription.id}")
        
        # Test properties
        print(f"   Trial active: {subscription.is_trial_active}")
        print(f"   Subscription active: {subscription.is_subscription_active}")
        print(f"   Days remaining: {subscription.days_remaining_in_trial}")
        
        # Clean up
        subscription.delete()
        print("   ✅ Test completed successfully")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Create subscription with valid trial_end_date
    print("\n2. Testing subscription with valid trial_end_date...")
    try:
        trial_end = timezone.now() + timedelta(days=3)
        subscription = Subscription.objects.create(
            admin=test_user,
            status='trial',
            trial_end_date=trial_end
        )
        print(f"   ✅ Created subscription: {subscription.id}")
        
        # Test properties
        print(f"   Trial active: {subscription.is_trial_active}")
        print(f"   Subscription active: {subscription.is_subscription_active}")
        print(f"   Days remaining: {subscription.days_remaining_in_trial}")
        
        # Clean up
        subscription.delete()
        print("   ✅ Test completed successfully")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Create active subscription
    print("\n3. Testing active subscription...")
    try:
        subscription = Subscription.objects.create(
            admin=test_user,
            status='active',
            subscription_start_date=timezone.now(),
            subscription_end_date=timezone.now() + timedelta(days=30)
        )
        print(f"   ✅ Created subscription: {subscription.id}")
        
        # Test properties
        print(f"   Trial active: {subscription.is_trial_active}")
        print(f"   Subscription active: {subscription.is_subscription_active}")
        print(f"   Days remaining: {subscription.days_remaining_in_trial}")
        
        # Clean up
        subscription.delete()
        print("   ✅ Test completed successfully")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Clean up test user
    try:
        test_user.delete()
        print(f"\n✅ Cleaned up test user")
    except Exception as e:
        print(f"\n⚠️  Could not clean up test user: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 All subscription model tests completed!")

if __name__ == "__main__":
    test_subscription_properties() 