import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// AUTH
// ============================================================================

export const login = async (usuario, password) => {
  const formData = new FormData()
  formData.append('username', usuario)
  formData.append('password', password)
  
  const response = await api.post('/api/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me')
  return response.data
}

// ============================================================================
// TURNOS LIQUIDACION
// ============================================================================

export const getTurnoDiaActual = async () => {
  const response = await api.get('/api/turnos-liquidacion/actual')
  return response.data
}

export const crearTurnoDia = async (data) => {
  const response = await api.post('/api/turnos-liquidacion', data)
  return response.data
}

export const cerrarTurnoDia = async (turnoLiquidacionId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/${turnoLiquidacionId}/cerrar`, data)
  return response.data
}

export const getTurnoGriferoActual = async () => {
  const response = await api.get('/api/turnos-liquidacion/grifero/actual')
  return response.data
}

export const crearTurnoGrifero = async (data) => {
  const response = await api.post('/api/turnos-liquidacion/grifero', data)
  return response.data
}

export const getTurnosGrifero = async (params = {}) => {
  const response = await api.get('/api/turnos-liquidacion/grifero', { params })
  return response.data
}

export const listarTurnosGrifero = async (params = {}) => {
  const response = await api.get('/api/turnos-liquidacion/grifero', { params })
  return response.data
}

export const getTurnoById = async (turnoId) => {
  const response = await api.get(`/api/turnos-liquidacion/grifero/${turnoId}`)
  return response.data
}

// ============================================================================
// CONTÓMETROS Y PRODUCTOS
// ============================================================================

export const getContometrosActivos = async () => {
  const response = await api.get('/api/infraestructura/contometros')
  return response.data
}

export const getProductosActivos = async () => {
  const response = await api.get('/api/infraestructura/productos')
  return response.data
}

// ============================================================================
// LECTURAS DE CONTÓMETRO
// ============================================================================

export const agregarLecturaContometro = async (turnoId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/grifero/${turnoId}/lecturas`, data)
  return response.data
}

export const actualizarLecturaFinal = async (lecturaId, data) => {
  const response = await api.put(`/api/turnos-liquidacion/grifero/lecturas/${lecturaId}`, data)
  return response.data
}

// ============================================================================
// VENTAS
// ============================================================================

export const agregarVentaProducto = async (turnoId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/grifero/${turnoId}/ventas-producto`, data)
  return response.data
}

export const agregarVentaPOS = async (turnoId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/grifero/${turnoId}/ventas-pos`, data)
  return response.data
}

export const agregarVale = async (turnoId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/grifero/${turnoId}/vales`, data)
  return response.data
}

export const agregarDeposito = async (turnoId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/grifero/${turnoId}/depositos`, data)
  return response.data
}

// ============================================================================
// CIERRE
// ============================================================================

export const cerrarTurnoGrifero = async (turnoId, data) => {
  const response = await api.post(`/api/turnos-liquidacion/grifero/${turnoId}/cerrar`, data)
  return response.data
}

export default api
