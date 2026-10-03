import os
import pytest
from app import create_app

@pytest.fixture
def client():
    os.chdir('d:/mm/sla-monitoring-system/backend')
    app = create_app('testing')
    with app.test_client() as client:
        yield client


def test_reports_list_does_not_crash_for_existing_rows(client):
    # login as admin
    login = client.post('/api/auth/login', json={'username': 'admin', 'password': 'Admin@123'})
    token = login.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # create a report through the API
    resp = client.post('/api/reports/', json={'name': 'regression', 'report_type': 'daily', 'format': 'pdf', 'service_ids': []}, headers=headers)
    assert resp.status_code == 201

    # ensure listing reports works
    list_resp = client.get('/api/reports/', headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.get_json()['success'] is True


def test_live_reports_are_generated_correctly(client):
    login = client.post('/api/auth/login', json={'username': 'admin', 'password': 'Admin@123'})
    token = login.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    resp = client.post('/api/reports/', json={'name': 'live-report', 'report_type': 'live', 'format': 'pdf', 'service_ids': []}, headers=headers)

    assert resp.status_code == 201
    payload = resp.get_json()['data']
    assert payload['report_type'] == 'live'
    assert payload['status'] == 'completed'
    assert payload['file_path']

    report_id = payload['id']

    # Test download
    dl_resp = client.get(f'/api/reports/{report_id}/download', headers=headers)
    assert dl_resp.status_code == 200

    # Test get single
    get_resp = client.get(f'/api/reports/{report_id}', headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.get_json()['data']['id'] == report_id

    # Test delete
    del_resp = client.delete(f'/api/reports/{report_id}', headers=headers)
    assert del_resp.status_code == 200
