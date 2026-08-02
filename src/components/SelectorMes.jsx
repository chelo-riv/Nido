import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mesActual, sumarMeses, etiquetaMes } from '../lib/fechas'

// Navegador de mes: « Julio 2026 ». No deja avanzar más allá del mes actual.
// onCambiar recibe el nuevo mes en formato "YYYY-MM".
export default function SelectorMes({ mes, onCambiar, className = '' }) {
  const hoy = mesActual()
  const enElFuturo = mes >= hoy

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onCambiar(sumarMeses(mes, -1))}
        className="p-2 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] hover:bg-[#EDE8E3]/60 transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft size={18} strokeWidth={2.2} />
      </button>

      <div className="flex-1 text-center min-w-0">
        <p className="text-sm font-bold text-[#2D2926] truncate">{etiquetaMes(mes)}</p>
        {mes !== hoy && (
          <button
            type="button"
            onClick={() => onCambiar(hoy)}
            className="text-[11px] font-medium text-[#D4845A] mt-0.5"
          >
            Ir a este mes
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onCambiar(sumarMeses(mes, 1))}
        disabled={enElFuturo}
        className="p-2 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] hover:bg-[#EDE8E3]/60 transition-colors disabled:opacity-35 disabled:pointer-events-none"
        aria-label="Mes siguiente"
      >
        <ChevronRight size={18} strokeWidth={2.2} />
      </button>
    </div>
  )
}
