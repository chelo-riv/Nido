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
import WishlistDetalle from './pages/WishlistDetalle'
import Hogar from './pages/Hogar'
import Focos from './pages/Focos'
import ListaSuper from './pages/ListaSuper'
import ListaDetalle from './pages/ListaDetalle'
import Tareas from './pages/Tareas'
import NuevaTarea from './pages/NuevaTarea'
import Recetas from './pages/Recetas'
import RecetaDetalle from './pages/RecetaDetalle'
import NuevaReceta from './pages/NuevaReceta'

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
          path="/wishlist/:id"
          element={<RutaProtegida><WishlistDetalle /></RutaProtegida>}
        />
        <Route
          path="/hogar"
          element={<RutaProtegida><Hogar /></RutaProtegida>}
        />
        <Route
          path="/focos"
          element={<RutaProtegida><Focos /></RutaProtegida>}
        />
        <Route
          path="/lista-super"
          element={<RutaProtegida><ListaSuper /></RutaProtegida>}
        />
        <Route
          path="/lista-super/:id"
          element={<RutaProtegida><ListaDetalle /></RutaProtegida>}
        />
        <Route
          path="/tareas"
          element={<RutaProtegida><Tareas /></RutaProtegida>}
        />
        <Route
          path="/nueva-tarea"
          element={<RutaProtegida><NuevaTarea /></RutaProtegida>}
        />
        <Route
          path="/recetas"
          element={<RutaProtegida><Recetas /></RutaProtegida>}
        />
        <Route
          path="/recetas/:id"
          element={<RutaProtegida><RecetaDetalle /></RutaProtegida>}
        />
        <Route
          path="/nueva-receta"
          element={<RutaProtegida><NuevaReceta /></RutaProtegida>}
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
