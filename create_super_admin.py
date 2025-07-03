import requests
import json

def create_super_admin():
    # Login endpoint
    login_url = "http://localhost:8000/api/user_role/login/"
    
    # First try to login with existing credentials
    login_data = {
        "email": "prajwaldhital853@gmail.com",
        "password": "helloworld123@"
    }
    
    print("Attempting to login with existing credentials...")
    response = requests.post(login_url, json=login_data)
    
    if response.status_code == 200:
        print("\nLogin successful with existing credentials!")
        return
    
    # If login fails, try to create a new super admin
    print("\nLogin failed. Attempting to create super admin...")
    
    # Create user endpoint
    create_url = "http://localhost:8000/api/user_role/users/"
    
    # Super admin data
    user_data = {
        "email": "prajwaldhital853@gmail.com",
        "password": "helloworld123@",
        "confirm_password": "helloworld123@",
        "name": "Prajwal Dhital",
        "role": "super_admin",
        "status": "active"
    }
    
    # Make create request
    create_response = requests.post(create_url, json=user_data)
    
    if create_response.status_code in [200, 201]:
        print("\nSuper admin created successfully!")
        print("Response:", json.dumps(create_response.json(), indent=2))
    else:
        print("\nFailed to create super admin!")
        print("Status Code:", create_response.status_code)
        print("Response:", create_response.text)

if __name__ == "__main__":
    create_super_admin() 