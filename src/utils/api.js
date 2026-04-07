import axios from 'axios'

// Base del backend (VITE_API_URL en build). Las rutas /login, /dashboard, etc. del DOM son del SPA
// (mismo origen que el HTML); el login va con POST a `${API_URL}/api/auth/login`, no con GET al API en /login.
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

// Interceptor: 401 en rutas autenticadas → limpiar sesión y volver al login.
// No redirigir en 401 del POST /api/auth/login (credenciales malas): si no, la página recarga y parece que "no pasa nada".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const reqUrl = String(error.config?.url || '')
      const isLoginPost = reqUrl.includes('/api/auth/login')
      if (!isLoginPost) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// AUTH
// ============================================================================

/** URL absoluta del POST de login (mismo valor que verás en Red → XHR). */
export function getLoginPostUrl() {
  const base = String(API_URL).replace(/\/$/, '')
  return `${base}/api/auth/login`
}

/** POST OAuth2-style a /api/auth/login en el host VITE_API_URL (no GET al API en /login). */
export const login = async (usuario, password) => {
  const loginUrl = getLoginPostUrl()
  console.info('[Autopasa debug] Inicio login', {
    loginUrl,
    pageOrigin: typeof window !== 'undefined' ? window.location.origin : null,
    usuarioLength: usuario?.length ?? 0,
    note: 'La contraseña no se registra. GET /login en la barra es el SPA; el backend es el POST anterior.',
  })
  const body = new URLSearchParams()
  body.set('username', usuario)
  body.set('password', password)
  try {
    const response = await api.post('/api/auth/login', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    console.info('[Autopasa debug] Login POST OK', { status: response.status, hasToken: !!response.data?.access_token })
    return response.data
  } catch (e) {
    const reqUrl = e.config ? `${e.config.baseURL || ''}${e.config.url || ''}` : loginUrl
    console.warn('[Autopasa debug] Login POST falló', {
      requestUrl: reqUrl,
      message: e.message,
      code: e.code,
      status: e.response?.status,
      statusText: e.response?.statusText,
      responseData: e.response?.data,
      corsOrNetwork: !e.response,
    })
    throw e
  }
}

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me')
  return response.data
}

// ============================================================================
// TURNOS (router FastAPI: prefix /api/turnos-liquidacion)
// ============================================================================

const API_TURNOS_LIQ = '/api/turnos-liquidacion'

/**
 * @param {number|undefined} turno_config_id - Filtra la liquidación por tipo de turno
 * @param {string|undefined} fecha - YYYY-MM-DD (opcional; por defecto el backend usa la fecha del servidor)
 */
export const getTurnoDiaActual = async (turno_config_id, fecha) => {
  const params = {}
  if (turno_config_id != null && turno_config_id !== '') {
    params.turno_config_id = Number(turno_config_id)
  }
  if (fecha != null && fecha !== '') {
    params.fecha = fecha
  }
  const response = await api.get(`${API_TURNOS_LIQ}/actual`, { params })
  return response.data
}

export const listarTurnosLiquidacion = async (params = {}) => {
  const response = await api.get(`${API_TURNOS_LIQ}/`, { params })
  return response.data
}

export const crearTurnoDia = async (data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/`, data)
  return response.data
}

export const cerrarTurnoDia = async (turnoDiaId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/${turnoDiaId}/cerrar`, data)
  return response.data
}

export const getTurnoGriferoActual = async () => {
  const response = await api.get(`${API_TURNOS_LIQ}/grifero/actual`)
  return response.data
}

export const crearTurnoGrifero = async (data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero`, data)
  return response.data
}

export const getTurnosGrifero = async (params = {}) => {
  const response = await api.get(`${API_TURNOS_LIQ}/grifero`, { params })
  return response.data
}

export const listarTurnosGrifero = async (params = {}) => {
  const response = await api.get(`${API_TURNOS_LIQ}/grifero`, { params })
  return response.data
}

export const getTurnoById = async (turnoId) => {
  const response = await api.get(`${API_TURNOS_LIQ}/grifero/${turnoId}`)
  return response.data
}

export const eliminarTurnoGriferoAbierto = async (turnoId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/${turnoId}`)
}

// ============================================================================
// CONTÓMETROS Y PRODUCTOS
// ============================================================================

export const getContometrosActivos = async () => {
  const response = await api.get('/api/catalogos/contometros', { params: { activo: true } })
  return response.data
}

export const getProductosActivos = async () => {
  const response = await api.get('/api/catalogos/productos', { params: { activo: true } })
  return response.data
}

// ============================================================================
// LECTURAS DE CONTÓMETRO
// ============================================================================

export const agregarLecturaContometro = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/lecturas`, data)
  return response.data
}

/** Lectura inicial sugerida (último cuadre cerrado) y precio del producto/combustible */
export const getPrefillLecturaContometro = async (cabeceraGriferoId, contometroId) => {
  const response = await api.get(
    `${API_TURNOS_LIQ}/grifero/${cabeceraGriferoId}/lecturas/prefill/${contometroId}`
  )
  return response.data
}

/** Body: { lectura_inicial?, lectura_final?, tiene_anomalia?, observaciones? } (al menos una lectura) */
export const actualizarLecturaContometro = async (lecturaId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/lecturas/${lecturaId}`, data)
  return response.data
}

/** Compat: segundo argumento puede ser número o { lectura_final } */
export const actualizarLecturaFinal = async (lecturaId, lecturaFinalOrObj) => {
  const payload =
    typeof lecturaFinalOrObj === 'object' && lecturaFinalOrObj !== null
      ? lecturaFinalOrObj
      : { lectura_final: lecturaFinalOrObj }
  return actualizarLecturaContometro(lecturaId, payload)
}

// ============================================================================
// VENTAS
// ============================================================================

export const agregarVentaProducto = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/ventas-producto`, data)
  return response.data
}

export const agregarVentaPOS = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/ventas-pos`, data)
  return response.data
}

export const actualizarVentaPOS = async (ventaId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/ventas-pos/${ventaId}`, data)
  return response.data
}

export const eliminarVentaPOS = async (ventaId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/ventas-pos/${ventaId}`)
}

export const agregarVale = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/vales`, data)
  return response.data
}

export const agregarDescuentoTurno = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/descuentos`, data)
  return response.data
}

export const agregarDeposito = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/depositos`, data)
  return response.data
}

export const actualizarDeposito = async (depositoId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/depositos/${depositoId}`, data)
  return response.data
}

export const eliminarDeposito = async (depositoId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/depositos/${depositoId}`)
}

// ============================================================================
// CIERRE
// ============================================================================

export const cerrarTurnoGrifero = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/cerrar`, data)
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
// INFRAESTRUCTURA — MANTENIMIENTO (islas, surtidores, contómetros, turnos-config)
// ============================================================================

const API_INFRA = '/api/infraestructura'

export const listarIslasInfra = async (params = {}) => {
  const response = await api.get(`${API_INFRA}/islas`, { params })
  return response.data
}

export const crearIslaInfra = async (data) => {
  const response = await api.post(`${API_INFRA}/islas`, data)
  return response.data
}

export const actualizarIslaInfra = async (id, data) => {
  const response = await api.put(`${API_INFRA}/islas/${id}`, data)
  return response.data
}

export const listarSurtidoresInfra = async (params = {}) => {
  const response = await api.get(`${API_INFRA}/surtidores`, { params })
  return response.data
}

export const crearSurtidorInfra = async (data) => {
  const response = await api.post(`${API_INFRA}/surtidores`, data)
  return response.data
}

export const actualizarSurtidorInfra = async (id, data) => {
  const response = await api.put(`${API_INFRA}/surtidores/${id}`, data)
  return response.data
}

export const listarContometrosInfra = async (params = {}) => {
  const response = await api.get(`${API_INFRA}/contometros`, { params })
  return response.data
}

export const crearContometroInfra = async (data) => {
  const response = await api.post(`${API_INFRA}/contometros`, data)
  return response.data
}

export const actualizarContometroInfra = async (id, data) => {
  const response = await api.put(`${API_INFRA}/contometros/${id}`, data)
  return response.data
}

export const listarTurnosConfigInfra = async (params = {}) => {
  const response = await api.get(`${API_INFRA}/turnos-config`, { params })
  return response.data
}

export const obtenerTurnoConfigInfra = async (id) => {
  const response = await api.get(`${API_INFRA}/turnos-config/${id}`)
  return response.data
}

export const crearTurnoConfigInfra = async (data) => {
  const response = await api.post(`${API_INFRA}/turnos-config`, data)
  return response.data
}

export const actualizarTurnoConfigInfra = async (id, data) => {
  const response = await api.put(`${API_INFRA}/turnos-config/${id}`, data)
  return response.data
}

/** Filas de la tabla puente turno_config_isla (opcional turno_config_id en params) */
export const listarVinculosTurnoConfigIsla = async (params = {}) => {
  const response = await api.get(`${API_INFRA}/turnos-config-isla/vinculos`, { params })
  return response.data
}

export const vincularIslaTurnoConfig = async (configId, islaId) => {
  const response = await api.post(`${API_INFRA}/turnos-config/${configId}/islas/${islaId}`)
  return response.data
}

export const desvincularIslaTurnoConfig = async (configId, islaId) => {
  await api.delete(`${API_INFRA}/turnos-config/${configId}/islas/${islaId}`)
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
// ROLES Y PERMISOS (admin)
// ============================================================================

export const getRoles = async (activo = null) => {
  const params = activo !== null ? { activo } : {}
  const response = await api.get('/api/roles/', { params })
  return response.data
}

export const crearRol = async (data) => {
  const response = await api.post('/api/roles/', data)
  return response.data
}

export const actualizarRol = async (id, data) => {
  const response = await api.put(`/api/roles/${id}`, data)
  return response.data
}

export const eliminarRol = async (id) => {
  const response = await api.delete(`/api/roles/${id}`)
  return response.data
}

export const getPermisos = async () => {
  const response = await api.get('/api/roles/permisos/')
  return response.data
}

export const getPermisosRol = async (rolId) => {
  const response = await api.get(`/api/roles/${rolId}/permisos`)
  return response.data
}

/** Cuerpo: array de IDs de permiso, p. ej. [1, 2, 3] */
export const sincronizarPermisosRol = async (rolId, permisoIds) => {
  const response = await api.put(`/api/roles/${rolId}/permisos`, permisoIds)
  return response.data
}

// ============================================================================
// SEGURIDAD — MENÚ POR ROL (API alineada con SGC)
// ============================================================================

export const getMenuOpciones = async (params = {}) => {
  const response = await api.get('/api/seguridad/menus/menu-opciones', { params })
  return response.data
}

export const getMenuOpcionesTree = async (params = {}) => {
  const response = await api.get('/api/seguridad/menus/menu-opciones/tree', { params })
  return response.data
}

export const getMenuOpcionesRol = async (rolId) => {
  const response = await api.get(`/api/seguridad/menus/roles/${rolId}/menu-opciones`)
  return response.data
}

export const asignarMenuOpcionesRol = async (rolId, menuOpcionIds) => {
  const response = await api.post(`/api/seguridad/menus/roles/${rolId}/menu-opciones`, {
    menu_opcion_ids: menuOpcionIds,
  })
  return response.data
}

export const getMenuUsuario = async (empleadoId) => {
  const response = await api.get(`/api/seguridad/menus/menu-opciones/usuario/${empleadoId}`)
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
