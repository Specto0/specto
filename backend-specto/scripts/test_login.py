import asyncio
import sys
import os
import requests

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_login():
    url = "http://localhost:8000/auth/login"
    payload = {
        "username": "admin@gmail.com",
        "password": "admin123"
    }
    print(f"Testing login to {url}...")
    try:
        response = requests.post(url, data=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
