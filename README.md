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
│   ├── auth.py          # Hashing bcrypt, tokens JWT y lógica TOTP/QR
│   ├── database.py      # Conexión SQLite
│   ├── main.py          # Rutas de autenticación, MFA y CRUD de agencias
│   ├── manage_users.py  # CLI para crear usuarios y resetear MFA en AWS
│   ├── models.py        # Modelos User y Agency (SQLAlchemy)
│   ├── schemas.py       # Schemas Pydantic
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
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | *Clave por defecto interna* |
| `DEFAULT_ADMIN_USER` | Usuario admin inicial si la BD está vacía | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Contraseña admin inicial si la BD está vacía | `Dalton2026!` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos separados por coma | `http://localhost:5173,http://localhost:3000` |
| `VITE_API_URL` | (Frontend) URL del backend en producción | `http://localhost:8000` |

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
uvicorn main:app --reload    # http://localhost:8000

# Frontend
cd frontend
npm run dev                  # http://localhost:5173
```

---

## Convenciones de commits

Se usa el formato `feat / fix / refactor / chore: descripción` con detalle de cambios por área (`backend`, `frontend`).
