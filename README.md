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

### Frontend
| Librería | Versión | Uso |
|---|---|---|
| **React** | 19 | UI framework |
| **Vite** | 6 | Build tool |
| **MUI (Material UI)** | 7 | Componentes UI y sistema de diseño |
| **React Router DOM** | 7 | Navegación SPA |
| **@xyflow/react** | latest | Editor visual de nodos drag-and-drop para el IVR |
| **Mermaid.js** | latest | Generación y exportación de diagramas de flujo |
| **Axios** | latest | Cliente HTTP hacia el backend |

---

## Estructura del proyecto

```
aec_ivrs/
├── backend/
│   ├── main.py          # Rutas CRUD de agencias
│   ├── models.py        # Modelo Agency (SQLAlchemy)
│   ├── schemas.py       # Schemas Pydantic
│   ├── database.py      # Conexión SQLite
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/         # Clientes axios
        ├── components/  # Componentes reutilizables
        ├── pages/       # Vistas principales
        ├── theme.js     # Tema MUI (colores Dalton)
        └── main.jsx     # Entry point con ThemeProvider
```

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
.venv\Scripts\activate       # Windows
uvicorn main:app --reload    # http://localhost:8000

# Frontend
cd frontend
npm run dev                  # http://localhost:5173
```

---

## Convenciones de commits

Se usa el formato `feat / fix / refactor / chore: descripción` con detalle de cambios por área (`backend`, `frontend`).
