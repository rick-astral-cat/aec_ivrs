from pydantic import BaseModel, ConfigDict
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
    # Full-replacement (PUT) semantics: all fields are required, same as create.
    pass


class AgencyOut(AgencyBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Authentication and MFA schemas ---

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    status: str  # "REQUIRE_MFA" | "SETUP_MFA"
    username: str
    challenge_token: Optional[str] = None
    setup_token: Optional[str] = None
    qr_code: Optional[str] = None
    manual_secret: Optional[str] = None
    otpauth_url: Optional[str] = None


class MFAVerifyLoginRequest(BaseModel):
    challenge_token: str
    code: str


class MFAVerifySetupRequest(BaseModel):
    setup_token: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_mfa_enabled: bool


class UserOut(BaseModel):
    id: int
    username: str
    is_mfa_enabled: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
