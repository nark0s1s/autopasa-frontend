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
                  <ProximamentePage titulo="Gestión de Empleados" />
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
