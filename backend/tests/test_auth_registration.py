import os
import uuid
import pytest
from app import create_app


@pytest.fixture
def client():
    os.chdir('d:/mm/sla-monitoring-system/backend')
    app = create_app('testing')
    with app.test_client() as client:
        yield client


def test_user_can_register_and_login(client):
    uid = uuid.uuid4().hex[:8]
    username = f'newuser_{uid}'
    email = f'newuser_{uid}@gmail.com'
    password = 'SecurePass123!'

    register_resp = client.post('/api/auth/register', json={
        'username': username,
        'email': email,
        'password': password,
    })

    assert register_resp.status_code == 201, register_resp.get_data(as_text=True)
    assert register_resp.get_json()['success'] is True

    login_resp = client.post('/api/auth/login', json={
        'username': username,
        'password': password,
    })

    assert login_resp.status_code == 200, login_resp.get_data(as_text=True)
    assert login_resp.get_json()['success'] is True
    assert login_resp.get_json()['data']['user']['username'] == username
