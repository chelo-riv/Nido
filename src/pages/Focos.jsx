import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Wifi, Palette, Timer, Sparkles } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const features = [
  {
    icono: Lightbulb,
    titulo: 'Control de focos',
    desc: 'Enciende, apaga y ajusta el brillo de tus focos inteligentes directo desde Nido.',
    color: 'bg-[#FDF6E3]',
    iconColor: 'text-[#C8A94A]',
  },
  {
    icono: Palette,
    titulo: 'Color y temperatura',
    desc: 'Cambia el tono de la luz: cálido para la noche, frío para trabajar.',
    color: 'bg-[#EBF0EB]',
    iconColor: 'text-[#8BAF8D]',
  },
  {
    icono: Timer,
    titulo: 'Escenas y rutinas',
    desc: 'Crea escenas preconfiguradas: Mañana, Noche, Película, Romántico.',
    color: 'bg-[#F0EBE3]',
    iconColor: 'text-[#D4845A]',
  },
  {
    icono: Wifi,
    titulo: 'Integración local y cloud',
    desc: 'Soporte para focos WiFi con control directo desde la red de tu hogar.',
    color: 'bg-[#EBF0F5]',
    iconColor: 'text-[#6A9AB0]',
  },
]

export default function Focos() {
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
          <h1 className="text-lg font-bold text-[#2D2926]">Focos inteligentes</h1>
          <p className="text-xs text-[#8C7E75]">Control de luces · Escenas · Rutinas</p>
        </div>
      </div>

      <div className="px-4 pt-6 flex flex-col gap-4">

        {/* Icono central */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#FDF6E3] flex items-center justify-center">
              <Lightbulb size={40} className="text-[#C8A94A]" strokeWidth={1.5} />
            </div>
            <div className="absolute inset-0 rounded-full bg-[#FDF6E3] animate-ping opacity-30" />
          </div>
          <p className="text-base font-semibold text-[#2D2926]">Control de focos inteligentes</p>
          <p className="text-xs text-[#8C7E75] text-center leading-relaxed max-w-xs">
            Maneja todos tus focos desde un solo lugar, sin salir de Nido.
          </p>
        </div>

        {/* Banner próximamente */}
        <div className="bg-gradient-to-r from-[#C8A94A] to-[#D4845A] rounded-2xl p-5 text-white flex items-start gap-4">
          <div className="bg-white/20 rounded-xl p-2.5 flex-shrink-0">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-base mb-1">En camino 💡</p>
            <p className="text-sm opacity-90 leading-relaxed">
              Estamos trabajando en la integración con focos inteligentes WiFi para controlarlo todo desde aquí.
            </p>
          </div>
        </div>

        {/* Features próximas */}
        <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
          Lo que podrás hacer
        </p>

        {features.map(({ icono: Icono, titulo, desc, color, iconColor }) => (
          <div
            key={titulo}
            className="bg-white rounded-2xl border border-[#EDE8E3] p-4 flex items-start gap-4 opacity-75"
          >
            <div className={`${color} rounded-xl p-3 flex-shrink-0`}>
              <Icono size={22} className={iconColor} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2D2926] mb-1">{titulo}</p>
              <p className="text-xs text-[#8C7E75] leading-relaxed">{desc}</p>
            </div>
            <span className="text-[10px] font-medium text-[#D4845A] bg-[#FAF0EB] px-2 py-1 rounded-full flex-shrink-0 mt-0.5">
              Pronto
            </span>
          </div>
        ))}

      </div>

      <BottomNav />
    </div>
  )
}
