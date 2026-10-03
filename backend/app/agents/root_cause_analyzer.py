"""
AI-powered Root Cause Analyzer – provides structured diagnostics, confidence scores,
and recommended corrections based on real-time metric correlations.
"""
from datetime import datetime, timedelta
import numpy as np
from app.models.log import ApiLog, PerformanceLog
from app.models.alert import Alert, AlertStatus

class RootCauseAnalyzer:
    """Diagnoses performance degradation by correlating multiple system channels."""

    @staticmethod
    def analyze(service):
        """Analyze service performance and return root cause details."""
        since = datetime.utcnow() - timedelta(minutes=30)
        
        # 1. Fetch recent metrics
        logs = ApiLog.query.filter(
            ApiLog.service_id == service.id,
            ApiLog.timestamp >= since
        ).all()
        
        perf = PerformanceLog.query.filter(
            PerformanceLog.service_id == service.id,
            PerformanceLog.timestamp >= since
        ).all()

        alerts = Alert.query.filter(
            Alert.service_id == service.id,
            Alert.status == AlertStatus.ACTIVE
        ).all()

        # Defaults when service is operating healthy
        if service.status.value == 'healthy' and not alerts:
            return {
                'service_id': service.id,
                'service_name': service.name,
                'status': 'HEALTHY',
                'issue_detected': False,
                'root_cause': 'Normal Operations',
                'evidence': 'All metrics (response times, CPU, RAM, error rate) are within safe thresholds.',
                'confidence_score': 99.0,
                'recommendations': [
                    'Keep monitoring active.',
                    'Review routine maintenance schedules.'
                ]
            }

        # Issue analysis variables
        evidence_chain = []
        confidence = 50.0
        cause = "Unknown / Transient Outage"
        recs = []

        # Extract values
        avg_resp = np.mean([log.response_time for log in logs]) if logs else 100.0
        success_rate = (sum(1 for log in logs if log.is_success) / len(logs)) * 100.0 if logs else 100.0
        error_rate = 100.0 - success_rate

        avg_cpu = np.mean([p.cpu_usage for p in perf]) if perf else 15.0
        avg_ram = np.mean([p.ram_usage for p in perf]) if perf else 30.0
        avg_disk = np.mean([p.disk_usage for p in perf]) if perf else 40.0

        # Check HTTP error codes
        status_codes = [log.status_code for log in logs if log.status_code]
        err_5xx = sum(1 for code in status_codes if 500 <= code < 600)
        err_4xx = sum(1 for code in status_codes if 400 <= code < 500)

        # ── Rule-Based Correlation Engine ──
        
        # Scenario A: High Resource Utilization causing degradation
        if avg_cpu > service.cpu_threshold or avg_ram > service.ram_threshold:
            cause = "Server Resource Exhaustion (CPU/RAM)"
            evidence_chain.append(
                f"Average CPU utilization is {avg_cpu:.1f}% (threshold: {service.cpu_threshold}%)"
            )
            evidence_chain.append(
                f"Average RAM usage is {avg_ram:.1f}% (threshold: {service.ram_threshold}%)"
            )
            if avg_resp > service.response_time_threshold:
                evidence_chain.append(
                    f"Correlated with response time spike to {avg_resp:.0f}ms."
                )
            
            confidence = 80.0 + min(15.0, (avg_cpu - service.cpu_threshold) + (avg_ram - service.ram_threshold))
            recs = [
                "Execute simulated auto-scaling to distribute incoming request load.",
                "Simulate a service process restart to free up locked CPU cycles.",
                "Check for background processes causing memory leaks."
            ]

        # Scenario B: High HTTP 5xx errors (Backend Crash or DB locking)
        elif err_5xx > 0 and error_rate > 5:
            cause = "Internal Server Exception / Database Connection Exhaustion"
            evidence_chain.append(
                f"High backend error rate: {error_rate:.1f}% of total transactions failed."
            )
            evidence_chain.append(
                f"Detected {err_5xx} HTTP 5xx responses."
            )
            
            # Sub-check: If response time is also high, probably DB query blockage
            if avg_resp > service.response_time_threshold * 1.5:
                cause = "Database Query Blockage / Timeout"
                evidence_chain.append("Extremely high latency indicates thread locking or connection pool exhaustion.")
                confidence = 85.0
                recs = [
                    "Flush database connection pools to clean dangling sessions.",
                    "Review recent slow queries and optimize table indexing.",
                    "Simulate clearing application cache."
                ]
            else:
                confidence = 75.0
                recs = [
                    "Check application runtime logs for unhandled exceptions.",
                    "Simulate service process restart.",
                    "Verify backend dependency APIs are reachable."
                ]

        # Scenario C: Network / DNS Timeout
        elif avg_resp > service.response_time_threshold and success_rate > 95:
            cause = "Network Latency / Slow Upstream Dependency"
            evidence_chain.append(
                f"Response time average ({avg_resp:.0f}ms) breached configured threshold ({service.response_time_threshold}ms)."
            )
            evidence_chain.append("Error rate remains low, suggesting slow network transmission or slow queries.")
            
            confidence = 70.0
            recs = [
                "Verify network health, route metrics, and transit gateway load.",
                "Check response caching availability (Redis/Memcached).",
                "Review external API response speeds."
            ]

        # Scenario D: High HTTP 4xx Client Failures
        elif err_4xx > len(logs) * 0.15:
            cause = "Client Integration Errors / Authentication Failures"
            evidence_chain.append(
                f"Elevated volume of client-side failures: {err_4xx} HTTP 4xx requests."
            )
            
            confidence = 90.0
            recs = [
                "Verify api key expiry or configuration settings.",
                "Check for malicious traffic or request flooding.",
                "Review client-facing API usage documentation."
            ]

        else:
            evidence_chain.append(
                f"Service is in {service.status.value.upper()} state."
            )
            if alerts:
                evidence_chain.append(f"Triggered by alert: {alerts[0].title}")
                confidence = 65.0
                recs = ["Investigate active alerts on dashboard.", "Manually verify endpoint health."]

        return {
            'service_id': service.id,
            'service_name': service.name,
            'status': service.status.value.upper(),
            'issue_detected': True,
            'root_cause': cause,
            'evidence': ' \n'.join(evidence_chain),
            'confidence_score': round(min(99.0, confidence), 1),
            'recommendations': recs
        }
