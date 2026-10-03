"""
Email notification service – sends alert emails via SMTP.
Supports simulation mode (logs instead of sending) when SIMULATE_EMAIL=true.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from flask import current_app
from app.utils.logger import logger


class EmailService:
    """Handles email delivery for alert notifications and reports."""

    @staticmethod
    def send_alert_email(recipient_email, alert_data):
        """Send an HTML-formatted alert notification email."""
        subject = f"[SLA Monitor] {alert_data.get('severity', 'ALERT').upper()}: {alert_data.get('title', 'Alert Triggered')}"

        html_body = f"""
        <html>
        <body style="font-family: 'Inter', Arial, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #6366f1; margin: 0; font-size: 24px;">⚡ SLA Monitor Alert</h1>
                    <p style="color: #94a3b8; margin: 4px 0 0;">Enterprise Monitoring Platform</p>
                </div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Alert Title</td>
                        <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">{alert_data.get('title', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Severity</td>
                        <td style="padding: 8px 0;">
                            <span style="background: {'#ef4444' if alert_data.get('severity') == 'critical' else '#f59e0b' if alert_data.get('severity') == 'high' else '#3b82f6'}; 
                                         color: white; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                {alert_data.get('severity', 'medium').upper()}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Service</td>
                        <td style="padding: 8px 0; color: #f1f5f9;">{alert_data.get('service_name', 'Unknown')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Metric</td>
                        <td style="padding: 8px 0; color: #f1f5f9;">{alert_data.get('metric_name', 'N/A')} = {alert_data.get('metric_value', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Threshold</td>
                        <td style="padding: 8px 0; color: #f1f5f9;">{alert_data.get('threshold_value', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Description</td>
                        <td style="padding: 8px 0; color: #f1f5f9;">{alert_data.get('description', '')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Timestamp</td>
                        <td style="padding: 8px 0; color: #f1f5f9;">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
                    </tr>
                </table>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0;">
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                    This is an automated notification from the SLA Monitoring System.<br>
                    Log in to the dashboard for more details and to take action.
                </p>
            </div>
        </body>
        </html>
        """

        return EmailService._send(recipient_email, subject, html_body)

    @staticmethod
    def _send(recipient, subject, html_body):
        """Send an email or simulate if in simulation mode."""
        try:
            simulate = current_app.config.get('SIMULATE_EMAIL', True)
        except RuntimeError:
            simulate = True

        if simulate:
            logger.info(
                f"[EmailService] SIMULATED email to {recipient} | "
                f"Subject: {subject} | "
                f"(Set SIMULATE_EMAIL=false to send real emails)"
            )
            return {'sent': False, 'simulated': True, 'recipient': recipient, 'subject': subject}

        try:
            smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = current_app.config.get('SMTP_PORT', 587)
            smtp_username = current_app.config.get('SMTP_USERNAME', '')
            smtp_password = current_app.config.get('SMTP_PASSWORD', '')

            if not smtp_username or not smtp_password:
                logger.warning("[EmailService] SMTP credentials not configured. Skipping email.")
                return {'sent': False, 'error': 'SMTP credentials not configured'}

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_username
            msg['To'] = recipient
            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_username, recipient, msg.as_string())

            logger.info(f"[EmailService] Email sent to {recipient}: {subject}")
            return {'sent': True, 'recipient': recipient, 'subject': subject}

        except Exception as e:
            logger.error(f"[EmailService] Failed to send email to {recipient}: {str(e)}")
            return {'sent': False, 'error': str(e)}
