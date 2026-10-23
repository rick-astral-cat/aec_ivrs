"""Application entry point: assembles the FastAPI app, middleware and routers."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config  # noqa: F401  # Loads .env and validates settings at import time.
import models
from bootstrap import ensure_default_admin
from database import engine, session_scope
from routers import agencies, auth as auth_router

# Configure application logging. A basic console handler is enough for now and
# gives us a single place to raise the level or attach file/remote handlers when
# we start auditing changes (e.g. agency edits) later on.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed the default administrator account on first run.
    with session_scope() as db:
        ensure_default_admin(db)
    yield


app = FastAPI(title="AEC IVRS API", lifespan=lifespan)

# Allowed CORS origins (supports localhost and environment variables for AWS).
origins_env = os.getenv("ALLOWED_ORIGINS", "")
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All API routes live under /api so they do not collide with the SPA routes
# (React Router). This lets nginx serve index.html on /agencies/{id} while
# routing data requests to /api/agencies/{id}.
app.include_router(auth_router.router)
app.include_router(agencies.router)
