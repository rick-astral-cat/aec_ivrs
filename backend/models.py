from sqlalchemy import Column, Integer, String, Boolean, JSON
from database import Base


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
