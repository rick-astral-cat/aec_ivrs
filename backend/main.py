import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import auth
from database import engine, get_db, SessionLocal

models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de usuario por defecto si la base de datos está vacía
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            default_user = os.getenv("DEFAULT_ADMIN_USER", "admin")
            default_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "Dalton2026!")
            admin_user = models.User(
                username=default_user,
                hashed_password=auth.hash_password(default_pass),
                is_mfa_enabled=False,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            print(
                f"[AEC IVRS] Se generó el usuario administrador inicial: '{default_user}'. "
                f"Configurará MFA por QR en su primer inicio de sesión."
            )
    finally:
        db.close()
    yield


app = FastAPI(title="AEC IVRS API", lifespan=lifespan)

# Configuración de orígenes permitidos para CORS (soporta localhost y variables de entorno para AWS)
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


# Todas las rutas del API viven bajo /api para no colisionar con las rutas del
# SPA (React Router). Así nginx puede servir index.html en /agencies/{id} y
# enrutar las peticiones de datos a /api/agencies/{id}.
api = APIRouter(prefix="/api")


# ── Rutas de Autenticación y MFA ──

@api.post("/auth/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Paso 1 del Login: valida usuario y contraseña.
    Si el usuario aún no tiene MFA configurado, genera un secreto y el QR para enrolamiento.
    Si ya tiene MFA, solicita el código de 6 dígitos mediante un challenge token.
    """
    user = db.query(models.User).filter(models.User.username == payload.username.strip()).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo. Contacta al administrador.",
        )

    # Caso 1: Usuario no tiene MFA activo -> Generar código QR para enrolamiento
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

    # Caso 2: Usuario ya tiene MFA configurado -> Solicitar código TOTP
    challenge_token = auth.create_mfa_challenge_token(user.id, user.username)
    return schemas.LoginResponse(
        status="REQUIRE_MFA",
        username=user.username,
        challenge_token=challenge_token,
    )


@api.post("/auth/mfa/setup-verify", response_model=schemas.TokenResponse)
def verify_mfa_setup(payload: schemas.MFAVerifySetupRequest, db: Session = Depends(get_db)):
    """Paso 2 (Primer Login): verifica el código de 6 dígitos del QR escaneado.
    Si es válido, guarda el secreto en base de datos, marca MFA como activo y entrega el JWT de acceso.
    """
    token_data = auth.decode_token(payload.setup_token)
    if not token_data or token_data.get("scope") != "mfa_setup":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesión de configuración de MFA expirada o inválida. Inicia sesión nuevamente.",
        )

    user_id = token_data.get("sub")
    temp_secret = token_data.get("temp_secret")

    if not auth.verify_totp_code(temp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificación incorrecto o expirado. Revisa tu aplicación Authenticator.",
        )

    user = db.get(models.User, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    # Guardar secreto confirmado y activar MFA
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


@api.post("/auth/mfa/login-verify", response_model=schemas.TokenResponse)
def verify_mfa_login(payload: schemas.MFAVerifyLoginRequest, db: Session = Depends(get_db)):
    """Paso 2 (Logins posteriores): valida el código TOTP de 6 dígitos contra el secreto del usuario."""
    token_data = auth.decode_token(payload.challenge_token)
    if not token_data or token_data.get("scope") != "mfa_challenge":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desafío MFA expirado o inválida. Inicia sesión nuevamente.",
        )

    user_id = token_data.get("sub")
    user = db.get(models.User, int(user_id))
    if not user or not user.is_active or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario no válido para MFA")

    if not auth.verify_totp_code(user.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de autenticación incorrecto. Intenta con el código actual de tu aplicación.",
        )

    access_token = auth.create_access_token(user.id, user.username)
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        is_mfa_enabled=True,
    )


@api.get("/auth/me", response_model=schemas.UserOut)
def get_current_authenticated_user(current_user: models.User = Depends(auth.get_current_user)):
    """Devuelve la información del usuario en sesión."""
    return current_user


@api.post("/auth/mfa/reconfigure-init", response_model=schemas.LoginResponse)
def reconfigure_mfa_init(current_user: models.User = Depends(auth.get_current_user)):
    """Permite a un usuario autenticado solicitar un nuevo QR para cambiar de dispositivo móvil."""
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


# ── Rutas CRUD de Agencias (Protegidas con autenticación) ──

@api.get("/agencies", response_model=list[schemas.AgencyOut], dependencies=[Depends(auth.get_current_user)])
def list_agencies(db: Session = Depends(get_db)):
    return db.query(models.Agency).all()


@api.post("/agencies",
response_model=schemas.AgencyOut,
status_code=201,
dependencies=[Depends(auth.get_current_user)],)
def create_agency(payload: schemas.AgencyCreate, db: Session = Depends(get_db)):
    agency = models.Agency(**payload.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return agency


@api.get("/agencies/{agency_id}", response_model=schemas.AgencyOut, dependencies=[Depends(auth.get_current_user)])
def get_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency


@api.put("/agencies/{agency_id}", response_model=schemas.AgencyOut, dependencies=[Depends(auth.get_current_user)])
def update_agency(agency_id: int, payload: schemas.AgencyUpdate, db: Session = Depends(get_db)):
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    for key, value in payload.model_dump().items():
        setattr(agency, key, value)
    db.commit()
    db.refresh(agency)
    return agency


@api.delete("/agencies/{agency_id}", status_code=204, dependencies=[Depends(auth.get_current_user)])
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    db.delete(agency)
    db.commit()


# Registrar todas las rutas del API bajo el prefijo /api
app.include_router(api)
