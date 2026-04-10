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

  const cargarListaYCatalogos = useCallback(async () => {
    const turnosData = await getTurnosGrifero()
    setTurnos(turnosData)
    const [productosData, tiposValeData] = await Promise.all([
      getProductos(),
      getTiposVale(),
    ])
    setProductos(filterProductosNoCombustible(productosData))
    setTiposVale(tiposValeData)
  }, [])

  const recargarSoloTurnos = useCallback(async () => {
    const turnosData = await getTurnosGrifero()
    setTurnos(turnosData)
  }, [])

  return {
    turnos,
    setTurnos,
    productos,
    tiposVale,
    loading,
    setLoading,
    cargarListaYCatalogos,
    recargarSoloTurnos,
  }
}
