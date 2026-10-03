"""
Application configuration module.
Supports SQLite (development) and MySQL/PostgreSQL (production).
All settings can be overridden via environment variables.
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class."""

    # ── Flask Core ──────────────────────────────────────────────────
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    ENV = FLASK_ENV

    # ── Database ────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///sla_monitoring.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SQLite does not support connection pooling options; apply them
    # only when using MySQL / PostgreSQL.
    _db_uri = os.environ.get('DATABASE_URL', 'sqlite:///sla_monitoring.db')
    if _db_uri and _db_uri.startswith('sqlite'):
        SQLALCHEMY_ENGINE_OPTIONS = {}
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size': 10,
            'max_overflow': 20,
            'pool_timeout': 30,
            'pool_recycle': 1800,
        }

    # ── JWT Authentication ──────────────────────────────────────────
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 604800))
    )
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # ── Redis (optional – used for caching) ─────────────────────────
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    # ── CORS ────────────────────────────────────────────────────────
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            'CORS_ORIGINS',
            'http://localhost:5173,http://localhost:5174,'
            'http://127.0.0.1:5173,http://127.0.0.1:5174'
        ).split(',')
        if origin.strip()
    ]

    # ── Monitoring Defaults ─────────────────────────────────────────
    DEFAULT_POLLING_INTERVAL = int(os.environ.get('DEFAULT_POLLING_INTERVAL', 30))
    DEFAULT_RESPONSE_TIME_THRESHOLD = int(os.environ.get('DEFAULT_RESPONSE_TIME_THRESHOLD', 2000))
    DEFAULT_CPU_THRESHOLD = float(os.environ.get('DEFAULT_CPU_THRESHOLD', 80))
    DEFAULT_RAM_THRESHOLD = float(os.environ.get('DEFAULT_RAM_THRESHOLD', 85))
    DEFAULT_DISK_THRESHOLD = float(os.environ.get('DEFAULT_DISK_THRESHOLD', 90))
    DEFAULT_AVAILABILITY_THRESHOLD = float(os.environ.get('DEFAULT_AVAILABILITY_THRESHOLD', 99.9))

    # ── Email / Notifications ───────────────────────────────────────
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SIMULATE_EMAIL = os.environ.get('SIMULATE_EMAIL', 'true').lower() == 'true'

    # ── Reports ─────────────────────────────────────────────────────
    REPORTS_DIR = os.environ.get('REPORTS_DIR', os.path.join(
        os.path.dirname(os.path.abspath(__file__)), 'reports'
    ))

    # ── Rate Limiting ───────────────────────────────────────────────
    RATE_LIMIT_DEFAULT = "100 per minute"
    RATE_LIMIT_AUTH = "10 per minute"


class DevelopmentConfig(Config):
    """Development configuration – debug enabled, SQLite."""
    DEBUG = True
    FLASK_ENV = 'development'


class ProductionConfig(Config):
    """Production configuration – debug disabled."""
    DEBUG = False
    FLASK_ENV = 'production'


class TestingConfig(Config):
    """Testing configuration – separate test database."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///sla_monitoring_test.db'
    WTF_CSRF_ENABLED = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}
