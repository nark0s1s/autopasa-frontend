import { useState, useEffect, useCallback } from 'react'
import { List, ChevronRight, ChevronDown, Check, X, ChevronsDown, ChevronsUp } from 'lucide-react'
import { getRoles, getMenuOpcionesTree, getMenuOpcionesRol, asignarMenuOpcionesRol } from '../../utils/api'

function collectIds(items) {
  if (!items?.length) return []
  let ids = []
  items.forEach((item) => {
    ids.push(item.id)
    if (item.hijos?.length) ids = ids.concat(collectIds(item.hijos))
  })
  return ids
}

/** IDs de nodos que tienen hijos (para expandir y ver todo el subárbol como en SGC). */
function collectIdsConHijos(items) {
  const s = new Set()
  function walk(nodes) {
    if (!nodes?.length) return
    for (const n of nodes) {
      if (n.hijos?.length) {
        s.add(n.id)
        walk(n.hijos)
      }
    }
  }
  walk(items)
  return s
}

function Notificacion({ notificacion, onClose }) {
  if (!notificacion) return null
  const esError = notificacion.tipo === 'error'
  return (
    <div
      className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${
        esError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
      }`}
    >
      <span>{esError ? '❌' : '✅'}</span>
      <div className="flex-1 text-sm">{notificacion.mensaje}</div>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}

function MenuTree({ items, nivel, seleccionados, expandido, onToggleSel, onToggleExpand }) {
  if (!items?.length) return null
  const sorted = [...items].sort((a, b) => {
    const oa = a.orden ?? 9999
    const ob = b.orden ?? 9999
    if (oa !== ob) return oa - ob
    return (a.label || '').localeCompare(b.label || '', 'es')
  })

  return (
    <ul className={nivel === 0 ? 'space-y-0.5' : 'mt-1 space-y-0.5 border-l-2 border-gray-200 pl-3 ml-1'}>
      {sorted.map((item) => {
        const hijos = item.hijos || []
        const hasChildren = hijos.length > 0
        const isOpen = expandido.has(item.id)
        const checked = seleccionados.includes(item.id)

        return (
          <li key={item.id} className="list-none">
            <div
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg min-h-[2.25rem] ${
                checked ? 'bg-primary-50 ring-1 ring-primary-100' : 'hover:bg-gray-50'
              }`}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(item.id)}
                  className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded shrink-0"
                  aria-expanded={isOpen}
                  title={isOpen ? 'Contraer' : 'Expandir'}
                >
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              ) : (
                <span className="w-[26px] shrink-0 inline-block" />
              )}
              <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleSel(item.id)}
                  className="rounded border-gray-300 shrink-0"
                />
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{item.tipo}</span>
                {item.path ? (
                  <span className="text-xs font-mono text-primary-600 truncate max-w-[min(200px,28vw)]">
                    {item.path}
                  </span>
                ) : null}
              </label>
            </div>
            {hasChildren && isOpen && (
              <MenuTree
                items={hijos}
                nivel={nivel + 1}
                seleccionados={seleccionados}
                expandido={expandido}
                onToggleSel={onToggleSel}
                onToggleExpand={onToggleExpand}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function MenusRoles() {
  const [roles, setRoles] = useState([])
  const [arbol, setArbol] = useState([])
  const [rolId, setRolId] = useState('')
  const [seleccionados, setSeleccionados] = useState([])
  const [expandido, setExpandido] = useState(() => new Set())
  const [cargando, setCargando] = useState(true)
  const [syncSeleccionRol, setSyncSeleccionRol] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  const expandirTodo = useCallback(() => {
    setExpandido(collectIdsConHijos(arbol))
  }, [arbol])

  const contraerTodo = useCallback(() => {
    setExpandido(new Set())
  }, [])

  const cargarMenus = useCallback(async () => {
    const data = await getMenuOpcionesTree()
    const tree = Array.isArray(data) ? data : []
    setArbol(tree)
    setExpandido(collectIdsConHijos(tree))
  }, [])

  useEffect(() => {
    ;(async () => {
      setCargando(true)
      try {
        const r = await getRoles()
        setRoles(Array.isArray(r) ? r : [])
        await cargarMenus()
      } catch {
        setNotificacion({ tipo: 'error', mensaje: 'Error al cargar datos' })
      } finally {
        setCargando(false)
      }
    })()
  }, [cargarMenus])

  useEffect(() => {
    if (!rolId) {
      setSeleccionados([])
      return
    }
    let cancel = false
    ;(async () => {
      setSyncSeleccionRol(true)
      try {
        const data = await getMenuOpcionesRol(Number(rolId))
        const tree = Array.isArray(data) ? data : []
        if (!cancel) setSeleccionados(collectIds(tree))
      } catch {
        if (!cancel) setNotificacion({ tipo: 'error', mensaje: 'Error al cargar menú del rol' })
      } finally {
        if (!cancel) setSyncSeleccionRol(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [rolId])

  const onToggleSel = (id) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const onToggleExpand = (id) => {
    setExpandido((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const guardar = async () => {
    if (!rolId) {
      setNotificacion({ tipo: 'error', mensaje: 'Seleccione un rol' })
      return
    }
    setGuardando(true)
    try {
      await asignarMenuOpcionesRol(Number(rolId), seleccionados)
      setNotificacion({ tipo: 'ok', mensaje: 'Menú asignado al rol correctamente' })
    } catch (err) {
      const d = err.response?.data?.detail
      setNotificacion({ tipo: 'error', mensaje: typeof d === 'string' ? d : 'Error al guardar' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <List className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opciones de menú a roles</h1>
            <p className="text-sm text-gray-600">
              Árbol completo de categorías, submenús e ítems (mismo criterio que SGC). Al cargar, todo está expandido;
              puede contraer o volver a expandir.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
          <select
            value={rolId}
            onChange={(e) => setRolId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">— Seleccione —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={guardar}
            disabled={!rolId || guardando}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
          >
            <Check size={16} />
            {guardando ? 'Guardando…' : 'Guardar asignaciones'}
          </button>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm min-h-[360px] relative">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-gray-900">Árbol de menú y submenús</h2>
            {arbol.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={expandirTodo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                >
                  <ChevronsDown size={14} />
                  Expandir todo
                </button>
                <button
                  type="button"
                  onClick={contraerTodo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                >
                  <ChevronsUp size={14} />
                  Contraer todo
                </button>
              </div>
            )}
          </div>

          {cargando ? (
            <p className="text-gray-500 text-sm py-8 text-center">Cargando árbol de menú…</p>
          ) : arbol.length === 0 ? (
            <p className="text-amber-700 text-sm">
              No hay filas en <code className="bg-amber-50 px-1 rounded">menu_opciones</code>. Ejecute la migración SQL y{' '}
              <code className="bg-amber-50 px-1 rounded">seed_menu_seguridad_autopasa.sql</code>, o cree ítems desde la API.
            </p>
          ) : (
            <div
              className={`relative max-h-[min(70vh,640px)] overflow-y-auto border border-gray-100 rounded-xl p-3 ${
                syncSeleccionRol ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {syncSeleccionRol && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 z-10 rounded-xl">
                  <span className="text-sm text-gray-600 font-medium">Actualizando selección del rol…</span>
                </div>
              )}
              <MenuTree
                items={arbol}
                nivel={0}
                seleccionados={seleccionados}
                expandido={expandido}
                onToggleSel={onToggleSel}
                onToggleExpand={onToggleExpand}
              />
            </div>
          )}
          {seleccionados.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">{seleccionados.length} opción(es) marcada(s) para este rol</p>
          )}
        </div>
      </div>
    </div>
  )
}
