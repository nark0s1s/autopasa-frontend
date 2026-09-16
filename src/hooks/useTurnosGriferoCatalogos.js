import { useState, useCallback } from 'react'
import { getTurnosGrifero, getProductos, getTiposVale } from '../utils/api'

function filterProductosNoCombustible(productosData) {
  return (productosData || []).filter(
    (p) =>
      Number(p.categoria_id) !== 1 &&
      String(p.categoria || '').toLowerCase() !== 'combustible'
  )
}

/**
 * Lista de turnos grifero + catálogos para tabs (productos filtrados, tipos de vale).
 */
export function useTurnosGriferoCatalogos() {
  const [turnos, setTurnos] = useState([])
  const [productos, setProductos] = useState([])
  const [tiposVale, setTiposVale] = useState([])
  const [loading, setLoading] = useState(false)
  const [catalogosCargados, setCatalogosCargados] = useState(false)

  const aplicarCatalogos = useCallback((productosData, tiposValeData) => {
    setProductos(filterProductosNoCombustible(productosData))
    setTiposVale(tiposValeData)
    setCatalogosCargados(true)
  }, [])

  /** Solo productos + tipos de vale (para detalle deep-link sin esperar la lista). */
  const cargarCatalogos = useCallback(async () => {
    const [productosData, tiposValeData] = await Promise.all([
      getProductos(),
      getTiposVale(),
    ])
    aplicarCatalogos(productosData, tiposValeData)
  }, [aplicarCatalogos])

  /** Lista reciente + catálogos en paralelo (limit evita historial ilimitado). */
  const cargarListaYCatalogos = useCallback(async () => {
    const [turnosData, productosData, tiposValeData] = await Promise.all([
      getTurnosGrifero({ limit: 100 }),
      getProductos(),
      getTiposVale(),
    ])
    setTurnos(turnosData)
    aplicarCatalogos(productosData, tiposValeData)
  }, [aplicarCatalogos])

  const recargarSoloTurnos = useCallback(async () => {
    const turnosData = await getTurnosGrifero({ limit: 100 })
    setTurnos(turnosData)
  }, [])

  return {
    turnos,
    setTurnos,
    productos,
    tiposVale,
    loading,
    setLoading,
    catalogosCargados,
    cargarCatalogos,
    cargarListaYCatalogos,
    recargarSoloTurnos,
  }
}
