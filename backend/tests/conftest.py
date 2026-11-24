"""Shared pytest fixtures.

Tests run against an in-memory SQLite database whose tables are created from
the ORM models, so they never touch ``ivrs.db`` nor run the Alembic migrations
of the app lifespan (the TestClient is not used as a context manager).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import models
from database import Base, get_db
from main import app
from roles import Role


@pytest.fixture
def db():
    # StaticPool keeps a single connection so every session sees the same
    # in-memory database.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _make_user(db, username: str, role: Role) -> models.User:
    # The password hash is never checked: requests authenticate with a token.
    user = models.User(username=username, hashed_password="x", role=role.value, is_active=True)
    db.add(user)
    db.commit()
    return user


def _auth_headers(user: models.User) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth.create_access_token(user.id, user.username)}"}


@pytest.fixture
def admin_headers(db):
    return _auth_headers(_make_user(db, "admin", Role.ADMIN))


@pytest.fixture
def viewer_headers(db):
    return _auth_headers(_make_user(db, "viewer", Role.VIEWER))
