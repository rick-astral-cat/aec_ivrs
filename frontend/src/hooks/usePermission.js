import { useAuth } from '../context/AuthContext'

// Devuelve true si el usuario autenticado tiene el permiso indicado.
// Uso: const canDelete = usePermission(PERMISSIONS.AGENCIES_DELETE)
export function usePermission(permission) {
  return useAuth().hasPermission(permission)
}
