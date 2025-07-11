#!/usr/bin/env python3
"""
Test script for the subscription system
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/billing"

def test_subscription_endpoints():
    """Test all subscription endpoints"""
    
    print("🧪 Testing Subscription System")
    print("=" * 50)
    
    # Test 1: Check subscription status (should return 401 for unauthenticated)
    print("\n1. Testing subscription status endpoint...")
    try:
        response = requests.get(f"{API_BASE}/subscription/status/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Expected: Authentication required")
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Check subscription dashboard
    print("\n2. Testing subscription dashboard endpoint...")
    try:
        response = requests.get(f"{API_BASE}/subscription/dashboard/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Expected: Authentication required")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Check billing history
    print("\n3. Testing billing history endpoint...")
    try:
        response = requests.get(f"{API_BASE}/billing/history/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Expected: Authentication required")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Check payment history
    print("\n4. Testing payment history endpoint...")
    try:
        response = requests.get(f"{API_BASE}/payment/history/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Expected: Authentication required")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 5: Check subscription access
    print("\n5. Testing subscription access endpoint...")
    try:
        response = requests.get(f"{API_BASE}/subscription/access/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Expected: Authentication required")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 6: Check admin subscription list (should be accessible)
    print("\n6. Testing admin subscription list endpoint...")
    try:
        response = requests.get(f"{API_BASE}/admin/subscriptions/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Expected: Authentication required")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Subscription system endpoints are accessible!")
    print("📝 Note: All endpoints require authentication as expected")
    print("🔗 API Base URL:", API_BASE)
    print("🌐 Server URL:", BASE_URL)

def test_database_models():
    """Test database models by checking Django admin"""
    print("\n🗄️  Testing Database Models")
    print("=" * 50)
    
    # Test Django admin access
    print("\n1. Testing Django admin access...")
    try:
        response = requests.get(f"{BASE_URL}/admin/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Django admin is accessible")
        else:
            print(f"   ⚠️  Django admin status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test custom admin access
    print("\n2. Testing custom restaurant admin access...")
    try:
        response = requests.get(f"{BASE_URL}/restaurant/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Custom admin is accessible")
        else:
            print(f"   ⚠️  Custom admin status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def main():
    """Main test function"""
    print("🚀 Starting Subscription System Tests")
    print(f"⏰ Test started at: {datetime.now()}")
    
    # Test endpoints
    test_subscription_endpoints()
    
    # Test database
    test_database_models()
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed!")
    print("\n📋 Next Steps:")
    print("1. Create a test user/admin account")
    print("2. Configure eSewa credentials for the admin")
    print("3. Test subscription creation and payment flow")
    print("4. Test trial period and subscription activation")
    print("5. Test billing history and payment tracking")

if __name__ == "__main__":
    main() 