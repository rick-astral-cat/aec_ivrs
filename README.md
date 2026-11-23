# AEC IVRS — Dalton IVR Manager

Herramienta web para registrar, visualizar y exportar los flujos IVR de las agencias Dalton en Avaya Enterprise Cloud.

---

## Propósito

Permite capturar la estructura completa de un IVR por agencia: menús, submenús, dígitos, grupos de timbrado, extensiones, buzones y redirecciones a CADD. El flujo se almacena como JSON y se puede visualizar como diagrama interactivo o exportar como diagrama Mermaid.

---

## Stack

### Backend
| Librería | Versión | Uso |
|---|---|---|
| **FastAPI** | latest | Framework REST API |
| **SQLAlchemy** | 2.x | ORM + manejo de SQLite |
| **SQLite** | — | Base de datos local (archivo `ivrs.db`) |
| **Uvicorn** | latest | Servidor ASGI |
| **Pydantic** | 2.x | Validación de schemas |
| **bcrypt** | latest | Cifrado seguro de contraseñas |
| **PyJWT** | latest | Generación y validación de tokens JWT |
| **pyotp** | latest | Manejo de algoritmos TOTP (RFC 6238) para MFA |
| **qrcode + Pillow**| latest | Generación de códigos QR en Base64 |

### Frontend
| Librería | Versión | Uso |
|---|---|---|
| **React** | 19 | UI framework |
| **Vite** | 6 | Build tool |
| **MUI (Material UI)** | 7 | Componentes UI y sistema de diseño |
| **React Router DOM** | 7 | Navegación SPA |
| **@xyflow/react** | latest | Editor visual de nodos drag-and-drop para el IVR |
| **Mermaid.js** | latest | Generación y exportación de diagramas de flujo |
| **Axios** | latest | Cliente HTTP hacia el backend con interceptores JWT |

---

## Estructura del proyecto

```
aec_ivrs/
├── backend/
│   ├── auth.py          # bcrypt hashing, JWT tokens and TOTP/QR logic
│   ├── config.py        # Centralized settings (.env loading, JWT secret)
│   ├── database.py      # SQLite connection, get_db() and session_scope()
│   ├── bootstrap.py     # Startup routines (run migrations, default admin seeding)
│   ├── main.py          # App assembly: middleware, logging, router wiring
│   ├── manage_users.py  # CLI to create users and reset MFA on AWS
│   ├── models.py        # User and Agency models (SQLAlchemy)
│   ├── schemas.py       # Pydantic schemas
│   ├── routers/
│   │   ├── auth.py      # /api/auth/* routes (login, MFA, me)
│   │   └── agencies.py  # /api/agencies/* CRUD routes
│   ├── services/
│   │   ├── agency_service.py  # Agency data-access logic
│   │   └── user_service.py    # User data-access logic
│   ├── migrations/      # Alembic migrations (versions/0001_..., 0002_...)
│   ├── alembic.ini      # Alembic configuration
│   ├── .env.example     # Template for environment variables
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/
        │   ├── client.js    # Instancia Axios con interceptor Bearer
        │   ├── auth.js      # Peticiones de login y MFA
        │   └── agencies.js  # CRUD de agencias protegido
        ├── components/
        │   ├── AppLayout.jsx    # Shell MUI con datos de usuario y logout
        │   ├── MfaCodeInput.jsx # Input numérico de 6 dígitos
        │   ├── MfaQrCard.jsx    # Card con visualizador de QR y clave manual
        │   ├── ProtectedRoute.jsx # Guard de rutas autenticadas
        │   ├── AgencyForm.jsx
        │   ├── IVRBuilder.jsx
        │   └── IVRDiagram.jsx
        ├── context/
        │   └── AuthContext.jsx  # Proveedor de estado de autenticación
        ├── pages/
        │   ├── LoginPage.jsx    # Vista de login con paso MFA/QR
        │   ├── AgenciesPage.jsx
        │   └── AgencyDetailPage.jsx
        ├── theme.js         # Tema MUI (colores Dalton)
        └── main.jsx         # Entry point con ThemeProvider
```

---

## Autenticación y MFA (2FA)

La aplicación implementa protección completa mediante **JWT** y **MFA basado en QR (TOTP - Google Authenticator / Authy)**.

### Credenciales iniciales por defecto:
- **Usuario:** `admin`
- **Contraseña:** `Dalton2026!`
*(Al primer inicio de sesión se le solicitará escanear el código QR con una app Authenticator).*

### Gestión de usuarios en servidor (CLI):

Para producción en AWS no es necesario realizar consultas SQL manuales. Se incluye la herramienta CLI `manage_users.py`:

```bash
# Listar usuarios registrados y su estado MFA
python manage_users.py list

# Crear un nuevo usuario
python manage_users.py create --username rgarcia --password MiPasswordSeguro123!

# Resetear MFA si un usuario pierde su teléfono (le mostrará un nuevo QR al iniciar sesión)
python manage_users.py reset-mfa --username admin

# Cambiar contraseña de un usuario
python manage_users.py change-password --username admin --password NuevaPassword123!
```

### Variables de entorno recomendadas para producción en AWS:
| Variable | Descripción | Valor por defecto |
|---|---|---|
| `APP_ENV` | Entorno de ejecución: `development` o `production`. En `production` el backend **no arranca** si falta `JWT_SECRET`. | `development` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT. **Obligatoria en producción** (sin fallback). En desarrollo usa una clave insegura marcada como tal. Genérala con `python -c "import secrets; print(secrets.token_urlsafe(64))"` | *(ninguno en producción)* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token de acceso en minutos | `1440` (24 h) |
| `DEFAULT_ADMIN_USER` | Usuario admin inicial si la BD está vacía | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Contraseña admin inicial si la BD está vacía | `Dalton2026!` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos separados por coma | `http://localhost:5173,http://localhost:3000` |
| `VITE_API_URL` | (Frontend) URL del backend en producción | `http://localhost:8000` |

El backend carga automáticamente un archivo `backend/.env` si existe (vía `python-dotenv`). Usa `backend/.env.example` como plantilla. El archivo `.env` está en `.gitignore` y nunca debe subirse al repositorio; en producción prefiere inyectar estas variables mediante el sistema (systemd, Docker o la task definition de AWS).

---

## Modelo de datos IVR (JSON)

El campo `ivr` de cada agencia almacena un árbol de nodos. Tipos de nodo:

| Tipo | Descripción |
|---|---|
| `menu` | Submenú con dígito asignado |
| `timeout` | Rama cuando no se presiona ningún dígito |
| `ring_group` | Timbra extensiones simultáneamente N veces |
| `ring_single` | Timbra una sola extensión N veces |
| `voicemail` | Desvío a buzón de voz |
| `cadd` | Redirección a CADD con número destino |

---

## Cómo correr el proyecto

```bash
# Backend
cd backend
.venv\Scripts\activate       # Windows (.venv/bin/activate en Linux)
copy .env.example .env       # Windows (cp .env.example .env en Linux) — opcional en dev
pip install -r requirements.txt
uvicorn main:app --reload    # http://localhost:8000

# Frontend
cd frontend
npm run dev                  # http://localhost:5173
```

---

## Migraciones de base de datos (Alembic)

El esquema se administra con **Alembic**. El backend aplica automáticamente las migraciones pendientes al arrancar (`bootstrap.run_migrations`), igual que `manage_users.py`. Por eso un despliegue normal es: `git pull`, `pip install -r requirements.txt` y reiniciar el servicio.

- Una base creada antes de Alembic (sin tabla `alembic_version`) se marca automáticamente en la revisión base `0001` sin recrear tablas, y luego se aplican las migraciones nuevas.
- **Respalda `ivrs.db` antes de desplegar cambios de esquema.**
- Arranca el backend siempre desde `backend/`: la ruta de la base (`./ivrs.db`) es relativa al directorio actual.

```bash
cd backend
alembic current                                                  # revisión aplicada
alembic revision --autogenerate --rev-id 0002 -m "add user roles" # nueva migración
alembic upgrade head                                             # aplicar a mano (opcional)
```

Al crear una migración con `--autogenerate`, revisa siempre el archivo generado antes de hacer commit.

---

## Convenciones de commits

Se usa el formato `feat / fix / refactor / chore: descripción` con detalle de cambios por área (`backend`, `frontend`).
