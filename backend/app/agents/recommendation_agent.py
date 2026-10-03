from datetime import datetime, timedelta
from app.agents.base_agent import BaseAgent
from app.models.service import Service
from app.models.log import ApiLog, PerformanceLog


class RecommendationAgent(BaseAgent):
    def __init__(self):
        super().__init__("Recommendation Agent", "optimization")

    def execute(self, service_id=None):
        services = []
        if service_id:
            service = Service.query.get(service_id)
            if service:
                services = [service]
        else:
            services = Service.query.filter_by(is_active=True).all()
        recommendations = []
        for service in services:
            recs = self._analyze_service(service)
            recommendations.extend(recs)
        return recommendations

    def _analyze_service(self, service):
        recs = []
        since = datetime.utcnow() - timedelta(hours=24)
        logs = ApiLog.query.filter(ApiLog.service_id == service.id, ApiLog.timestamp >= since).all()
        perf_logs = PerformanceLog.query.filter(PerformanceLog.service_id == service.id, PerformanceLog.timestamp >= since).all()

        if logs:
            avg_response = sum(log.response_time for log in logs if log.response_time) / len(logs)
            if avg_response > service.response_time_threshold:
                recs.append({'service_id': service.id, 'service_name': service.name, 'category': 'performance', 'severity': 'high', 'title': 'High Response Time Detected', 'description': f'Average response time ({avg_response:.2f}ms) exceeds threshold ({service.response_time_threshold}ms).',
                            'recommendations': ['Implement caching mechanisms (Redis/Memcached)', 'Optimize database queries and add indexes', 'Consider load balancing or horizontal scaling', 'Enable response compression (gzip/brotli)', 'Review and optimize API payload sizes']})
            errors = [log for log in logs if log.status_code and log.status_code >= 400]
            if len(errors) / len(logs) > 0.05:
                recs.append({'service_id': service.id, 'service_name': service.name, 'category': 'reliability', 'severity': 'critical', 'title': 'Elevated Error Rate', 'description': f'Error rate is {len(errors)/len(logs)*100:.2f}%, exceeding 5% threshold.',
                            'recommendations': ['Review recent deployments for bugs', 'Implement circuit breaker patterns', 'Add comprehensive error handling and logging', 'Set up retry policies with exponential backoff', 'Check downstream service dependencies']})

        if perf_logs:
            avg_cpu = sum(p.cpu_usage for p in perf_logs if p.cpu_usage) / len(perf_logs)
            avg_ram = sum(p.ram_usage for p in perf_logs if p.ram_usage) / len(perf_logs)
            if avg_cpu > service.cpu_threshold * 0.8:
                recs.append({'service_id': service.id, 'service_name': service.name, 'category': 'infrastructure', 'severity': 'medium', 'title': 'High CPU Utilization', 'description': f'Average CPU usage ({avg_cpu:.2f}%) approaching threshold ({service.cpu_threshold}%).', 'recommendations': [
                            'Profile application for CPU bottlenecks', 'Optimize algorithms and reduce computational complexity', 'Consider vertical scaling (more CPU cores)', 'Implement asynchronous processing for heavy tasks', 'Review and optimize background jobs']})
            if avg_ram > service.ram_threshold * 0.8:
                recs.append({'service_id': service.id, 'service_name': service.name, 'category': 'infrastructure', 'severity': 'medium', 'title': 'High Memory Utilization', 'description': f'Average RAM usage ({avg_ram:.2f}%) approaching threshold ({service.ram_threshold}%).',
                            'recommendations': ['Check for memory leaks in application', 'Optimize data structures and object caching', 'Implement pagination for large data sets', 'Consider increasing available memory', 'Review long-running processes and connections']})

        if logs:
            successful = sum(1 for log in logs if log.is_success)
            availability = (successful / len(logs)) * 100 if logs else 0
            if availability < service.availability_threshold:
                recs.append({'service_id': service.id, 'service_name': service.name, 'category': 'availability', 'severity': 'critical', 'title': 'SLA Availability Breach', 'description': f'Availability ({availability:.2f}%) below SLA target ({service.availability_threshold}%).', 'recommendations': [
                            'Implement health checks and auto-restart policies', 'Set up redundant instances and failover mechanisms', 'Review infrastructure for single points of failure', 'Implement graceful degradation strategies', 'Consider multi-region deployment']})

        if not recs:
            recs.append({'service_id': service.id, 'service_name': service.name, 'category': 'general', 'severity': 'info', 'title': 'No Critical Issues Found',
                        'description': 'Service is operating within normal parameters.', 'recommendations': ['Continue monitoring current metrics', 'Keep dependencies updated', 'Regular security patching recommended']})

        return recs
