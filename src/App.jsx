import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import LiquidacionGrifero from './pages/LiquidacionGrifero'
import DetalleTurno from './pages/DetalleTurno'
import GestionTurnoDia from './pages/GestionTurnoDia'
import ConsultarTurnos from './pages/ConsultarTurnos'
import CuadreDiario from './pages/CuadreDiario'
import ProximamentePage from './pages/ProximamentePage'
import Empleados from './pages/Empleados'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import CuadreContable from './pages/CuadreContable'

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
            path="/turno-dia" 
            element={
              <PrivateRoute>
                <Layout>
                  <GestionTurnoDia />
                </Layout>
              </PrivateRoute>
            } 
          />
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
          <Route 
            path="/empleados" 
            element={
              <PrivateRoute>
                <Layout>
                  <Empleados />
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
          <Route path="/" element={<Navigate to="/liquidacion" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
