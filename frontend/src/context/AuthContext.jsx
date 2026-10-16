import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getMe } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const handleLoginSuccess = useCallback((authData) => {
    localStorage.setItem('token', authData.access_token)
    const userData = {
      username: authData.username,
      is_mfa_enabled: authData.is_mfa_enabled,
    }
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(authData.access_token)
    setUser(userData)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe()
      setUser(res.data)
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch {
      logout()
    }
  }, [logout])

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => {
          setUser(res.data)
          localStorage.setItem('user', JSON.stringify(res.data))
        })
        .catch(() => {
          logout()
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [token, logout])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    handleLoginSuccess,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
