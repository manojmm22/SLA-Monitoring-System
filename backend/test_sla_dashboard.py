import pytest

from app import create_app


@pytest.fixture()
def client():
    app = create_app('testing')
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_dashboard_includes_live_sla_summary(client):
    login_response = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'Admin@123',
    })
    assert login_response.status_code == 200

    token = login_response.get_json()['data']['access_token']
    response = client.get('/api/analytics/dashboard', headers={
        'Authorization': f'Bearer {token}'
    })

    assert response.status_code == 200
    payload = response.get_json()['data']
    assert 'sla_compliance' in payload
    assert 'violations' in payload
    assert 'updated_at' in payload
