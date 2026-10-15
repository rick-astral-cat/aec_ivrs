from pydantic import BaseModel
from typing import Optional, Any


class AgencyBase(BaseModel):
    name: str
    abbreviation: str
    region: str
    phone_ranges: str
    has_schedule: bool = False
    business_hours: Optional[str] = None
    after_hours_mailbox: Optional[str] = None
    ivr: Optional[Any] = None


class AgencyCreate(AgencyBase):
    pass


class AgencyUpdate(AgencyBase):
    pass


class AgencyOut(AgencyBase):
    id: int

    class Config:
        from_attributes = True
