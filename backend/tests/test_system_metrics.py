import types

import pytest

from app.utils import system_metrics


def test_collect_host_metrics_uses_live_psutil_values(monkeypatch):
    class FakeMemory(types.SimpleNamespace):
        percent = 62.5
        total = 16 * 1024**3
        available = 6 * 1024**3

    class FakeDisk(types.SimpleNamespace):
        percent = 72.3
        total = 500 * 1024**3
        free = 120 * 1024**3

    class FakeNetIO(types.SimpleNamespace):
        bytes_recv = 2048
        bytes_sent = 4096

    monkeypatch.setattr(system_metrics.psutil, 'cpu_percent', lambda interval=0.1: 41.2)
    monkeypatch.setattr(system_metrics.psutil, 'virtual_memory', lambda: FakeMemory())
    monkeypatch.setattr(system_metrics.psutil, 'disk_usage', lambda path: FakeDisk())
    monkeypatch.setattr(system_metrics.psutil, 'net_io_counters', lambda: FakeNetIO())
    monkeypatch.setattr(system_metrics.psutil, 'pids', lambda: [1, 2, 3])
    monkeypatch.setattr(
        system_metrics.psutil,
        'process_iter',
        lambda attrs=None: [types.SimpleNamespace(info={'num_threads': 4}), types.SimpleNamespace(info={'num_threads': 8})],
    )

    metrics = system_metrics.collect_host_metrics()

    assert metrics['cpu_usage'] == 41.2
    assert metrics['ram_usage'] == 62.5
    assert metrics['disk_usage'] == 72.3
    assert metrics['memory_total_gb'] == pytest.approx(16.0)
    assert metrics['disk_free_gb'] == pytest.approx(120.0)
    assert metrics['process_count'] == 3
    assert metrics['thread_count'] == 12
    assert metrics['network_in_mb'] == pytest.approx(0.0)
    assert metrics['network_out_mb'] == pytest.approx(0.0)
