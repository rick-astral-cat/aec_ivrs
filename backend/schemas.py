from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, Any

import ivr_schema
from roles import ProjectRole


class AgencyFields(BaseModel):
    """Scalar agency fields shared by every agency schema (no IVR tree)."""

    name: str
    abbreviation: str
    region: str
    phone_ranges: str
    has_schedule: bool = False
    business_hours: Optional[str] = None
    after_hours_mailbox: Optional[str] = None


class AgencyBase(AgencyFields):
    ivr: Optional[Any] = None


class AgencyIn(AgencyBase):
    """Agency payload received from clients; the IVR tree is validated here."""

    @field_validator("ivr")
    @classmethod
    def _validate_ivr(cls, value: Any) -> Any:
        """Validate the IVR tree structure before persisting it."""
        return ivr_schema.validate_ivr(value)


class AgencyCreate(AgencyIn):
    pass


class AgencyUpdate(AgencyIn):
    # Full-replacement (PUT) semantics: all fields are required, same as create.
    pass


class AgencyOut(AgencyBase):
    """Full agency, IVR tree included. It was validated when it was written,
    so responses do not validate it again."""

    id: int

    model_config = ConfigDict(from_attributes=True)


class AgencySummaryOut(AgencyFields):
    """Agency row for the list endpoint: no IVR tree, only whether it has one."""

    id: int
    has_ivr: bool

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
    full_name: Optional[str] = None
    role: str
    is_mfa_enabled: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class CurrentUserOut(UserOut):
    """Authenticated user plus the permissions granted by their role.

    The frontend uses ``permissions`` only to hide actions; the backend still
    authorizes every request.
    """

    permissions: list[str]


# --- Teams migration projects ---

MAX_TAGS = 20
MAX_TAG_LENGTH = 40


def _normalize_tags(tags: list[str]) -> list[str]:
    """Trim tags, collapse inner spaces, drop empties and case-insensitive duplicates."""
    result: list[str] = []
    seen: set[str] = set()
    for raw in tags:
        tag = " ".join(str(raw).split())
        if not tag:
            continue
        if len(tag) > MAX_TAG_LENGTH:
            raise ValueError(f"Each tag must be at most {MAX_TAG_LENGTH} characters")
        if tag.lower() not in seen:
            seen.add(tag.lower())
            result.append(tag)
    if len(result) > MAX_TAGS:
        raise ValueError(f"At most {MAX_TAGS} tags are allowed")
    return result


def _clean_required_text(value: Optional[str]) -> Optional[str]:
    # None only reaches here on partial updates, where it means "no change".
    if value is None:
        return None
    value = value.strip()
    if not value:
        raise ValueError("Must not be empty")
    return value


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


class UserSummary(BaseModel):
    """Public subset of a user, safe to show to any authenticated user."""

    id: int
    username: str
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

    _clean_name = field_validator("name")(_clean_required_text)
    _clean_description = field_validator("description")(_clean_optional_text)


class ProjectUpdate(BaseModel):
    """Partial update (PATCH): only the fields sent are changed."""

    name: Optional[str] = None
    description: Optional[str] = None

    _clean_name = field_validator("name")(_clean_required_text)
    _clean_description = field_validator("description")(_clean_optional_text)


class MemberCreate(BaseModel):
    user_id: int
    role: ProjectRole = ProjectRole.MEMBER


class MemberUpdate(BaseModel):
    role: ProjectRole


class MemberOut(BaseModel):
    id: int
    role: ProjectRole
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


class ActivityCreate(BaseModel):
    title: str
    assignee_id: Optional[int] = None
    tags: list[str] = Field(default_factory=list)
    due_date: Optional[date] = None

    _clean_title = field_validator("title")(_clean_required_text)
    _clean_tags = field_validator("tags")(_normalize_tags)


class ActivityUpdate(BaseModel):
    """Partial update (PATCH). Send ``assignee_id: null`` to unassign and
    ``due_date: null`` to clear the due date."""

    title: Optional[str] = None
    assignee_id: Optional[int] = None
    tags: Optional[list[str]] = None
    due_date: Optional[date] = None
    is_completed: Optional[bool] = None
    position: Optional[int] = Field(default=None, ge=0)

    _clean_title = field_validator("title")(_clean_required_text)

    @field_validator("tags")
    @classmethod
    def _clean_tags(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        return None if value is None else _normalize_tags(value)


class ActivityOut(BaseModel):
    id: int
    title: str
    assignee: Optional[UserSummary] = None
    tags: list[str]
    due_date: Optional[date] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    completed_by: Optional[UserSummary] = None
    position: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectSummaryOut(BaseModel):
    """Card shown in the projects grid."""

    id: int
    name: str
    description: Optional[str] = None
    activity_count: int
    completed_count: int
    members: list[MemberOut]
    my_role: Optional[ProjectRole] = None  # None when seen through projects:view_all
    created_at: datetime
    updated_at: datetime


class ProjectDetailOut(ProjectSummaryOut):
    created_by: Optional[UserSummary] = None
    activities: list[ActivityOut]
    can_manage: bool  # Whether the current user can edit the project, members and activities
