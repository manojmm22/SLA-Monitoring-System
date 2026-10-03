from datetime import datetime, timedelta
from app.agents.base_agent import BaseAgent
from app.models.log import ApiLog
from app.models.service import Service
from app.utils.datetime_utils import to_iso_utc
import numpy as np


class TimeAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Time Analyzer Agent", "analytics")

    def execute(self, service_id=None, timeframe='1h'):
        services = []
        if service_id:
            service = Service.query.get(service_id)
            if service:
                services = [service]
        else:
            services = Service.query.filter_by(is_active=True).all()

        results = []
        for service in services:
            analysis = self._analyze_service(service, timeframe)
            results.append(analysis)

        return results

    def _analyze_service(self, service, timeframe):
        time_map = {'1h': 1, '24h': 24, '7d': 168, '30d': 720}
        hours = time_map.get(timeframe, 1)
        since = datetime.utcnow() - timedelta(hours=hours)

        logs = ApiLog.query.filter(
            ApiLog.service_id == service.id,
            ApiLog.timestamp >= since
        ).all()

        if not logs:
            return {
                'service_id': service.id,
                'service_name': service.name,
                'timeframe': timeframe,
                'message': 'No data available for analysis'
            }

        response_times = [log.response_time for log in logs if log.response_time is not None]
        status_codes = [log.status_code for log in logs if log.status_code is not None]

        if not response_times:
            return {
                'service_id': service.id,
                'service_name': service.name,
                'timeframe': timeframe,
                'message': 'No response time data available'
            }

        avg_response = round(sum(response_times) / len(response_times), 2)
        min_response = round(min(response_times), 2)
        max_response = round(max(response_times), 2)

        # Percentiles
        sorted_times = sorted(response_times)
        p95 = round(float(np.percentile(sorted_times, 95)), 2) if len(sorted_times) > 1 else float(sorted_times[0])
        p99 = round(float(np.percentile(sorted_times, 99)), 2) if len(sorted_times) > 1 else float(sorted_times[0])

        # Availability
        total = len(logs)
        successful = sum(1 for log in logs if log.is_success)
        availability = round((successful / total) * 100, 2) if total > 0 else 0

        # Error rate
        errors = sum(1 for log in logs if log.status_code and log.status_code >= 400)
        error_rate = round((errors / total) * 100, 2) if total > 0 else 0

        # Status code distribution
        status_dist = {}
        for code in status_codes:
            status_dist[code] = status_dist.get(code, 0) + 1

        # Trend analysis
        trend = self._calculate_trend(response_times)

        return {
            'service_id': service.id,
            'service_name': service.name,
            'timeframe': timeframe,
            'total_requests': total,
            'successful_requests': successful,
            'failed_requests': total - successful,
            'average_response_time': avg_response,
            'min_response_time': min_response,
            'max_response_time': max_response,
            'p95_response_time': p95,
            'p99_response_time': p99,
            'availability_percentage': availability,
            'error_rate': error_rate,
            'status_code_distribution': status_dist,
            'trend': trend,
            'timestamp': to_iso_utc(datetime.utcnow())
        }

    def _calculate_trend(self, response_times):
        if len(response_times) < 10:
            return 'insufficient_data'

        half = len(response_times) // 2
        first_half = response_times[:half]
        second_half = response_times[half:]

        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)

        diff = second_avg - first_avg
        percentage = (diff / first_avg * 100) if first_avg > 0 else 0

        if percentage > 20:
            return 'degrading'
        elif percentage < -20:
            return 'improving'
        else:
            return 'stable'
