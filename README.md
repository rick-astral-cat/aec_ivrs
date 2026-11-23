# AEC IVRS — Dalton IVR Manager

Herramienta web para registrar, visualizar y exportar los flujos IVR de las agencias Dalton en Avaya Enterprise Cloud, y para dar seguimiento a los proyectos de migración a Microsoft Teams.

---

## Propósito

Permite capturar la estructura completa de un IVR por agencia: menús, submenús, dígitos, grupos de timbrado, extensiones, buzones y redirecciones a CADD. El flujo se almacena como JSON y se puede visualizar como diagrama interactivo o exportar como diagrama Mermaid.

Además incluye el módulo **Migración TEAMS**: proyectos con integrantes, actividades asignadas, pills de categorías y avance de completado (ver más abajo).

---

## Stack

### Backend
| Librería | Versión | Uso |
|---|---|---|
| **FastAPI** | latest | Framework REST API |
| **SQLAlchemy** | 2.x | ORM + manejo de SQLite |
| **Alembic** | latest | Migraciones de esquema de la base de datos |
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
| **Vite** | 8 | Build tool |
| **MUI (Material UI)** | 9 | Componentes UI y sistema de diseño |
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
│   ├── manage_users.py  # CLI to manage users, roles, names and MFA on AWS
│   ├── models.py        # User, Agency, Project, ProjectMember, Activity (SQLAlchemy)
│   ├── roles.py         # Global roles (admin/editor/viewer) and project roles (owner/member)
│   ├── permissions.py   # Role -> permission map and require_permission() dependency
│   ├── schemas.py       # Pydantic schemas
│   ├── routers/
│   │   ├── auth.py      # /api/auth/* routes (login, MFA, me)
│   │   ├── agencies.py  # /api/agencies/* CRUD routes (permission-protected)
│   │   ├── projects.py  # /api/projects/* projects, members and activities
│   │   └── users.py     # /api/users directory (id, username, full name)
│   ├── services/
│   │   ├── agency_service.py   # Agency data-access logic
│   │   ├── user_service.py     # User data-access logic
│   │   ├── project_service.py  # Project/member/activity logic and business rules
│   │   └── project_access.py   # Project-level access rules (view/manage/complete)
│   ├── migrations/      # Alembic migrations (versions/0001_..., 0002_..., 0003_...)
│   ├── alembic.ini      # Alembic configuration
│   ├── .env.example     # Template for environment variables
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/
        │   ├── client.js    # Instancia Axios con interceptor Bearer
        │   ├── auth.js      # Peticiones de login y MFA
        │   ├── agencies.js  # CRUD de agencias protegido
        │   ├── projects.js  # Proyectos, integrantes y actividades (Migración TEAMS)
        │   └── users.js     # Directorio de usuarios y displayName()
        ├── auth/
        │   └── permissions.js   # Constantes de permisos y etiquetas de roles
        ├── hooks/
        │   └── usePermission.js # true si el usuario tiene un permiso
        ├── components/
        │   ├── AppLayout.jsx    # Shell MUI: menú lateral, usuario, rol y logout
        │   ├── TeamsIcon.jsx    # Icono propio inspirado en Microsoft Teams
        │   ├── projects/        # Tarjetas, integrantes, actividades y diálogos de proyectos
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
        │   ├── AgencyDetailPage.jsx
        │   ├── ProjectsPage.jsx      # Grid de proyectos (Migración TEAMS)
        │   └── ProjectDetailPage.jsx # Detalle: datos, integrantes y actividades
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
# Listar usuarios registrados con nombre, rol y estado MFA
python manage_users.py list

# Crear un nuevo usuario (rol por defecto: viewer)
python manage_users.py create --username rgarcia --password MiPasswordSeguro123! \
    --role editor --full-name "Ricardo García"

# Cambiar el rol global de un usuario (admin | editor | viewer)
python manage_users.py set-role --username rgarcia --role admin

# Poner el nombre que se muestra en la app (texto vacío lo borra)
python manage_users.py set-name --username rgarcia --full-name "Ricardo García"

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

## Roles y permisos

Cada usuario tiene un **rol global** (`users.role`). El mapa de rol a permisos vive en `backend/permissions.py`; las rutas lo exigen con la dependencia `require_permission()` y `/api/auth/me` devuelve la lista de permisos para que el frontend oculte lo que el usuario no puede hacer (el backend siempre autoriza cada petición).

| Permiso | `admin` | `editor` | `viewer` |
|---|:-:|:-:|:-:|
| `agencies:read` | ✅ | ✅ | ✅ |
| `agencies:create` / `agencies:update` | ✅ | ✅ | ❌ |
| `agencies:delete` | ✅ | ❌ | ❌ |
| `projects:create` | ✅ | ✅ | ❌ |
| `projects:view_all` / `projects:manage_all` | ✅ | ❌ | ❌ |
| `users:manage` | ✅ | ❌ | ❌ |

- Los usuarios nuevos se crean como `viewer`; el admin inicial (`DEFAULT_ADMIN_USER`) como `admin`.
- Un rol desconocido no otorga ningún permiso.
- Sin permiso de edición, el detalle de agencia y el IVR Builder se muestran en **solo lectura** (se puede exportar).
- Los roles se administran con `manage_users.py set-role` (por ahora no hay pantalla de usuarios).

---

## Migración TEAMS (proyectos)

Módulo para dar seguimiento a los proyectos de migración a Microsoft Teams (menú **Migración TEAMS**).

- **Proyectos:** grid de tarjetas estilo Classroom con título, descripción, `X de Y actividades`, barra de avance y pills de integrantes.
- **Integrantes:** son usuarios de la app (los que inician sesión con MFA). Cada uno tiene un rol dentro del proyecto: **Líder** (`owner`) o **Integrante** (`member`). Quien crea el proyecto queda como líder y siempre debe quedar al menos uno.
- **Actividades:** nombre, encargado (integrante del proyecto), pills libres para categorías o datos (se sugieren las siglas de las agencias, p. ej. `DHME`) y estado de completado con quién y cuándo se completó.

| Acción en un proyecto | Admin | Líder | Integrante | Encargado |
|---|:-:|:-:|:-:|:-:|
| Ver el proyecto | ✅ | ✅ | ✅ | ✅ |
| Editar o eliminar el proyecto | ✅ | ✅ | ❌ | ❌ |
| Agregar, quitar o cambiar rol de integrantes | ✅ | ✅ | ❌ | ❌ |
| Crear, editar o eliminar actividades | ✅ | ✅ | ❌ | ❌ |
| Marcar una actividad como completada | ✅ | ✅ | ❌ | ✅ (solo las suyas) |

- Crear proyectos requiere `projects:create` (admin o editor).
- Cada usuario solo ve los proyectos donde es integrante; el admin ve todos. Los proyectos ajenos responden 404.
- Al quitar a un integrante, sus actividades quedan sin encargado. Al eliminar un proyecto se borran sus integrantes (membresías) y actividades, **nunca los usuarios**.

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

## Despliegue en producción

Backend y frontend se despliegan con scripts en `deploy/`. Ninguno toca git: primero actualiza el código tú mismo. Cuando un cambio toca ambos (p. ej. rutas nuevas del API), despliega **los dos**.

### Backend

El script `deploy/deploy_backend.sh` copia el backend del checkout de git (`~/aec_ivrs`) al directorio productivo (`/var/www/html/aec_ivrs/backend`). No toca git: primero actualiza el código tú mismo.

```bash
cd ~/aec_ivrs
git fetch && git reset --hard origin/<rama>
bash deploy/deploy_backend.sh --dry-run   # opcional: ver qué archivos cambian
bash deploy/deploy_backend.sh             # -y para omitir la confirmación
```

El script detiene el servicio `aec_ivrs.service`, respalda `ivrs.db` en `db_backups/` con fecha y hora, sincroniza el código con `rsync` (sin tocar `.env`, `.venv/`, `*.db` ni `__pycache__/`), instala dependencias, aplica las migraciones y reinicia el servicio verificando que quede activo. Si algo falla, indica si la base de datos se modificó y cómo restaurar el respaldo. Rutas y nombre del servicio se pueden cambiar con variables de entorno (`DEST_DIR`, `SERVICE`, etc.).

### Frontend

El script `deploy/deploy_frontend.sh` compila el frontend en el checkout (`npm ci` + `npm run build`) y publica `dist/` en el directorio que sirve nginx (por defecto `/var/www/html/aec_ivrs/frontend/dist`). No reinicia ningún servicio.

```bash
cd ~/aec_ivrs
bash deploy/deploy_frontend.sh --dry-run   # compila y muestra qué archivos cambiarían
bash deploy/deploy_frontend.sh             # -y para omitir la confirmación
```

- Respalda la versión publicada en `frontend_backups/` (conserva las últimas 5, configurable con `KEEP_BACKUPS`) e imprime el comando para regresar a ella.
- Avisa si el destino no coincide con ningún `root` de nginx; usa `DEST_DIR=<ruta>` para cambiarlo.
- Requiere Node.js 20.19+ o 22.12+ en el servidor (Vite 8). En producción no definas `VITE_API_URL`: el frontend llama a `/api` en el mismo dominio.
- Después de publicar, recarga con Ctrl+F5 para evitar el `index.html` en caché.

---

## Convenciones de commits

Se usa el formato `feat / fix / refactor / chore: descripción` con detalle de cambios por área (`backend`, `frontend`).
