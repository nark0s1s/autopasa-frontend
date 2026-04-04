import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Fuel, Gauge, FileText, Users, Settings, LogOut, Menu, X, Calendar, Calculator, Package, Building2, BookOpen
} from 'lucide-react'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    {
      title: 'Supervisión',
      items: [
        {
          name: 'Gestión Turno Día',
          path: '/turno-dia',
          icon: Calendar,
          description: 'Abrir y cerrar turno del día'
        }
      ]
    },
    {
      title: 'Operaciones',
      items: [
        {
          name: 'Liquidar Turno Grifero',
          path: '/liquidacion',
          icon: Gauge,
          description: 'Registrar ventas y liquidación'
        },
        {
          name: 'Consultar Turnos',
          path: '/consultar-turnos',
          icon: FileText,
          description: 'Ver y liquidar turnos'
        },
        {
          name: 'Cuadre Contable por Usuario',
          path: '/cuadre-diario',
          icon: Calculator,
          description: 'Cuadre contable por empleado'
        },
        {
          name: 'Cuadre Contable Final',
          path: '/cuadre-contable',
          icon: BookOpen,
          description: 'Consolidado diario del día',
          adminOnly: true
        }
      ]
    },
    {
      title: 'Administración',
      items: [
        {
          name: 'Empleados',
          path: '/empleados',
          icon: Users,
          description: 'Gestionar personal',
          adminOnly: true
        },
        {
          name: 'Productos',
          path: '/productos',
          icon: Package,
          description: 'Catálogo de productos',
          adminOnly: false
        },
        {
          name: 'Clientes',
          path: '/clientes',
          icon: Building2,
          description: 'Gestionar clientes',
          adminOnly: false
        },
        {
          name: 'Configuración',
          path: '/configuracion',
          icon: Settings,
          description: 'Ajustes del sistema'
        }
      ]
    }
  ]

  const isAdmin = user?.rol?.nombre === 'admin'

  return (
    <div className="h-screen overflow-hidden flex" style={{ backgroundColor: '#f5f3e0' }}>
      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } h-screen border-r border-gray-200 transition-all duration-300 flex flex-col`} style={{ backgroundColor: '#faf8e4' }}>
        {/* Header */}
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


        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((section, idx) => (
            <div key={idx} className="mb-6">
              {sidebarOpen && (
                <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1 px-2">
                {section.items.filter(item => !item.adminOnly || isAdmin).map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path === '/liquidacion' && location.pathname.startsWith('/liquidacion'))
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={!sidebarOpen ? item.name : ''}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 truncate">{item.description}</p>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: Usuario + Cerrar Sesión */}
        <div className="border-t border-gray-200">
          {/* Info del usuario */}
          {sidebarOpen ? (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">
                    {user?.nombres?.[0]}{user?.apellidos?.[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.nombres} {user?.apellidos}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.cargo}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary-600">
                  {user?.nombres?.[0]}{user?.apellidos?.[0]}
                </span>
              </div>
            </div>
          )}

          {/* Botón Cerrar Sesión */}
          <div className="px-3 pb-3 pt-1">
            <button
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
