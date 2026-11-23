import client from './client'

// Proyectos de Migración TEAMS (ver backend/routers/projects.py).
// Las actualizaciones usan PATCH: solo se envían los campos que cambian.

// Proyectos
export const getProjects = () => client.get('/projects')
export const getProject = (id) => client.get(`/projects/${id}`)
export const createProject = (data) => client.post('/projects', data)
export const updateProject = (id, data) => client.patch(`/projects/${id}`, data)
export const deleteProject = (id) => client.delete(`/projects/${id}`)

// Integrantes (role: 'owner' | 'member')
export const addMember = (projectId, userId, role = 'member') =>
  client.post(`/projects/${projectId}/members`, { user_id: userId, role })
export const updateMemberRole = (projectId, memberId, role) =>
  client.patch(`/projects/${projectId}/members/${memberId}`, { role })
export const removeMember = (projectId, memberId) =>
  client.delete(`/projects/${projectId}/members/${memberId}`)

// Actividades
export const createActivity = (projectId, data) =>
  client.post(`/projects/${projectId}/activities`, data)
export const updateActivity = (projectId, activityId, data) =>
  client.patch(`/projects/${projectId}/activities/${activityId}`, data)
export const setActivityCompleted = (projectId, activityId, isCompleted) =>
  updateActivity(projectId, activityId, { is_completed: isCompleted })
export const deleteActivity = (projectId, activityId) =>
  client.delete(`/projects/${projectId}/activities/${activityId}`)
