import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'

const PRIORIDADES = [
  { value: 'alta',  label: 'Alta',  emoji: '🔴', color: 'text-[#C0614A]', bg: 'bg-[#FDF0EE]', border: 'border-[#C0614A]/20' },
  { value: 'media', label: 'Media', emoji: '🟡', color: 'text-[#D4845A]', bg: 'bg-[#FDF4EF]', border: 'border-[#D4845A]/20' },
  { value: 'baja',  label: 'Baja',  emoji: '🟢', color: 'text-[#8BAF8D]', bg: 'bg-[#F0F5F0]', border: 'border-[#8BAF8D]/20' },
]

function getPrioridad(value) {
  return PRIORIDADES.find(p => p.value === value) ?? PRIORIDADES[1]
}

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export default function Wishlist() {
  const { user } = useAuth()

  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando]   = useState(false)

  // Formulario
  const [nombre, setNombre]             = useState('')
  const [descripcion, setDescripcion]   = useState('')
  const [precio, setPrecio]             = useState('')
  const [prioridad, setPrioridad]       = useState('media')

  useEffect(() => {
    if (user) cargarItems()
  }, [user])

  async function cargarItems() {
    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .order('comprado', { ascending: true })
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setNombre('')
    setDescripcion('')
    setPrecio('')
    setPrioridad('media')
    setMostrarForm(false)
  }

  async function guardar() {
    if (!nombre.trim()) return
    setGuardando(true)

    await supabase.from('wishlist').insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio_estimado: precio ? Number(precio) : null,
      prioridad,
      agregado_por: user.id,
    })

    await cargarItems()
    resetForm()
    setGuardando(false)
  }

  async function marcarComprado(id, comprado) {
    await supabase.from('wishlist').update({
      comprado: !comprado,
      comprado_en: !comprado ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', id)
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, comprado: !comprado } : i
    ).sort((a, b) => a.comprado - b.comprado))
  }

  async function eliminar(id) {
    await supabase.from('wishlist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  const pendientes = items.filter(i => !i.comprado)
  const comprados  = items.filter(i => i.comprado)

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#2D2926]">Lista de deseos 🛋️</h1>
            <p className="text-xs text-[#8C7E75]">Cosas que quieren para el hogar</p>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4845A] text-white text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2.5} /> Agregar
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">

        {/* Estado vacío */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-5xl mb-3">🛒</p>
            <p className="text-sm font-medium text-[#2D2926]">Lista vacía por ahora</p>
            <p className="text-xs text-[#8C7E75] mt-1">Agrega cosas que quieran comprar para el hogar</p>
            <button
              onClick={() => setMostrarForm(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#D4845A] text-white text-sm font-medium"
            >
              + Agregar el primero
            </button>
          </div>
        )}

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wide px-1">
              Pendientes · {pendientes.length}
            </p>
            {pendientes.map(item => {
              const p = getPrioridad(item.prioridad)
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => marcarComprado(item.id, item.comprado)}
                      className="w-6 h-6 rounded-full border-2 border-[#EDE8E3] flex items-center justify-center flex-shrink-0 mt-0.5 hover:border-[#8BAF8D] transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#2D2926]">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="text-xs text-[#8C7E75] mt-0.5">{item.descripcion}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${p.color} ${p.bg} ${p.border}`}>
                          {p.emoji} {p.label}
                        </span>
                        {item.precio_estimado && (
                          <span className="text-xs text-[#8C7E75]">~{formatMonto(item.precio_estimado)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => eliminar(item.id)}
                      className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FDF0EE] hover:text-[#C0614A] transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Comprados */}
        {comprados.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wide px-1 mt-2">
              Comprado · {comprados.length}
            </p>
            {comprados.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#EDE8E3] p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => marcarComprado(item.id, item.comprado)}
                    className="w-6 h-6 rounded-full bg-[#8BAF8D] flex items-center justify-center flex-shrink-0"
                  >
                    <Check size={13} strokeWidth={3} className="text-white" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D2926] line-through">{item.nombre}</p>
                    {item.precio_estimado && (
                      <p className="text-xs text-[#8C7E75]">{formatMonto(item.precio_estimado)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => eliminar(item.id)}
                    className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FDF0EE] hover:text-[#C0614A] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal / Bottom sheet agregar */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={resetForm} />
          <div className="relative bg-white rounded-t-3xl p-5 flex flex-col gap-4 pb-24 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-[#2D2926]">Nuevo deseo</p>
              <button onClick={resetForm} className="p-1.5 rounded-xl text-[#8C7E75]">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2D2926]">¿Qué quieren comprar?</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Sofá nuevo para la sala"
                autoFocus
                maxLength={80}
                className="px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm placeholder-[#8C7E75] focus:outline-none focus:border-[#D4845A]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2D2926]">
                Notas <span className="text-[#8C7E75] font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Color gris, tamaño 3 personas"
                maxLength={120}
                className="px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm placeholder-[#8C7E75] focus:outline-none focus:border-[#D4845A]"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#2D2926]">
                  Precio aprox. <span className="text-[#8C7E75] font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  placeholder="0"
                  className="px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm focus:outline-none focus:border-[#D4845A]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2D2926]">Prioridad</label>
              <div className="flex gap-2">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPrioridad(p.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      prioridad === p.value
                        ? `${p.color} ${p.bg} ${p.border}`
                        : 'border-[#EDE8E3] bg-[#FAF7F4] text-[#8C7E75]'
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={guardar}
              disabled={guardando || !nombre.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#D4845A] text-white font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {guardando ? 'Guardando...' : 'Agregar a la lista'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
