"""Authentication and MFA routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth
import models
import permissions
import schemas
from database import get_db
from services import user_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login step 1: validate username and password.

    If the user has not configured MFA yet, generate a secret and the QR for
    enrollment. If MFA is already configured, request the 6-digit code via a
    challenge token.
    """
    user = user_service.get_by_username(db, payload.username)
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user. Please contact the administrator.",
        )

    # Case 1: user does not have MFA enabled yet -> generate a QR for enrollment.
    if not user.is_mfa_enabled or not user.totp_secret:
        temp_secret = auth.generate_totp_secret()
        uri = auth.get_totp_uri(user.username, temp_secret)
        qr_code = auth.generate_qr_data_url(uri)
        setup_token = auth.create_mfa_setup_token(user.id, user.username, temp_secret)

        return schemas.LoginResponse(
            status="SETUP_MFA",
            username=user.username,
            setup_token=setup_token,
            qr_code=qr_code,
            manual_secret=temp_secret,
            otpauth_url=uri,
        )

    # Case 2: user already has MFA configured -> request a TOTP code.
    challenge_token = auth.create_mfa_challenge_token(user.id, user.username)
    return schemas.LoginResponse(
        status="REQUIRE_MFA",
        username=user.username,
        challenge_token=challenge_token,
    )


@router.post("/mfa/setup-verify", response_model=schemas.TokenResponse)
def verify_mfa_setup(payload: schemas.MFAVerifySetupRequest, db: Session = Depends(get_db)):
    """Login step 2 (first login): verify the 6-digit code from the scanned QR.

    On success, store the secret in the database, mark MFA as enabled and return
    the JWT access token.
    """
    token_data = auth.decode_token(payload.setup_token)
    if not token_data or token_data.get("scope") != "mfa_setup":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup session expired or invalid. Please log in again.",
        )

    user_id = token_data.get("sub")
    temp_secret = token_data.get("temp_secret")

    if not auth.verify_totp_code(temp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect or expired verification code. Check your Authenticator app.",
        )

    user = user_service.get_by_id(db, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Persist the confirmed secret and enable MFA.
    user.totp_secret = temp_secret
    user.is_mfa_enabled = True
    db.commit()

    access_token = auth.create_access_token(user.id, user.username)
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        is_mfa_enabled=True,
    )


@router.post("/mfa/login-verify", response_model=schemas.TokenResponse)
def verify_mfa_login(payload: schemas.MFAVerifyLoginRequest, db: Session = Depends(get_db)):
    """Login step 2 (subsequent logins): validate the 6-digit TOTP code against
    the user's stored secret.
    """
    token_data = auth.decode_token(payload.challenge_token)
    if not token_data or token_data.get("scope") != "mfa_challenge":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA challenge expired or invalid. Please log in again.",
        )

    user_id = token_data.get("sub")
    user = user_service.get_by_id(db, int(user_id))
    if not user or not user.is_active or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not valid for MFA")

    if not auth.verify_totp_code(user.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect authentication code. Try the current code from your app.",
        )

    access_token = auth.create_access_token(user.id, user.username)
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        is_mfa_enabled=True,
    )


@router.get("/me", response_model=schemas.CurrentUserOut)
def get_current_authenticated_user(current_user: models.User = Depends(auth.get_current_user)):
    """Return the current user's information, role and granted permissions."""
    granted = sorted(p.value for p in permissions.permissions_for(current_user.role))
    return schemas.CurrentUserOut(
        **schemas.UserOut.model_validate(current_user).model_dump(),
        permissions=granted,
    )


@router.post("/mfa/reconfigure-init", response_model=schemas.LoginResponse)
def reconfigure_mfa_init(current_user: models.User = Depends(auth.get_current_user)):
    """Let an authenticated user request a new QR to switch mobile devices."""
    temp_secret = auth.generate_totp_secret()
    uri = auth.get_totp_uri(current_user.username, temp_secret)
    qr_code = auth.generate_qr_data_url(uri)
    setup_token = auth.create_mfa_setup_token(current_user.id, current_user.username, temp_secret)

    return schemas.LoginResponse(
        status="SETUP_MFA",
        username=current_user.username,
        setup_token=setup_token,
        qr_code=qr_code,
        manual_secret=temp_secret,
        otpauth_url=uri,
    )
