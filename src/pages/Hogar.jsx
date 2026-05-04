import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, ShoppingCart, ChefHat, ArrowRight } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const modulosActivos = [
  {
    icono: ClipboardList,
    titulo: 'Tareas del hogar',
    desc: 'Asigna, programa y da seguimiento a las tareas del hogar.',
    color: 'bg-[#F0EBE3]',
    iconColor: 'text-[#D4845A]',
    ruta: '/tareas',
  },
  {
    icono: ShoppingCart,
    titulo: 'Lista del súper',
    desc: 'Listas de compras con categorías y modo de compra.',
    color: 'bg-[#EBF0EB]',
    iconColor: 'text-[#8BAF8D]',
    ruta: '/lista-super',
  },
  {
    icono: ChefHat,
    titulo: 'Recetas del hogar',
    desc: 'Tu recetario personal. Agrega ingredientes al súper con un toque.',
    color: 'bg-[#F0EDE8]',
    iconColor: 'text-[#C0875A]',
    ruta: '/recetas',
  },
]


export default function Hogar() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#2D2926]">Gestión del hogar</h1>
          <p className="text-xs text-[#8C7E75]">Tareas · Lista del súper · Recetas</p>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* Módulos activos */}
        {modulosActivos.map(({ icono: Icono, titulo, desc, color, iconColor, ruta }) => (
          <button
            key={titulo}
            onClick={() => navigate(ruta)}
            className="bg-white rounded-2xl border border-[#EDE8E3] p-4 flex items-center gap-4 text-left w-full active:bg-[#FAF7F4] transition-colors"
          >
            <div className={`${color} rounded-xl p-3 flex-shrink-0`}>
              <Icono size={22} className={iconColor} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2D2926] mb-0.5">{titulo}</p>
              <p className="text-xs text-[#8C7E75] leading-relaxed">{desc}</p>
            </div>
            <ArrowRight size={18} className="text-[#8C7E75] flex-shrink-0" />
          </button>
        ))}


      </div>

      <BottomNav />
    </div>
  )
}
