import urllib.request
import json

def fetch_with_login():
    # Login payload
    login_url = "http://localhost:3000/api/auth/login"
    # Wait, NestJS auth might be on /api/auth/login or /api/login? Let's check backend auth controller or check both.
    
    # Try different URLs and credentials
    credentials = [
        {"email": "apersson508@gmail.com", "password": "0204"},
        {"email": "apersson508@gmail.com", "password": "020406"}
    ]
    
    token = None
    for creds in credentials:
        for path in ["/api/auth/login", "/api/login"]:
            try:
                url = f"http://localhost:3000{path}"
                req = urllib.request.Request(
                    url,
                    data=json.dumps(creds).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode('utf-8')
                    res_data = json.loads(res_body)
                    print(f"Logged in successfully via {url} with pass {creds['password']}!")
                    # Check for access_token or token
                    token = res_data.get("access_token") or res_data.get("token")
                    if token:
                        break
            except Exception as e:
                pass
        if token:
            break

    if not token:
        print("Failed to login to NestJS backend on port 3000.")
        return

    # Call /api/analytics
    try:
        analytics_url = "http://localhost:3000/api/analytics"
        req = urllib.request.Request(
            analytics_url,
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("\n============= NESTJS ANALYTICS RESPONSE =============")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error fetching analytics: {e}")

if __name__ == "__main__":
    fetch_with_login()
