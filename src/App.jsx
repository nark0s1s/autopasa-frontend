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
import CentrosCostoPage from './pages/mantenimiento/CentrosCostoPage'
import MediosPagoPage from './pages/mantenimiento/MediosPagoPage'
import OperacionesServicentroPage from './pages/OperacionesServicentroPage'
import OperacionesCobranzasPage from './pages/OperacionesCobranzasPage'
import CreditosConfigPage from './pages/creditos/CreditosConfigPage'
import OperacionesCreditosConsultaPage from './pages/OperacionesCreditosConsultaPage'
import KardexCombustiblePage from './pages/KardexCombustiblePage'
import ConciliacionStockCombustiblePage from './pages/ConciliacionStockCombustiblePage'
import GastosOperativosPage from './pages/GastosOperativosPage'
import TesoreriaCuentasCorrientesPage from './pages/TesoreriaCuentasCorrientesPage'

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
            path="/mantenimiento/centros-costo"
            element={
              <PrivateRoute>
                <Layout>
                  <CentrosCostoPage />
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
            path="/gastos-operativos"
            element={
              <PrivateRoute>
                <Layout>
                  <GastosOperativosPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/tesoreria/cuentas-corrientes" element={<Navigate to="/tesoreria/bancos" replace />} />
          <Route
            path="/tesoreria/cajas"
            element={
              <PrivateRoute>
                <Layout>
                  <ProximamentePage titulo="Tesorería — Cajas (efectivo físico)" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tesoreria/bancos"
            element={
              <PrivateRoute>
                <Layout>
                  <TesoreriaCuentasCorrientesPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tesoreria/conciliaciones"
            element={
              <PrivateRoute>
                <Layout>
                  <ProximamentePage titulo="Tesorería — Conciliaciones" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tesoreria/movimientos"
            element={
              <PrivateRoute>
                <Layout>
                  <ProximamentePage titulo="Tesorería — Movimientos (ingresos / egresos)" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tesoreria/cuentas-terceros"
            element={
              <PrivateRoute>
                <Layout>
                  <ProximamentePage titulo="Tesorería — Cuentas corrientes (clientes / proveedores)" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tesoreria/reportes"
            element={
              <PrivateRoute>
                <Layout>
                  <ProximamentePage titulo="Tesorería — Reportes (flujo de caja, saldos, conciliación)" />
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
            path="/mantenimiento/medios-pago"
            element={
              <PrivateRoute>
                <Layout>
                  <MediosPagoPage />
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
            path="/creditos/perfiles"
            element={
              <PrivateRoute>
                <Layout>
                  <CreditosConfigPage section="perfil" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/creditos/productos"
            element={
              <PrivateRoute>
                <Layout>
                  <CreditosConfigPage section="productos" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/creditos/precios"
            element={
              <PrivateRoute>
                <Layout>
                  <CreditosConfigPage section="precios" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/creditos/placas"
            element={
              <PrivateRoute>
                <Layout>
                  <CreditosConfigPage section="placas" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/creditos/personas"
            element={
              <PrivateRoute>
                <Layout>
                  <CreditosConfigPage section="personas" />
                </Layout>
              </PrivateRoute>
            }
          />
          {/* Consulta operativa grifero (NO es configuración /creditos/perfiles) */}
          <Route
            path="/operaciones/consulta-credito-placa"
            element={
              <PrivateRoute>
                <Layout>
                  <OperacionesCreditosConsultaPage modo="placa" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/operaciones/consulta-credito-ruc"
            element={
              <PrivateRoute>
                <Layout>
                  <OperacionesCreditosConsultaPage modo="ruc" />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/operaciones/consulta-creditos"
            element={<Navigate to="/operaciones/consulta-credito-placa" replace />}
          />
          <Route
            path="/operaciones/creditos"
            element={<Navigate to="/operaciones/consulta-credito-placa" replace />}
          />
          <Route path="/creditos" element={<Navigate to="/creditos/perfiles" replace />} />
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
          <Route
            path="/supervision/conciliacion-stock-combustible"
            element={
              <PrivateRoute>
                <Layout>
                  <ConciliacionStockCombustiblePage />
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
