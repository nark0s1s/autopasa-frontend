import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import LiquidacionGrifero from './pages/LiquidacionGrifero'
import DetalleTurno from './pages/DetalleTurno'
import ConsolidacionLiquidacionPage from './pages/ConsolidacionLiquidacionPage'
import ConsultarTurnos from './pages/ConsultarTurnos'
import CuadreDiario from './pages/CuadreDiario'
import ProximamentePage from './pages/ProximamentePage'
import Empleados from './pages/Empleados'
import Productos from './pages/Productos'
import Proveedores from './pages/Proveedores'
import ComprasFactura from './pages/ComprasFactura'
import Clientes from './pages/Clientes'
import CuadreContable from './pages/CuadreContable'
import GestionRoles from './pages/seguridad/GestionRoles'
import PermisosRoles from './pages/seguridad/PermisosRoles'
import MenusRoles from './pages/seguridad/MenusRoles'
import AsignarRolEmpleados from './pages/seguridad/AsignarRolEmpleados'
import IslasPage from './pages/mantenimiento/IslasPage'
import SurtidoresPage from './pages/mantenimiento/SurtidoresPage'
import ContometrosPage from './pages/mantenimiento/ContometrosPage'
import TurnosConfigPage from './pages/mantenimiento/TurnosConfigPage'
import TurnoConfigIslaPage from './pages/mantenimiento/TurnoConfigIslaPage'
import UnidadesMedidaPage from './pages/mantenimiento/UnidadesMedidaPage'
import OperacionesServicentroPage from './pages/OperacionesServicentroPage'
import OperacionesCobranzasPage from './pages/OperacionesCobranzasPage'
import KardexCombustiblePage from './pages/KardexCombustiblePage'

// Componente para rutas protegidas
function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/turno-consolidacion-liquidacion"
            element={
              <PrivateRoute>
                <Layout>
                  <ConsolidacionLiquidacionPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/turno-dia" element={<Navigate to="/turno-consolidacion-liquidacion" replace />} />
          <Route 
            path="/liquidacion" 
            element={
              <PrivateRoute>
                <Layout>
                  <LiquidacionGrifero />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/liquidacion/:id" 
            element={
              <PrivateRoute>
                <Layout>
                  <DetalleTurno />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/liquidacion-grifero" 
            element={<Navigate to="/liquidacion" />} 
          />
          <Route 
            path="/consultar-turnos" 
            element={
              <PrivateRoute>
                <Layout>
                  <ConsultarTurnos />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/cuadre-diario" 
            element={
              <PrivateRoute>
                <Layout>
                  <CuadreDiario />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route path="/empleados" element={<Navigate to="/seguridad/empleados" replace />} />
          <Route
            path="/seguridad/empleados"
            element={
              <PrivateRoute>
                <Layout>
                  <Empleados />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/seguridad/roles"
            element={
              <PrivateRoute>
                <Layout>
                  <GestionRoles />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/seguridad/permisos-roles"
            element={
              <PrivateRoute>
                <Layout>
                  <PermisosRoles />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/seguridad/menus-roles"
            element={
              <PrivateRoute>
                <Layout>
                  <MenusRoles />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/seguridad/empleados-roles"
            element={
              <PrivateRoute>
                <Layout>
                  <AsignarRolEmpleados />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/productos" 
            element={
              <PrivateRoute>
                <Layout>
                  <Productos />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route
            path="/mantenimiento/unidades-medida"
            element={
              <PrivateRoute>
                <Layout>
                  <UnidadesMedidaPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <PrivateRoute>
                <Layout>
                  <Proveedores />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/compras-factura"
            element={
              <PrivateRoute>
                <Layout>
                  <ComprasFactura />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/clientes" 
            element={
              <PrivateRoute>
                <Layout>
                  <Clientes />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/cuadre-contable" 
            element={
              <PrivateRoute>
                <Layout>
                  <CuadreContable />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/configuracion" 
            element={
              <PrivateRoute>
                <Layout>
                  <ProximamentePage titulo="Configuración del Sistema" />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route
            path="/mantenimiento/islas"
            element={
              <PrivateRoute>
                <Layout>
                  <IslasPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/mantenimiento/surtidores"
            element={
              <PrivateRoute>
                <Layout>
                  <SurtidoresPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/mantenimiento/contometros"
            element={
              <PrivateRoute>
                <Layout>
                  <ContometrosPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/mantenimiento/turnos-config"
            element={
              <PrivateRoute>
                <Layout>
                  <TurnosConfigPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/mantenimiento/turno-config-isla"
            element={
              <PrivateRoute>
                <Layout>
                  <TurnoConfigIslaPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/operaciones/ventas-servicentro"
            element={
              <PrivateRoute>
                <Layout>
                  <OperacionesServicentroPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/operaciones/cobranzas"
            element={
              <PrivateRoute>
                <Layout>
                  <OperacionesCobranzasPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/consultas/kardex-combustible"
            element={
              <PrivateRoute>
                <Layout>
                  <KardexCombustiblePage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/liquidacion" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
