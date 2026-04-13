import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AgregarGasto from './pages/AgregarGasto'
import Gastos from './pages/Gastos'
import EditarGasto from './pages/EditarGasto'
import Balances from './pages/Balances'
import Presupuestos from './pages/Presupuestos'
import Graficas from './pages/Graficas'
import Wishlist from './pages/Wishlist'

function CargandoApp() {
  return (
    <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
      <span className="text-4xl animate-pulse">🪺</span>
    </div>
  )
}

function RutaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <CargandoApp />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  const { user, loading } = useAuth()

  if (loading) return <CargandoApp />

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={<RutaProtegida><Dashboard /></RutaProtegida>}
        />
        <Route
          path="/agregar"
          element={<RutaProtegida><AgregarGasto /></RutaProtegida>}
        />
        <Route
          path="/gastos"
          element={<RutaProtegida><Gastos /></RutaProtegida>}
        />
        <Route
          path="/editar/:id"
          element={<RutaProtegida><EditarGasto /></RutaProtegida>}
        />
        <Route
          path="/balances"
          element={<RutaProtegida><Balances /></RutaProtegida>}
        />
        <Route
          path="/presupuestos"
          element={<RutaProtegida><Presupuestos /></RutaProtegida>}
        />
        <Route
          path="/graficas"
          element={<RutaProtegida><Graficas /></RutaProtegida>}
        />
        <Route
          path="/wishlist"
          element={<RutaProtegida><Wishlist /></RutaProtegida>}
        />
        <Route
          path="*"
          element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </HashRouter>
  )
}

export default App
