import axios from 'axios'

// Las rutas del backend viven bajo /api (ver backend/main.py y la config de nginx).
// En desarrollo apunta a http://localhost:8000/api; en producción usa /api relativo
// (mismo origen que sirve nginx), permitiendo que el SPA conserve rutas como
// /agencies/:id sin colisionar con los endpoints del API.
const RAW_BASE = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:8000' : '')

// Garantizar el sufijo /api sin duplicarlo si ya viene en VITE_API_URL
const API_BASE_URL = RAW_BASE.replace(/\/+$/, '') + '/api'

const client = axios.create({
  baseURL: API_BASE_URL,
})

// Interceptor para agregar token JWT en las peticiones
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar 401 (sesión expirada o token inválido)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
