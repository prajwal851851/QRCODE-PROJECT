#!/usr/bin/env python3
"""
Test script to verify order creation API
"""

import requests
import json
import time

# API base URL
API_BASE_URL = "https://qrcode-project-3.onrender.com/api"

def test_order_creation():
    """Test order creation with cash payment"""
    
    # Test order data
    order_data = {
        "table": 1,  # Assuming table ID 1 exists
        "items": [
            {
                "id": "1",
                "name": "Test Item",
                "price": 100.0,
                "quantity": 2
            }
        ],
        "customer_name": "Test Customer",
        "special_instructions": "Test instructions",
        "dining_option": "dine-in",
        "total": 200.0,
        "payment_status": "pending",
        "payment_method": "cash",
        "extra_charges_applied": [],
        "transaction_uuid": f"test-cash-{int(time.time())}"
    }
    
    print("Testing order creation...")
    print(f"Order data: {json.dumps(order_data, indent=2)}")
    
    try:
        # Create order
        response = requests.post(f"{API_BASE_URL}/orders/", json=order_data)
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200 or response.status_code == 201:
            order_response = response.json()
            print(f"Order created successfully: {json.dumps(order_response, indent=2)}")
            
            # Try to fetch the created order
            order_id = order_response.get('id')
            if order_id:
                print(f"Testing order retrieval for ID: {order_id}")
                fetch_response = requests.get(f"{API_BASE_URL}/orders/{order_id}")
                print(f"Fetch response status: {fetch_response.status_code}")
                
                if fetch_response.status_code == 200:
                    fetched_order = fetch_response.json()
                    print(f"Order retrieved successfully: {json.dumps(fetched_order, indent=2)}")
                else:
                    print(f"Failed to fetch order: {fetch_response.text}")
            else:
                print("No order ID in response")
        else:
            print(f"Failed to create order: {response.text}")
            
    except Exception as e:
        print(f"Error testing order creation: {e}")

if __name__ == "__main__":
    test_order_creation() 