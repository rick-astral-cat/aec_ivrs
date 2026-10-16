import client from './client'

export const getAgencies = () => client.get('/agencies')
export const getAgency = (id) => client.get(`/agencies/${id}`)
export const createAgency = (data) => client.post('/agencies', data)
export const updateAgency = (id, data) => client.put(`/agencies/${id}`, data)
export const deleteAgency = (id) => client.delete(`/agencies/${id}`)
