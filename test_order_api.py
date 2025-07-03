import requests
import json

# Test data
test_data = {
    "table": 5,
    "items": [
        {
            "name": "Test Item",
            "price": 10.0,
            "quantity": 1
        }
    ],
    "total": 10.0,
    "payment_status": "paid",
    "payment_method": "esewa",
    "transaction_uuid": "test-uuid-123"
}

# Test the API
try:
    response = requests.post(
        "http://localhost:8000/api/orders/",
        headers={"Content-Type": "application/json"},
        data=json.dumps(test_data)
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 400:
        try:
            error_data = response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            print("Could not parse error response as JSON")
            
except Exception as e:
    print(f"Error: {e}") 