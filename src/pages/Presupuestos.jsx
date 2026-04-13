import { useState, useEffect } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LISTA_CATEGORIAS } from '../lib/categorias'
import BottomNav from '../components/BottomNav'

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function nombreDelMes() {
  return new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function colorBarra(pct) {
  if (pct >= 100) return { barra: '#C0614A', texto: 'text-[#C0614A]', bg: 'bg-[#C0614A]' }
  if (pct >= 80)  return { barra: '#D4845A', texto: 'text-[#D4845A]', bg: 'bg-[#D4845A]' }
  return { barra: '#8BAF8D', texto: 'text-[#8BAF8D]', bg: 'bg-[#8BAF8D]' }
}

export default function Presupuestos() {
  const { user } = useAuth()

  const [gastos, setGastos]           = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [editando, setEditando]       = useState(null)   // categoria que se está editando
  const [valorEdit, setValorEdit]     = useState('')
  const [guardando, setGuardando]     = useState(false)

  useEffect(() => {
    if (user) cargarDatos()
  }, [user])

  async function cargarDatos() {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
    const fin    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

    const [{ data: gastosData }, { data: presupuestosData }] = await Promise.all([
      supabase.from('gastos').select('monto, categoria').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('presupuestos').select('*'),
    ])

    setGastos(gastosData ?? [])
    setPresupuestos(presupuestosData ?? [])
    setLoading(false)
  }

  // Gasto total del mes por categoría
  function gastadoEnCategoria(cat) {
    return gastos
      .filter(g => g.categoria === cat)
      .reduce((a, g) => a + Number(g.monto), 0)
  }

  function abrirEditar(cat, limiteActual) {
    setEditando(cat)
    setValorEdit(limiteActual ? String(limiteActual) : '')
  }

  function cancelarEditar() {
    setEditando(null)
    setValorEdit('')
  }

  async function guardarLimite(cat) {
    if (!valorEdit || Number(valorEdit) <= 0) return
    setGuardando(true)

    const existe = presupuestos.find(p => p.categoria === cat)

    if (existe) {
      await supabase
        .from('presupuestos')
        .update({ monto_limite: Number(valorEdit), updated_at: new Date().toISOString() })
        .eq('categoria', cat)
    } else {
      await supabase
        .from('presupuestos')
        .insert({ categoria: cat, monto_limite: Number(valorEdit) })
    }

    await cargarDatos()
    setEditando(null)
    setValorEdit('')
    setGuardando(false)
  }

  async function eliminarLimite(cat) {
    await supabase.from('presupuestos').delete().eq('categoria', cat)
    setPresupuestos(prev => prev.filter(p => p.categoria !== cat))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  // Separar categorías con y sin presupuesto
  const conLimite = LISTA_CATEGORIAS.filter(c => presupuestos.find(p => p.categoria === c.value))
  const sinLimite = LISTA_CATEGORIAS.filter(c => !presupuestos.find(p => p.categoria === c.value))

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <p className="text-xs text-[#8C7E75] capitalize">{nombreDelMes()}</p>
        <h1 className="text-lg font-bold text-[#2D2926]">Presupuestos</h1>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">

        {/* Categorías con límite */}
        {conLimite.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wide px-1">Con límite</p>
            {conLimite.map(({ value, label, emoji }) => {
              const presupuesto = presupuestos.find(p => p.categoria === value)
              const limite = Number(presupuesto.monto_limite)
              const gastado = gastadoEnCategoria(value)
              const pct = Math.min((gastado / limite) * 100, 100)
              const { texto, bg } = colorBarra(pct)
              const estaEditando = editando === value

              return (
                <div key={value} className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#2D2926]">{label}</p>
                      <p className="text-xs text-[#8C7E75]">
                        {formatMonto(gastado)} de {formatMonto(limite)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEditar(value, limite)}
                        className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminarLimite(value)}
                        className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FDF0EE] hover:text-[#C0614A] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="h-2 bg-[#EDE8E3] rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all ${bg}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold ${texto}`}>
                      {pct >= 100 ? '⚠️ Límite superado' : `${Math.round(pct)}% usado`}
                    </span>
                    <span className="text-xs text-[#8C7E75]">
                      {pct < 100 ? `${formatMonto(limite - gastado)} disponible` : `${formatMonto(gastado - limite)} de más`}
                    </span>
                  </div>

                  {/* Editar inline */}
                  {estaEditando && (
                    <div className="mt-3 pt-3 border-t border-[#EDE8E3] flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={valorEdit}
                        onChange={e => setValorEdit(e.target.value)}
                        placeholder="Nuevo límite"
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-sm text-[#2D2926] focus:outline-none focus:border-[#D4845A]"
                      />
                      <button
                        onClick={() => guardarLimite(value)}
                        disabled={guardando}
                        className="px-3 py-2 rounded-xl bg-[#D4845A] text-white disabled:opacity-60"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={cancelarEditar}
                        className="px-3 py-2 rounded-xl bg-[#FAF7F4] border border-[#EDE8E3] text-[#8C7E75]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Categorías sin límite */}
        {sinLimite.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wide px-1 mt-2">
              Sin límite definido
            </p>
            {sinLimite.map(({ value, label, emoji }) => {
              const gastado = gastadoEnCategoria(value)
              const estaEditando = editando === value

              return (
                <div key={value} className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2D2926]">{label}</p>
                      {gastado > 0
                        ? <p className="text-xs text-[#8C7E75]">Gastado: {formatMonto(gastado)}</p>
                        : <p className="text-xs text-[#8C7E75]">Sin gastos este mes</p>
                      }
                    </div>
                    <button
                      onClick={() => abrirEditar(value, null)}
                      className="text-xs font-medium text-[#D4845A] px-3 py-1.5 rounded-xl border border-[#D4845A]/30 bg-[#FDF4EF]"
                    >
                      Definir límite
                    </button>
                  </div>

                  {estaEditando && (
                    <div className="mt-3 pt-3 border-t border-[#EDE8E3] flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={valorEdit}
                        onChange={e => setValorEdit(e.target.value)}
                        placeholder="Ej: 3000"
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-sm text-[#2D2926] focus:outline-none focus:border-[#D4845A]"
                      />
                      <button
                        onClick={() => guardarLimite(value)}
                        disabled={guardando}
                        className="px-3 py-2 rounded-xl bg-[#D4845A] text-white disabled:opacity-60"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={cancelarEditar}
                        className="px-3 py-2 rounded-xl bg-[#FAF7F4] border border-[#EDE8E3] text-[#8C7E75]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
