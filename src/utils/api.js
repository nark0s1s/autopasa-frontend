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
// TURNOS
// ============================================================================

export const getTurnoDiaActual = async () => {
  const response = await api.get('/api/turnos/dia/actual')
  return response.data
}

export const crearTurnoDia = async (data) => {
  const response = await api.post('/api/turnos/dia', data)
  return response.data
}

export const cerrarTurnoDia = async (turnoDiaId, data) => {
  const response = await api.post(`/api/turnos/dia/${turnoDiaId}/cerrar`, data)
  return response.data
}

export const getTurnoGriferoActual = async () => {
  const response = await api.get('/api/turnos/grifero/actual')
  return response.data
}

export const crearTurnoGrifero = async (data) => {
  const response = await api.post('/api/turnos/grifero', data)
  return response.data
}

export const getTurnosGrifero = async (params = {}) => {
  const response = await api.get('/api/turnos/grifero', { params })
  return response.data
}

export const listarTurnosGrifero = async (params = {}) => {
  const response = await api.get('/api/turnos/grifero', { params })
  return response.data
}

export const getTurnoById = async (turnoId) => {
  const response = await api.get(`/api/turnos/grifero/${turnoId}`)
  return response.data
}

// ============================================================================
// CONTÓMETROS Y PRODUCTOS
// ============================================================================

export const getContometrosActivos = async () => {
  const response = await api.get('/api/turnos/contometros')
  return response.data
}

export const getProductosActivos = async () => {
  const response = await api.get('/api/turnos/productos')
  return response.data
}

// ============================================================================
// LECTURAS DE CONTÓMETRO
// ============================================================================

export const agregarLecturaContometro = async (turnoId, data) => {
  const response = await api.post(`/api/turnos/grifero/${turnoId}/lecturas`, data)
  return response.data
}

export const actualizarLecturaFinal = async (lecturaId, data) => {
  const response = await api.put(`/api/turnos/grifero/lecturas/${lecturaId}`, data)
  return response.data
}

// ============================================================================
// VENTAS
// ============================================================================

export const agregarVentaProducto = async (turnoId, data) => {
  const response = await api.post(`/api/turnos/grifero/${turnoId}/ventas-producto`, data)
  return response.data
}

export const agregarVentaPOS = async (turnoId, data) => {
  const response = await api.post(`/api/turnos/grifero/${turnoId}/ventas-pos`, data)
  return response.data
}

export const agregarVale = async (turnoId, data) => {
  const response = await api.post(`/api/turnos/grifero/${turnoId}/vales`, data)
  return response.data
}

export const agregarDeposito = async (turnoId, data) => {
  const response = await api.post(`/api/turnos/grifero/${turnoId}/depositos`, data)
  return response.data
}

// ============================================================================
// CIERRE
// ============================================================================

export const cerrarTurnoGrifero = async (turnoId, data) => {
  const response = await api.post(`/api/turnos/grifero/${turnoId}/cerrar`, data)
  return response.data
}

// ============================================================================
// CATÁLOGOS
// ============================================================================

export const getEmpleados = async (activo = true) => {
  const response = await api.get('/api/catalogos/empleados', { params: { activo } })
  return response.data
}

export const getContometros = async (activo = true) => {
  const response = await api.get('/api/catalogos/contometros', { params: { activo } })
  return response.data
}

export const getIslas = async (activo = true) => {
  const response = await api.get('/api/catalogos/islas', { params: { activo } })
  return response.data
}

export const getProductos = async (activo = true) => {
  const response = await api.get('/api/catalogos/productos', { params: { activo } })
  return response.data
}

export const getTerminales = async (activo = true) => {
  const response = await api.get('/api/catalogos/terminales', { params: { activo } })
  return response.data
}

export const getClientes = async (activo = true) => {
  const response = await api.get('/api/catalogos/clientes', { params: { activo } })
  return response.data
}

export const getClienteByDocumento = async (numeroDocumento) => {
  const response = await api.get('/api/catalogos/clientes/num-documento', { params: { numero_documento: numeroDocumento } })
  return response.data
}

export const getTiposVale = async (activo = true) => {
  const response = await api.get('/api/catalogos/tipos-vale', { params: { activo } })
  return response.data
}

// ============================================================================
// CUADRE DIARIO
// ============================================================================

export const guardarCuadreCompleto = async (data) => {
  const response = await api.post('/api/cuadre/cuadre-completo', data)
  return response.data
}

export const obtenerCuadreHoy = async (fecha) => {
  if (!fecha) throw new Error("Fecha es requerida")
  const params = { fecha }
  const response = await api.get('/api/cuadre', { params })
  return response.data
}

// ============================================================================
// EMPLEADOS (Admin only)
// ============================================================================

export const getEmpleadosF = async (activo = null) => {
  const params = activo !== null ? { activo } : {}
  const response = await api.get('/api/empleados/', { params })
  return response.data
}

export const crearEmpleado = async (data) => {
  const response = await api.post('/api/empleados/', data)
  return response.data
}

export const actualizarEmpleado = async (id, data) => {
  const response = await api.put(`/api/empleados/${id}`, data)
  return response.data
}

export const desactivarEmpleado = async (id) => {
  const response = await api.delete(`/api/empleados/${id}`)
  return response.data
}

// ============================================================================
// ROLES
// ============================================================================

export const getRoles = async () => {
  const response = await api.get('/api/roles/')
  return response.data
}

// ============================================================================
// PRODUCTOS (Admin)
// ============================================================================

export const getProductosAdmin = async (activo = null) => {
  const params = activo !== null ? { activo } : {}
  const response = await api.get('/api/infraestructura/productos', { params })
  return response.data
}

export const crearProducto = async (data) => {
  const response = await api.post('/api/infraestructura/productos', data)
  return response.data
}

export const actualizarProducto = async (id, data) => {
  const response = await api.put(`/api/infraestructura/productos/${id}`, data)
  return response.data
}

export const getCategoriasProducto = async () => {
  const response = await api.get('/api/infraestructura/categorias-producto')
  return response.data
}

// ============================================================================
// CLIENTES
// ============================================================================

export const getClientesAdmin = async (activo = null) => {
  const params = activo !== null ? { activo } : {}
  const response = await api.get('/api/infraestructura/clientes', { params })
  return response.data
}

export const crearCliente = async (data) => {
  const response = await api.post('/api/infraestructura/clientes', data)
  return response.data
}

export const actualizarCliente = async (id, data) => {
  const response = await api.put(`/api/infraestructura/clientes/${id}`, data)
  return response.data
}

// ============================================================================
// CUADRE CONTABLE FINAL (Admin)
// ============================================================================

export const getCuadreConsolidado = async (fecha) => {
  const response = await api.get('/api/cuadre/consolidado', { params: { fecha } })
  return response.data
}

export default api
