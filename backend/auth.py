import base64
import io
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import pyotp
import qrcode
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
import models

# Configuración JWT y Seguridad
SECRET_KEY = os.getenv("JWT_SECRET", "dalton_aec_ivrs_secret_key_change_in_production_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 horas por defecto
MFA_TOKEN_EXPIRE_MINUTES = 10

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Genera hash seguro con bcrypt."""
    # bcrypt limita contraseñas a 72 bytes
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña plana contra su hash bcrypt."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def generate_totp_secret() -> str:
    """Genera una clave secreta base32 para TOTP."""
    return pyotp.random_base32()


def get_totp_uri(username: str, secret: str) -> str:
    """Genera el URI estándar otpauth:// compatible con Google Authenticator y Authy."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name="Dalton AEC IVRS")


def generate_qr_data_url(otpauth_uri: str) -> str:
    """Genera la imagen del código QR en base64 (Data URL) lista para src en <img>."""
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
    """Verifica el código de 6 dígitos con ventana de tolerancia de ±30 segundos."""
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)


def create_token(payload: dict, expires_minutes: int) -> str:
    """Genera un token JWT firmado con expiración."""
    to_encode = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decodifica y valida un token JWT."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def create_access_token(user_id: int, username: str) -> str:
    """Token de acceso principal para peticiones a la API."""
    return create_token(
        {"sub": str(user_id), "username": username, "scope": "access"},
        expires_minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
    )


def create_mfa_challenge_token(user_id: int, username: str) -> str:
    """Token temporal de desafío MFA al iniciar sesión."""
    return create_token(
        {"sub": str(user_id), "username": username, "scope": "mfa_challenge"},
        expires_minutes=MFA_TOKEN_EXPIRE_MINUTES,
    )


def create_mfa_setup_token(user_id: int, username: str, secret: str) -> str:
    """Token temporal para primer enrolamiento de MFA con QR."""
    return create_token(
        {"sub": str(user_id), "username": username, "temp_secret": secret, "scope": "mfa_setup"},
        expires_minutes=15,
    )


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    """Dependencia para proteger endpoints con JWT Bearer."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida. Token no proporcionado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(auth.credentials)
    if not payload or payload.get("scope") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Por favor inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin identificador de usuario válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(models.User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o no encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
