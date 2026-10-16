import client from './client'

export const login = (username, password) =>
  client.post('/auth/login', { username, password })

export const verifyMfaSetup = (setupToken, code) =>
  client.post('/auth/mfa/setup-verify', { setup_token: setupToken, code })

export const verifyMfaLogin = (challengeToken, code) =>
  client.post('/auth/mfa/login-verify', { challenge_token: challengeToken, code })

export const getMe = () =>
  client.get('/auth/me')

export const reconfigureMfaInit = () =>
  client.post('/auth/mfa/reconfigure-init')
