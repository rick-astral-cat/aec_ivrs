import client from './client'

// Directorio de usuarios activos (id, username, full_name) para elegir
// integrantes y encargados. No expone roles ni datos sensibles.
export const getUsers = () => client.get('/users')

// Nombre para mostrar de un usuario: nombre completo o, si no tiene, su username.
export const displayName = (user) => user?.full_name || user?.username || ''
