import requests
import time
from datetime import datetime
from app.agents.base_agent import BaseAgent
from app.models.log import ApiLog
from app.models.service import Service, ServiceStatus
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc

class ResponseTrackerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Response Tracker Agent", "monitoring")

    def execute(self, service_id=None):
        services = []
        if service_id:
            service = Service.query.get(service_id)
            if service:
                services = [service]
        else:
            services = Service.query.filter_by(is_active=True, health_check_enabled=True).all()

        results = []
        for service in services:
            endpoints = service.endpoints.filter_by(is_active=True).all()
            if not endpoints:
                endpoints = [None]  # Check base URL if no endpoints

            for endpoint in endpoints:
                result = self._check_endpoint(service, endpoint)
                results.append(result)

        return results

    def _check_endpoint(self, service, endpoint):
        start_time = time.time()
        url = f"{service.base_url}{endpoint.path if endpoint else ''}"
        method = endpoint.method if endpoint else 'GET'
        headers = {}
        if endpoint and endpoint.headers:
            import json
            headers = json.loads(endpoint.headers)

        # Realistic simulation for built-in demo services
        if 'example.com' in url:
            import random
            is_error = False
            status_code = 200

            if 'Notification Service' in service.name:
                base_rt = 1800
                is_error = random.random() < 0.18
                if is_error:
                    status_code = random.choice([500, 502, 503, 504])
                    service.status = ServiceStatus.CRITICAL
                else:
                    service.status = ServiceStatus.DEGRADED if random.random() < 0.6 else ServiceStatus.HEALTHY
                response_time = max(100, base_rt + random.gauss(0, 400))
            elif 'SLA Monitor' in service.name:
                base_rt = 1100
                is_error = random.random() < 0.05
                if is_error:
                    status_code = random.choice([429, 500])
                    service.status = ServiceStatus.CRITICAL
                else:
                    service.status = ServiceStatus.DEGRADED if random.random() < 0.7 else ServiceStatus.HEALTHY
                response_time = max(80, base_rt + random.gauss(0, 300))
            else:
                base_rt = 140 if 'Auth' in service.name else (220 if 'User' in service.name else 180)
                is_error = random.random() < 0.015
                if is_error:
                    status_code = random.choice([500, 408])
                    service.status = ServiceStatus.DEGRADED
                else:
                    service.status = ServiceStatus.HEALTHY
                response_time = max(40, base_rt + random.gauss(0, 50))

            api_log = ApiLog(
                service_id=service.id,
                endpoint_id=endpoint.id if endpoint else None,
                method=method,
                url=url,
                status_code=status_code,
                response_time=round(response_time, 2),
                request_size=random.randint(100, 500),
                response_size=random.randint(200, 4000),
                is_success=200 <= status_code < 400,
                headers={'Content-Type': 'application/json'}
            )
            db.session.add(api_log)
            service.last_checked = datetime.utcnow()
            db.session.commit()

            return {
                'service_id': service.id,
                'service_name': service.name,
                'url': url,
                'status_code': status_code,
                'response_time': round(response_time, 2),
                'is_success': 200 <= status_code < 400,
                'timestamp': to_iso_utc(datetime.utcnow())
            }

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                data=endpoint.body if endpoint else None,
                timeout=service.timeout,
                allow_redirects=False
            )
            response_time = (time.time() - start_time) * 1000

            api_log = ApiLog(
                service_id=service.id,
                endpoint_id=endpoint.id if endpoint else None,
                method=method,
                url=url,
                status_code=response.status_code,
                response_time=round(response_time, 2),
                request_size=len(endpoint.body) if endpoint and endpoint.body else 0,
                response_size=len(response.content),
                is_success=200 <= response.status_code < 400,
                headers=dict(response.headers)
            )
            db.session.add(api_log)

            # Update service status
            if response.status_code >= 500:
                service.status = ServiceStatus.CRITICAL
            elif response.status_code >= 400:
                service.status = ServiceStatus.DEGRADED
            else:
                service.status = ServiceStatus.HEALTHY

            service.last_checked = datetime.utcnow()
            db.session.commit()

            return {
                'service_id': service.id,
                'service_name': service.name,
                'url': url,
                'status_code': response.status_code,
                'response_time': round(response_time, 2),
                'is_success': 200 <= response.status_code < 400,
                'timestamp': to_iso_utc(datetime.utcnow())
            }

        except requests.exceptions.Timeout:
            response_time = (time.time() - start_time) * 1000
            api_log = ApiLog(
                service_id=service.id,
                endpoint_id=endpoint.id if endpoint else None,
                method=method,
                url=url,
                status_code=0,
                response_time=round(response_time, 2),
                is_success=False,
                error_message='Request timeout'
            )
            db.session.add(api_log)
            service.status = ServiceStatus.CRITICAL
            service.last_checked = datetime.utcnow()
            db.session.commit()

            return {
                'service_id': service.id,
                'service_name': service.name,
                'url': url,
                'status_code': 0,
                'response_time': round(response_time, 2),
                'is_success': False,
                'error': 'Request timeout',
                'timestamp': to_iso_utc(datetime.utcnow())
            }

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            api_log = ApiLog(
                service_id=service.id,
                endpoint_id=endpoint.id if endpoint else None,
                method=method,
                url=url,
                status_code=0,
                response_time=round(response_time, 2),
                is_success=False,
                error_message=str(e)
            )
            db.session.add(api_log)
            service.status = ServiceStatus.DOWN
            service.last_checked = datetime.utcnow()
            db.session.commit()

            return {
                'service_id': service.id,
                'service_name': service.name,
                'url': url,
                'status_code': 0,
                'response_time': round(response_time, 2),
                'is_success': False,
                'error': str(e),
                'timestamp': to_iso_utc(datetime.utcnow())
            }
