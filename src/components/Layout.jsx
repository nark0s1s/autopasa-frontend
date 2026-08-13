import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMenuUsuario } from '../utils/api'
import useMediaQuery from '../hooks/useMediaQuery'
import {
  Fuel,
  Gauge,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Calendar,
  Calculator,
  Package,
  Building2,
  BookOpen,
  Shield,
  UserCog,
  List,
  Users,
  Users2,
  LayoutGrid,
  Wrench,
  Store,
  Wallet,
  CreditCard,
} from 'lucide-react'

/** Iconos opcionales según `menu_opciones.icon` (coincidencia laxa con Lucide). */
const ICON_BY_KEY = {
  wallet: Wallet,
  calendar: Calendar,
  gauge: Gauge,
  'file-text': FileText,
  filetext: FileText,
  settings: Settings,
  calculator: Calculator,
  package: Package,
  building2: Building2,
  building: Building2,
  bookopen: BookOpen,
  shield: Shield,
  usercog: UserCog,
  list: List,
  users: Users,
  users2: Users2,
  layoutgrid: LayoutGrid,
  wrench: Wrench,
  fuel: Fuel,
  creditcard: CreditCard,
  'credit-card': CreditCard,
  store: Store,
}

function menuIconComponent(icon) {
  if (!icon || typeof icon !== 'string') return LayoutGrid
  const k = icon.trim().toLowerCase().replace(/_/g, '-')
  return ICON_BY_KEY[k] || LayoutGrid
}

function pathIsActive(pathname, path) {
  if (!path) return false
  if (path === '/liquidacion') {
    return pathname === '/liquidacion' || pathname.startsWith('/liquidacion/')
  }
  return pathname === path
}

function MenuBranch({ nodes, depth, sidebarOpen, location, navigate }) {
  if (!nodes?.length) return null
  return (
    <>
      {nodes.map((node) => {
        const kids = Array.isArray(node.hijos) ? node.hijos : []
        const path = node.path && String(node.path).trim() !== '' ? String(node.path).trim() : null
        const Icon = menuIconComponent(node.icon)

        if (kids.length > 0) {
          return (
            <div key={node.id} className={depth === 0 ? 'mb-6' : 'mb-3'}>
              {sidebarOpen && (
                <h3
                  className={`px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    depth > 0 ? 'pl-6' : ''
                  }`}
                >
                  {node.label}
                </h3>
              )}
              <div className="space-y-1 px-2">
                <MenuBranch
                  nodes={kids}
                  depth={depth + 1}
                  sidebarOpen={sidebarOpen}
                  location={location}
                  navigate={navigate}
                />
              </div>
            </div>
          )
        }

        if (path) {
          const isActive = pathIsActive(location.pathname, path)
          return (
            <Link
              key={node.id}
              to={path}
              onClick={(e) => {
                if (isActive && navigate) {
                  e.preventDefault()
                  navigate(path, { replace: true, state: { __menuReselect: Date.now() } })
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? node.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{node.label}</p>
                </div>
              )}
            </Link>
          )
        }

        return null
      })}
    </>
  )
}

function Layout({ children }) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.matchMedia('(max-width: 767px)').matches
  })
  const [menuTree, setMenuTree] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState(null)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const loadMenu = useCallback(async () => {
    if (!user?.id) {
      setMenuTree([])
      setMenuLoading(false)
      return
    }
    setMenuLoading(true)
    setMenuError(null)
    try {
      const tree = await getMenuUsuario(user.id)
      setMenuTree(Array.isArray(tree) ? tree : [])
    } catch (e) {
      console.error('Menú por rol:', e)
      setMenuError('No se pudo cargar el menú')
      setMenuTree([])
    } finally {
      setMenuLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen overflow-hidden flex" style={{ backgroundColor: '#f5f3e0' }}>
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } h-screen border-r border-gray-200 transition-all duration-300 flex flex-col`}
        style={{ backgroundColor: '#faf8e4' }}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Fuel className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Autopasa</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuLoading && sidebarOpen && (
            <p className="px-4 text-sm text-gray-500">Cargando menú…</p>
          )}
          {menuError && sidebarOpen && (
            <p className="px-4 text-sm text-red-600">{menuError}</p>
          )}
          {!menuLoading && !menuError && menuTree.length === 0 && sidebarOpen && (
            <p className="px-4 text-sm text-gray-500">No tiene opciones de menú asignadas.</p>
          )}
          {!menuLoading && (
            <MenuBranch
              nodes={menuTree}
              depth={0}
              sidebarOpen={sidebarOpen}
              location={location}
              navigate={navigate}
            />
          )}
          {!menuLoading && user && (
            <div className={sidebarOpen ? 'px-4 mt-2 mb-4' : 'px-2 mt-2 mb-2'}>
              {sidebarOpen && (
                <h3 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Operaciones</h3>
              )}
              <div className="space-y-1 px-2">
                <Link
                  to="/operaciones/ventas-servicentro"
                  onClick={(e) => {
                    const p = '/operaciones/ventas-servicentro'
                    if (location.pathname === p && navigate) {
                      e.preventDefault()
                      navigate(p, { replace: true, state: { __menuReselect: Date.now() } })
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/operaciones/ventas-servicentro'
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={!sidebarOpen ? 'Venta servicentro' : ''}
                >
                  <Store className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium truncate">Venta servicentro</span>}
                </Link>
                <Link
                  to="/operaciones/cobranzas"
                  onClick={(e) => {
                    const p = '/operaciones/cobranzas'
                    if (location.pathname === p && navigate) {
                      e.preventDefault()
                      navigate(p, { replace: true, state: { __menuReselect: Date.now() } })
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/operaciones/cobranzas'
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={!sidebarOpen ? 'Cobranzas' : ''}
                >
                  <Wallet className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium truncate">Cobranzas</span>}
                </Link>
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-gray-200">
          {sidebarOpen ? (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">
                    {user?.nombres?.[0]}
                    {user?.apellidos?.[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.nombres} {user?.apellidos}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.cargo}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary-600">
                  {user?.nombres?.[0]}
                  {user?.apellidos?.[0]}
                </span>
              </div>
            </div>
          )}

          <div className="px-3 pb-3 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
                !sidebarOpen && 'justify-center'
              }`}
              title={!sidebarOpen ? 'Cerrar Sesión' : ''}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

export default Layout
