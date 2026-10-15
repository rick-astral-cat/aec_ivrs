import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getAgencies = () => api.get('/agencies')
export const getAgency = (id) => api.get(`/agencies/${id}`)
export const createAgency = (data) => api.post('/agencies', data)
export const updateAgency = (id, data) => api.put(`/agencies/${id}`, data)
export const deleteAgency = (id) => api.delete(`/agencies/${id}`)
