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

/** Turnos de grifero cerrados sin consolidar (filtro por fecha de liquidación). */
export const getGriferosCerradosParaConsolidar = async (params = {}) => {
  const path = `${API_TURNOS_LIQ}/grifero/cerrados-para-consolidar`
  console.info('[Consolidación liquidación][API] GET', path, { params })
  const response = await api.get(path, { params })
  const data = response.data
  const n = Array.isArray(data) ? data.length : null
  console.info('[Consolidación liquidación][API] GET cerrados-para-consolidar → OK', {
    filas: n,
    tipoDato: Array.isArray(data) ? 'array' : typeof data,
    muestraIds: Array.isArray(data) ? data.slice(0, 5).map((r) => r?.id) : null,
  })
  return data
}

export const listarConsolidacionesLiquidacion = async (limit = 100, estado = null) => {
  const params = { limit }
  if (estado) params.estado = estado
  const response = await api.get(`${API_TURNOS_LIQ}/consolidaciones`, { params })
  return response.data
}

export const obtenerConsolidacionLiquidacion = async (id) => {
  const response = await api.get(`${API_TURNOS_LIQ}/consolidaciones/${id}`)
  return response.data
}

export const obtenerConsolidacionVistaOperativa = async (id) => {
  const response = await api.get(`${API_TURNOS_LIQ}/consolidaciones/${id}/vista-operativa`)
  return response.data
}

export const listarTurnosLiquidacionReferenciaConsolidacion = async (consolidacionId) => {
  const response = await api.get(
    `${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/turnos-liquidacion-referencia`
  )
  return response.data
}

export const listarVentasServicentroDisponiblesConsolidacion = async (consolidacionId) => {
  const response = await api.get(
    `${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/ventas-servicentro/disponibles`
  )
  return response.data
}

export const listarCobranzasDisponiblesConsolidacion = async (consolidacionId) => {
  const response = await api.get(`${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/cobranzas/disponibles`)
  return response.data
}

export const vincularVentaServicentroConsolidacion = async (consolidacionId, rowId, body = {}) => {
  const response = await api.post(
    `${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/ventas-servicentro/${rowId}/vincular`,
    body
  )
  return response.data
}

export const vincularCobranzaConsolidacion = async (consolidacionId, rowId, body = {}) => {
  const response = await api.post(
    `${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/cobranzas/${rowId}/vincular`,
    body
  )
  return response.data
}

export const cerrarConsolidacionLiquidacion = async (id) => {
  const response = await api.patch(`${API_TURNOS_LIQ}/consolidaciones/${id}/cerrar`)
  return response.data
}

/** Solo consolidaciones pendientes; 204 sin cuerpo. */
export const eliminarConsolidacionLiquidacion = async (id) => {
  await api.delete(`${API_TURNOS_LIQ}/consolidaciones/${id}`)
}

export const crearConsolidacionVentaServicentro = async (consolidacionId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/ventas-servicentro`, data)
  return response.data
}

export const actualizarConsolidacionVentaServicentro = async (rowId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/consolidaciones/ventas-servicentro/${rowId}`, data)
  return response.data
}

export const eliminarConsolidacionVentaServicentro = async (rowId) => {
  await api.delete(`${API_TURNOS_LIQ}/consolidaciones/ventas-servicentro/${rowId}`)
}

export const crearConsolidacionCobranza = async (consolidacionId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/cobranzas`, data)
  return response.data
}

export const actualizarConsolidacionCobranza = async (rowId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/consolidaciones/cobranzas/${rowId}`, data)
  return response.data
}

export const eliminarConsolidacionCobranza = async (rowId) => {
  await api.delete(`${API_TURNOS_LIQ}/consolidaciones/cobranzas/${rowId}`)
}

export const listarVentasServicentroPendientes = async (params = {}) => {
  const response = await api.get(`${API_TURNOS_LIQ}/operaciones/ventas-servicentro/pendientes`, { params })
  return response.data
}

export const crearVentaServicentroPendiente = async (data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/operaciones/ventas-servicentro`, data)
  return response.data
}

export const actualizarVentaServicentroPendiente = async (rowId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/operaciones/ventas-servicentro/${rowId}`, data)
  return response.data
}

export const eliminarVentaServicentroPendiente = async (rowId) => {
  await api.delete(`${API_TURNOS_LIQ}/operaciones/ventas-servicentro/${rowId}`)
}

export const listarCobranzasPendientes = async (params = {}) => {
  const response = await api.get(`${API_TURNOS_LIQ}/operaciones/cobranzas/pendientes`, { params })
  return response.data
}

export const crearCobranzaPendiente = async (data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/operaciones/cobranzas`, data)
  return response.data
}

export const actualizarCobranzaPendiente = async (rowId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/operaciones/cobranzas/${rowId}`, data)
  return response.data
}

export const eliminarCobranzaPendiente = async (rowId) => {
  await api.delete(`${API_TURNOS_LIQ}/operaciones/cobranzas/${rowId}`)
}

export const crearConsolidacionLiquidacion = async (payload) => {
  const path = `${API_TURNOS_LIQ}/consolidaciones`
  console.info('[Consolidación liquidación][API] POST', path, {
    payload,
    nota: 'Este POST crea el registro de consolidación con los turno_cabecera_grifero_ids enviados.',
  })
  try {
    const response = await api.post(path, payload)
    console.info('[Consolidación liquidación][API] POST consolidaciones → OK', {
      id: response.data?.id,
      codigo: response.data?.codigo,
      cantidad_turnos: response.data?.cantidad_turnos,
      estado: response.data?.estado,
    })
    return response.data
  } catch (e) {
    console.error('[Consolidación liquidación][API] POST consolidaciones → ERROR', {
      status: e.response?.status,
      detail: e.response?.data?.detail ?? e.response?.data,
      message: e.message,
    })
    throw e
  }
}

/** Descarga PDF de liquidación del turno grifero (rubros / sumarización). */
export const downloadTurnoGriferoReportePdf = async (cabeceraId) => {
  const response = await api.get(`${API_TURNOS_LIQ}/grifero/${cabeceraId}/reporte.pdf`, {
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `turno-grifero-${cabeceraId}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

/** Descarga PDF de consolidación (totales por rubros + detalle por turno). */
export const downloadConsolidacionReportePdf = async (consolidacionId, codigo) => {
  const response = await api.get(`${API_TURNOS_LIQ}/consolidaciones/${consolidacionId}/reporte.pdf`, {
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safe = String(codigo || consolidacionId).replace(/[^\w.-]+/g, '_')
  a.download = `consolidacion-${safe}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

/** Contómetros de las islas del turno_config de la liquidación (no el catálogo completo). */
export const getContometrosParaTurnoGrifero = async (cabeceraGriferoId) => {
  const response = await api.get(
    `${API_TURNOS_LIQ}/grifero/${cabeceraGriferoId}/contometros-disponibles`
  )
  return response.data
}

export const eliminarTurnoGriferoAbierto = async (turnoId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/${turnoId}`)
}

/** Turno cerrado: body { confirmacion: 'CONFIRMAR' }; requiere permiso turno.cerrar */
export const eliminarTurnoGriferoCerrado = async (turnoId, confirmacion) => {
  await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/eliminar-cerrado`, {
    confirmacion,
  })
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

export const agregarVentaGnv = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/ventas-gnv`, data)
  return response.data
}

export const actualizarVentaGnv = async (rowId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/ventas-gnv/${rowId}`, data)
  return response.data
}

export const eliminarVentaGnv = async (rowId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/ventas-gnv/${rowId}`)
}

export const agregarFinanciacionGnv = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/financiaciones-gnv`, data)
  return response.data
}

export const actualizarFinanciacionGnv = async (rowId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/financiaciones-gnv/${rowId}`, data)
  return response.data
}

export const eliminarFinanciacionGnv = async (rowId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/financiaciones-gnv/${rowId}`)
}

export const agregarVentaGuiaCreditoTurno = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/ventas-guia-credito`, data)
  return response.data
}

export const agregarVentaGuiaRemisionTurno = async (turnoId, data) => {
  const response = await api.post(`${API_TURNOS_LIQ}/grifero/${turnoId}/ventas-guia-remision`, data)
  return response.data
}

export const marcarGuiaCreditoPagadoTurno = async (lineaId) => {
  const response = await api.patch(`${API_TURNOS_LIQ}/ventas-guia-credito/${lineaId}/pagar`)
  return response.data
}

export const marcarGuiaRemisionPagadoTurno = async (lineaId) => {
  const response = await api.patch(`${API_TURNOS_LIQ}/ventas-guia-remision/${lineaId}/pagar`)
  return response.data
}

export const actualizarVentaGuiaCreditoTurno = async (lineaId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/ventas-guia-credito/${lineaId}`, data)
  return response.data
}

export const eliminarVentaGuiaCreditoTurno = async (lineaId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/ventas-guia-credito/${lineaId}`)
}

export const actualizarVentaGuiaRemisionTurno = async (lineaId, data) => {
  const response = await api.put(`${API_TURNOS_LIQ}/grifero/ventas-guia-remision/${lineaId}`, data)
  return response.data
}

export const eliminarVentaGuiaRemisionTurno = async (lineaId) => {
  await api.delete(`${API_TURNOS_LIQ}/grifero/ventas-guia-remision/${lineaId}`)
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
// CONCILIACIÓN STOCK COMBUSTIBLE (consolidación de liquidación cerrada)
// ============================================================================

const API_CONCILIACION_STOCK = '/api/conciliacion-stock-combustible'

/** @param {{ limit?: number, fecha_desde?: string, fecha_hasta?: string }} [params] */
export const listarConsolidacionesPendientesConciliacionStock = async (params = {}) => {
  const response = await api.get(`${API_CONCILIACION_STOCK}/consolidaciones-pendientes`, { params })
  return response.data
}

export const crearOAbrirConciliacionStockPorConsolidacion = async (consolidacionId) => {
  const response = await api.post(`${API_CONCILIACION_STOCK}/consolidaciones/${consolidacionId}`)
  return response.data
}

export const obtenerConciliacionStock = async (conciliacionId) => {
  const response = await api.get(`${API_CONCILIACION_STOCK}/${conciliacionId}`)
  return response.data
}

export const obtenerConciliacionStockPorConsolidacion = async (consolidacionId) => {
  const response = await api.get(`${API_CONCILIACION_STOCK}/por-consolidacion/${consolidacionId}`)
  return response.data
}

/** @param {number} conciliacionId @param {{ lineas: Array<Record<string, unknown>>, observaciones?: string|null, fecha_corte_medicion?: string|null }} body */
export const actualizarLineasConciliacionStock = async (conciliacionId, body) => {
  const response = await api.patch(`${API_CONCILIACION_STOCK}/${conciliacionId}/lineas`, body)
  return response.data
}

/** @param {number} conciliacionId @param {{ observaciones_cierre?: string|null }} [body] */
export const cerrarConciliacionStock = async (conciliacionId, body = {}) => {
  const response = await api.post(`${API_CONCILIACION_STOCK}/${conciliacionId}/cerrar`, body)
  return response.data
}

/** @param {{ limit?: number }} [params] */
export const listarHistorialConciliacionesStockCerradas = async (params = {}) => {
  const response = await api.get(`${API_CONCILIACION_STOCK}/historial/cerradas`, { params })
  return response.data
}

/** @param {{ limit?: number }} [params] */
export const listarComprasCombustibleDisponiblesConciliacion = async (params = {}) => {
  const response = await api.get(`${API_CONCILIACION_STOCK}/compras-combustible/disponibles`, { params })
  return response.data
}

/** @param {number} compraFacturaId @param {{ estado_combustible_logistica: string }} body */
export const patchEstadoLogisticaCompraCombustible = async (compraFacturaId, body) => {
  const response = await api.patch(
    `${API_CONCILIACION_STOCK}/compras-combustible/${compraFacturaId}/estado-logistica`,
    body
  )
  return response.data
}

/** @param {number} conciliacionId @param {{ compra_factura_ids: number[] }} body */
export const vincularComprasConciliacionStock = async (conciliacionId, body) => {
  const response = await api.post(`${API_CONCILIACION_STOCK}/${conciliacionId}/compras/vincular`, body)
  return response.data
}

/** @param {number} conciliacionId @param {{ compra_factura_ids: number[] }} body */
export const desvincularComprasConciliacionStock = async (conciliacionId, body) => {
  const response = await api.post(`${API_CONCILIACION_STOCK}/${conciliacionId}/compras/desvincular`, body)
  return response.data
}

/** PDF vertical (A4): grilla de conciliación cerrada y datos de la consolidación de liquidación. */
export const downloadConciliacionStockCombustiblePdf = async (conciliacionId) => {
  const response = await api.get(`${API_CONCILIACION_STOCK}/${conciliacionId}/reporte.pdf`, {
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conciliacion-stock-combustible-${conciliacionId}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
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

export const getProductosAdmin = async (activo = null, categoria_id = null) => {
  const params = {}
  if (activo !== null && activo !== undefined) params.activo = activo
  if (categoria_id !== null && categoria_id !== undefined) params.categoria_id = categoria_id
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
// LOGÍSTICA / STOCK
// ============================================================================

const API_LOGISTICA = '/api/logistica'

export const getUnidadesMedida = async (activo = null) => {
  const params = activo !== null && activo !== undefined ? { activo } : {}
  const response = await api.get(`${API_LOGISTICA}/unidades-medida`, { params })
  return response.data
}

export const crearUnidadMedida = async (data) => {
  const response = await api.post(`${API_LOGISTICA}/unidades-medida`, data)
  return response.data
}

export const actualizarUnidadMedida = async (id, data) => {
  const response = await api.put(`${API_LOGISTICA}/unidades-medida/${id}`, data)
  return response.data
}

export const getProveedores = async (activo = null) => {
  const params = activo !== null && activo !== undefined ? { activo } : {}
  const response = await api.get(`${API_LOGISTICA}/proveedores`, { params })
  return response.data
}

export const getBancos = async (activo = true) => {
  const params = activo !== null && activo !== undefined ? { activo } : {}
  const response = await api.get(`${API_LOGISTICA}/bancos`, { params })
  return response.data
}

export const crearProveedor = async (data) => {
  const response = await api.post(`${API_LOGISTICA}/proveedores`, data)
  return response.data
}

export const actualizarProveedor = async (id, data) => {
  const response = await api.put(`${API_LOGISTICA}/proveedores/${id}`, data)
  return response.data
}

export const getComprasFactura = async (params = {}) => {
  const response = await api.get(`${API_LOGISTICA}/compras-factura`, { params })
  return response.data
}

export const getCompraFactura = async (id) => {
  const response = await api.get(`${API_LOGISTICA}/compras-factura/${id}`)
  return response.data
}

export const crearCompraFactura = async (data) => {
  const response = await api.post(`${API_LOGISTICA}/compras-factura`, data)
  return response.data
}

export const getMovimientosStock = async (params = {}) => {
  const response = await api.get(`${API_LOGISTICA}/movimientos-stock`, { params })
  return response.data
}

export const getKardexCombustible = async ({ producto_id, desde, hasta }) => {
  const response = await api.get(`${API_LOGISTICA}/kardex-combustible`, {
    params: { producto_id, desde, hasta },
  })
  return response.data
}

export const getProductosCombustibleKardex = async () => {
  const response = await api.get(`${API_LOGISTICA}/productos-combustible-kardex`)
  return response.data
}

export const crearAjusteStock = async (data) => {
  const response = await api.post(`${API_LOGISTICA}/ajuste-stock`, data)
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
