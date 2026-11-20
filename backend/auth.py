import base64
import io
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import pyotp
import qrcode
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import config
from database import get_db
import models

# JWT and security configuration (resolved and validated in config.py).
SECRET_KEY = config.JWT_SECRET
ALGORITHM = config.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES  # 24h default
MFA_TOKEN_EXPIRE_MINUTES = config.MFA_TOKEN_EXPIRE_MINUTES

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Generate a secure bcrypt hash."""
    # bcrypt limits passwords to 72 bytes.
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def generate_totp_secret() -> str:
    """Generate a base32 secret key for TOTP."""
    return pyotp.random_base32()


def get_totp_uri(username: str, secret: str) -> str:
    """Build the standard otpauth:// URI compatible with Google Authenticator and Authy."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name="Dalton AEC IVRS")


def generate_qr_data_url(otpauth_uri: str) -> str:
    """Generate the QR image as a base64 Data URL ready for an <img> src."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_b64}"


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify the 6-digit code with a tolerance window of +/-30 seconds."""
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)


def create_token(payload: dict, expires_minutes: int) -> str:
    """Generate a signed JWT with an expiration."""
    to_encode = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def create_access_token(user_id: int, username: str) -> str:
    """Primary access token for API requests."""
    return create_token(
        {"sub": str(user_id), "username": username, "scope": "access"},
        expires_minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
    )


def create_mfa_challenge_token(user_id: int, username: str) -> str:
    """Temporary MFA challenge token issued at login."""
    return create_token(
        {"sub": str(user_id), "username": username, "scope": "mfa_challenge"},
        expires_minutes=MFA_TOKEN_EXPIRE_MINUTES,
    )


def create_mfa_setup_token(user_id: int, username: str, secret: str) -> str:
    """Temporary token for first-time MFA enrollment via QR."""
    return create_token(
        {"sub": str(user_id), "username": username, "temp_secret": secret, "scope": "mfa_setup"},
        expires_minutes=15,
    )


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    """Dependency that protects endpoints using a JWT Bearer token."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No token provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(auth.credentials)
    if not payload or payload.get("scope") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token without a valid user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(models.User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or unknown user.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
