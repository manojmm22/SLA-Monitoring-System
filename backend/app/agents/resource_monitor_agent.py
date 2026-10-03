from datetime import datetime
from app.agents.base_agent import BaseAgent
from app.models.log import PerformanceLog, ApiLog
from app.models.service import Service, ServiceStatus
from app.utils.database import db
from app.utils.system_metrics import collect_host_metrics
from app.utils.datetime_utils import to_iso_utc


class ResourceMonitorAgent(BaseAgent):
    def __init__(self):
        super().__init__("Resource Monitor Agent", "monitoring")

    def execute(self, service_id=None):
        services = []
        if service_id:
            service = Service.query.get(service_id)
            if service:
                services = [service]
        else:
            services = Service.query.filter_by(is_active=True).all()

        # Capture the host's live utilization once per run and reuse it for every service
        try:
            metrics = collect_host_metrics()
            cpu = metrics['cpu_usage']
            ram = metrics['ram_usage']
            disk = metrics['disk_usage']
            net_io = None
            process_count = metrics['process_count']
            thread_count = metrics['thread_count']
        except Exception as e:
            self.log(f"Failed to collect host metrics: {str(e)}", level='ERROR')
            return []

        results = []
        for service in services:
            metrics_payload = self._collect_metrics(
                service, cpu, ram, disk, process_count, thread_count, metrics
            )
            results.append(metrics_payload)

        return results

    def _collect_metrics(self, service, cpu, ram, disk, process_count, thread_count, metrics):
        try:

            perf_log = PerformanceLog(
                service_id=service.id,
                cpu_usage=round(cpu, 2),
                ram_usage=round(ram, 2),
                disk_usage=round(disk, 2),
                network_in=round(metrics['network_in_mb'], 2),
                network_out=round(metrics['network_out_mb'], 2),
                process_count=process_count,
                thread_count=thread_count,
                open_file_descriptors=0
            )
            db.session.add(perf_log)

            # Check thresholds and update service status
            if cpu > service.cpu_threshold or ram > service.ram_threshold or disk > service.disk_threshold:
                if service.status not in (ServiceStatus.CRITICAL, ServiceStatus.DOWN):
                    service.status = ServiceStatus.DEGRADED
            elif service.status == ServiceStatus.DEGRADED:
                latest_api = ApiLog.query.filter_by(service_id=service.id).order_by(ApiLog.timestamp.desc()).first()
                if not latest_api or latest_api.is_success:
                    service.status = ServiceStatus.HEALTHY

            db.session.commit()

            return {
                'service_id': service.id,
                'service_name': service.name,
                'cpu_usage': round(cpu, 2),
                'ram_usage': round(ram, 2),
                'disk_usage': round(disk, 2),
                'network_in': round(metrics['network_in_mb'], 2),
                'network_out': round(metrics['network_out_mb'], 2),
                'timestamp': to_iso_utc(perf_log.timestamp)
            }
        except Exception as e:
            self.log(f"Failed to collect metrics for {service.name}: {str(e)}", level='ERROR', service_id=service.id)
            return {
                'service_id': service.id,
                'service_name': service.name,
                'error': str(e),
                'timestamp': to_iso_utc(datetime.utcnow())
            }
