import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, getCurrentUser } from '../utils/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay un token guardado
    const token = localStorage.getItem('token')
    if (token) {
      getCurrentUser()
        .then(userData => {
          setUser(userData)
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (usuario, password) => {
    const data = await apiLogin(usuario, password)
    localStorage.setItem('token', data.access_token)
    console.info('[Autopasa debug] Token guardado; solicitando /api/auth/me')
    try {
      const userData = await getCurrentUser()
      console.info('[Autopasa debug] /api/auth/me OK', { usuario: userData?.usuario })
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return userData
    } catch (e) {
      console.warn('[Autopasa debug] /api/auth/me falló después del login', {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message,
        code: e.code,
      })
      throw e
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
