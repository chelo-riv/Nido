import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { Home, Wallet, Plus, House, Lightbulb } from 'lucide-react'

// Rutas que pertenecen a cada sección
const RUTAS_FINANZAS = ['/gastos', '/agregar', '/editar', '/balances', '/presupuestos', '/graficas', '/wishlist']
const RUTAS_HOGAR    = ['/hogar', '/tareas', '/lista-super', '/recetas', '/agregar-tarea', '/nueva-tarea', '/nueva-receta']
const RUTAS_FOCOS    = ['/focos']

function enSeccion(pathname, rutas) {
  return rutas.some(r => pathname === r || pathname.startsWith(r + '/'))
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const finanzasActivo = enSeccion(pathname, RUTAS_FINANZAS)
  const hogarActivo    = enSeccion(pathname, RUTAS_HOGAR)
  const focosActivo    = enSeccion(pathname, RUTAS_FOCOS)
  const inicioActivo   = pathname === '/dashboard'

  function handlePlus() {
    if (pathname.startsWith('/lista-super'))                              navigate('/lista-super?nueva=true')
    else if (pathname.startsWith('/tareas') || pathname === '/nueva-tarea')   navigate('/nueva-tarea')
    else if (pathname.startsWith('/recetas') || pathname === '/nueva-receta') navigate('/nueva-receta')
    else if (hogarActivo)                                                navigate('/hogar')
    else                                                                 navigate('/agregar')
  }

  const tabClase = (activo) =>
    `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
      activo ? 'text-[#D4845A]' : 'text-[#8C7E75]'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E3] flex items-center justify-around px-2 h-16 safe-area-bottom z-50">

      {/* Inicio */}
      <NavLink
        to="/dashboard"
        className={() => tabClase(inicioActivo)}
      >
        <Home size={20} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">Inicio</span>
      </NavLink>

      {/* Finanzas */}
      <NavLink
        to="/gastos"
        className={() => tabClase(finanzasActivo)}
      >
        <Wallet size={20} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">Finanzas</span>
      </NavLink>

      {/* Botón + central (context-sensitive) */}
      <button
        onClick={handlePlus}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#D4845A] shadow-md -mt-5 text-white transition-transform active:scale-95"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Hogar */}
      <NavLink
        to="/hogar"
        className={() => tabClase(hogarActivo)}
      >
        <House size={20} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">Hogar</span>
      </NavLink>

      {/* Focos */}
      <NavLink
        to="/focos"
        className={() => tabClase(focosActivo)}
      >
        <Lightbulb size={20} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">Focos</span>
      </NavLink>

    </nav>
  )
}
