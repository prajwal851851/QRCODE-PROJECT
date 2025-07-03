import requests
import json

def test_login():
    # Login endpoint
    login_url = "http://localhost:8000/api/user_role/login/"
    
    # Login data
    login_data = {
        "email": "prajwaldhital853@gmail.com",
        "password": "helloworld123@"
    }
    
    # Make login request
    print("Attempting to login...")
    response = requests.post(login_url, json=login_data)
    
    if response.status_code == 200:
        print("\nLogin successful!")
        data = response.json()
        print("\nAccess Token:", data.get('access'))
        print("\nUser Data:", json.dumps(data.get('user'), indent=2))
        
        # Test protected endpoint
        headers = {
            "Authorization": f"Bearer {data.get('access')}"
        }
        
        print("\nTesting protected endpoint...")
        users_response = requests.get("http://localhost:8000/api/user_role/users/", headers=headers)
        print("\nStatus Code:", users_response.status_code)
        print("Response:", users_response.text)
    else:
        print("\nLogin failed!")
        print("Status Code:", response.status_code)
        print("Response:", response.text)

if __name__ == "__main__":
    test_login() 