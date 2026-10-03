from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.database import db
from app.utils.datetime_utils import to_iso_utc

user_roles = Table('user_roles', db.Model.metadata,
                   Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
                   Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
                   )

role_permissions = Table('role_permissions', db.Model.metadata,
                         Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
                         Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
                         )


class Permission(db.Model):
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'resource': self.resource,
            'action': self.action,
            'created_at': to_iso_utc(self.created_at)
        }


class Role(db.Model):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship('User', secondary=user_roles, back_populates='roles')
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_default': self.is_default,
            'permissions': [p.to_dict() for p in self.permissions],
            'created_at': to_iso_utc(self.created_at)
        }


class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    avatar_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    timezone = Column(String(50), default='UTC')
    language = Column(String(10), default='en')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    roles = relationship('Role', secondary=user_roles, back_populates='users')
    alerts = relationship('Alert', foreign_keys='Alert.user_id', back_populates='user', lazy='dynamic')
    reports = relationship('Report', back_populates='user', lazy='dynamic')
    audit_logs = relationship('AuditLog', back_populates='user', lazy='dynamic')

    @property
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or self.username

    @property
    def is_admin(self):
        return any(role.name == 'Admin' for role in self.roles)

    def has_permission(self, resource, action):
        for role in self.roles:
            for perm in role.permissions:
                if perm.resource == resource and perm.action == action:
                    return True
        return False

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': to_iso_utc(self.last_login),
            'timezone': self.timezone,
            'language': self.language,
            'roles': [role.to_dict() for role in self.roles],
            'is_admin': self.is_admin,
            'created_at': to_iso_utc(self.created_at),
            'updated_at': to_iso_utc(self.updated_at)
        }
        if include_sensitive:
            data['login_attempts'] = self.login_attempts
        return data
