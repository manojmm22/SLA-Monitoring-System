import requests

if __name__ == '__main__':
    resp = requests.post('http://127.0.0.1:5000/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    print(resp.status_code)
    print(resp.text)
