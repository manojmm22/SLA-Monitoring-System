import os
import psutil
from datetime import datetime, timezone
from app.utils.datetime_utils import to_iso_utc


def collect_host_metrics():
    cpu = psutil.cpu_percent(interval=0.1)
    ram_info = psutil.virtual_memory()
    disk_info = psutil.disk_usage(os.path.abspath(os.sep))
    net_io = psutil.net_io_counters()
    net_recv = getattr(net_io, 'bytes_recv', 0) if net_io else 0
    net_sent = getattr(net_io, 'bytes_sent', 0) if net_io else 0
    process_count = len(psutil.pids())
    thread_count = sum(
        int(getattr(p, 'info', {}).get('num_threads') or 0)
        for p in psutil.process_iter(['num_threads'])
        if getattr(p, 'info', {}).get('num_threads') is not None
    )

    return {
        'cpu_usage': round(float(cpu), 2),
        'ram_usage': round(float(ram_info.percent), 2),
        'disk_usage': round(float(disk_info.percent), 2),
        'memory_total_gb': round(float(ram_info.total) / (1024**3), 2),
        'memory_available_gb': round(float(ram_info.available) / (1024**3), 2),
        'disk_total_gb': round(float(disk_info.total) / (1024**3), 2),
        'disk_free_gb': round(float(disk_info.free) / (1024**3), 2),
        'network_in_mb': round(float(net_recv) / (1024**2), 2),
        'network_out_mb': round(float(net_sent) / (1024**2), 2),
        'process_count': process_count,
        'thread_count': thread_count,
        'timestamp': to_iso_utc(datetime.now(timezone.utc)),
    }
