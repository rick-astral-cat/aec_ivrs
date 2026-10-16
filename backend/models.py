from sqlalchemy import Column, Integer, String, Boolean, JSON
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)          # Secreto base32 para TOTP (Google Auth)
    is_mfa_enabled = Column(Boolean, default=False)      # True una vez confirmado el primer código QR
    is_active = Column(Boolean, default=True)


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
