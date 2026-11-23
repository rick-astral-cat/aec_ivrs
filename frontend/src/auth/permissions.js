// Permisos que el backend puede otorgar (ver backend/permissions.py).
// El backend devuelve en /api/auth/me la lista de permisos del usuario según su rol.
// El frontend solo los usa para ocultar acciones: el backend autoriza cada petición.
export const PERMISSIONS = Object.freeze({
  AGENCIES_READ: 'agencies:read',
  AGENCIES_CREATE: 'agencies:create',
  AGENCIES_UPDATE: 'agencies:update',
  AGENCIES_DELETE: 'agencies:delete',

  PROJECTS_CREATE: 'projects:create',
  PROJECTS_VIEW_ALL: 'projects:view_all',
  PROJECTS_MANAGE_ALL: 'projects:manage_all',

  USERS_MANAGE: 'users:manage',
})

// Etiquetas en español para mostrar el rol global del usuario.
export const ROLE_LABELS = Object.freeze({
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Lector',
})
