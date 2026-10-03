-- SLA Monitoring System - Database initialization
-- Tables are created by SQLAlchemy; this file seeds default roles for Docker deployments.

INSERT INTO roles (name, description, is_default, created_at, updated_at)
VALUES
    ('Admin', 'Full system access', false, NOW(), NOW()),
    ('Developer', 'Manage services and monitoring', false, NOW(), NOW()),
    ('Viewer', 'Read-only access', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
