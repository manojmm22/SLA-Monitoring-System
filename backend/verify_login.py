if __name__ == '__main__':
    from app import create_app

    app = create_app('development')
    client = app.test_client()
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    print(resp.status_code)
    print(resp.get_data(as_text=True))
