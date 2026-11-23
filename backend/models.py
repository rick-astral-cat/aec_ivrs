from datetime import datetime, timezone

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base
from roles import DEFAULT_ROLE, ProjectRole


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)          # Secreto base32 para TOTP (Google Auth)
    is_mfa_enabled = Column(Boolean, default=False)      # True una vez confirmado el primer código QR
    is_active = Column(Boolean, default=True)
    # Global role (see roles.Role). Stored as plain text to keep SQLite simple.
    role = Column(String, nullable=False, default=DEFAULT_ROLE.value, server_default=DEFAULT_ROLE.value)
    full_name = Column(String, nullable=True)            # Display name, e.g. "Ricardo Ríos"


class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    abbreviation = Column(String, nullable=False, unique=True)
    region = Column(String, nullable=False)
    phone_ranges = Column(String, nullable=False)          # texto libre, ej: "33-4363-0000 al 33-4363-0097"
    has_schedule = Column(Boolean, default=False)
    business_hours = Column(String, nullable=True)         # ej: "7:00 AM a 19:00"
    after_hours_mailbox = Column(String, nullable=True)
    ivr = Column(JSON, nullable=True)                      # árbol IVR completo en JSON


# --- Teams migration projects ---
#
# Deletions are handled by ORM cascades (SQLite does not enforce foreign keys
# unless PRAGMA foreign_keys is enabled, which we keep off so Alembic batch
# migrations can recreate tables safely). The ondelete clauses document intent
# and take effect if foreign key enforcement is ever enabled.


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_by_id = Column(
        Integer, ForeignKey("users.id", name="fk_projects_created_by_id_users", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    created_by = relationship("User")
    members = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan",
        order_by="ProjectMember.id",
    )
    activities = relationship(
        "Activity", back_populates="project", cascade="all, delete-orphan",
        order_by="(Activity.position, Activity.id)",
    )


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_members_project_id_user_id"),
    )

    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", name="fk_project_members_project_id_projects", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id = Column(
        Integer, ForeignKey("users.id", name="fk_project_members_user_id_users", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # Project-level role (see roles.ProjectRole).
    role = Column(
        String, nullable=False, default=ProjectRole.MEMBER.value, server_default=ProjectRole.MEMBER.value,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    project = relationship("Project", back_populates="members")
    user = relationship("User")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", name="fk_activities_project_id_projects", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    title = Column(String, nullable=False)
    # Must be a member of the project (validated by the project service).
    assignee_id = Column(
        Integer, ForeignKey("users.id", name="fk_activities_assignee_id_users", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    tags = Column(JSON, nullable=False, default=list)       # e.g. ["DHME", "Honda"]
    is_completed = Column(Boolean, nullable=False, default=False, server_default="0")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by_id = Column(
        Integer, ForeignKey("users.id", name="fk_activities_completed_by_id_users", ondelete="SET NULL"),
        nullable=True,
    )
    position = Column(Integer, nullable=False, default=0, server_default="0")  # Display order
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    project = relationship("Project", back_populates="activities")
    assignee = relationship("User", foreign_keys=[assignee_id])
    completed_by = relationship("User", foreign_keys=[completed_by_id])
