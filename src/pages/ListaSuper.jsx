import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, ShoppingCart, Check, Trash2, X, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'

export default function ListaSuper() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [listas, setListas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [nombreNueva, setNombreNueva] = useState('')
  const [creando, setCreando] = useState(false)
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false)

  useEffect(() => {
    if (user) cargarListas()
  }, [user])

  useEffect(() => {
    if (searchParams.get('nueva') === 'true') {
      setMostrarModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  async function cargarListas() {
    const { data } = await supabase
      .from('listas_super')
      .select('*, items_lista(*)')
      .order('created_at', { ascending: false })
    setListas(data ?? [])
    setLoading(false)
  }

  async function crearLista() {
    if (!nombreNueva.trim() || creando) return
    setCreando(true)
    const { data, error } = await supabase
      .from('listas_super')
      .insert({ nombre: nombreNueva.trim(), creado_por: user.id })
      .select('*, items_lista(*)')
      .single()
    if (!error && data) {
      setNombreNueva('')
      setMostrarModal(false)
      navigate(`/lista-super/${data.id}`)
    }
    setCreando(false)
  }

  async function eliminarLista(id) {
    setListas(prev => prev.filter(l => l.id !== id))
    await supabase.from('listas_super').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-3xl animate-pulse">🛒</span>
      </div>
    )
  }

  const activas     = listas.filter(l => !l.completada)
  const completadas = listas.filter(l => l.completada)

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hogar')}
            className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#2D2926]">Lista del súper</h1>
            <p className="text-xs text-[#8C7E75]">
              {activas.length} lista{activas.length !== 1 ? 's' : ''} activa{activas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="flex items-center gap-1.5 bg-[#D4845A] text-white text-sm font-semibold px-3 py-2 rounded-xl"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva
        </button>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">

        {/* Listas activas */}
        {activas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-8 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">🛒</span>
            <p className="text-sm font-semibold text-[#2D2926]">No hay listas activas</p>
            <p className="text-xs text-[#8C7E75] leading-relaxed max-w-xs">
              Crea una lista para el súper, la farmacia o cualquier tienda
            </p>
            <button
              onClick={() => setMostrarModal(true)}
              className="mt-1 bg-[#D4845A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Crear lista
            </button>
          </div>
        ) : (
          activas.map(lista => (
            <ListaCard
              key={lista.id}
              lista={lista}
              onTap={() => navigate(`/lista-super/${lista.id}`)}
              onDelete={() => eliminarLista(lista.id)}
            />
          ))
        )}

        {/* Listas completadas */}
        {completadas.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMostrarCompletadas(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1 py-1 w-full"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${mostrarCompletadas ? 'rotate-180' : ''}`}
              />
              Completadas ({completadas.length})
            </button>
            {mostrarCompletadas && completadas.map(lista => (
              <ListaCard
                key={lista.id}
                lista={lista}
                completada
                onTap={() => navigate(`/lista-super/${lista.id}`)}
                onDelete={() => eliminarLista(lista.id)}
              />
            ))}
          </div>
        )}

      </div>

      {/* Modal nueva lista */}
      {mostrarModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => { setMostrarModal(false); setNombreNueva('') }}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <p className="text-base font-bold text-[#2D2926]">Nueva lista</p>
              <button
                onClick={() => { setMostrarModal(false); setNombreNueva('') }}
                className="p-1.5 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4]"
              >
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={nombreNueva}
              onChange={e => setNombreNueva(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && crearLista()}
              placeholder="Ej. Súper semanal, Costco, Farmacia..."
              className="w-full bg-[#FAF7F4] border border-[#EDE8E3] rounded-xl px-4 py-3 text-sm text-[#2D2926] placeholder-[#8C7E75] outline-none focus:border-[#D4845A] mb-4"
            />
            <button
              onClick={crearLista}
              disabled={!nombreNueva.trim() || creando}
              className="w-full bg-[#D4845A] text-white font-semibold py-3.5 rounded-xl text-sm disabled:opacity-50 transition-opacity"
            >
              {creando ? 'Creando...' : 'Crear y abrir lista'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

/* ─── Tarjeta de lista ───────────────────────────────────────────────────── */
function ListaCard({ lista, completada, onTap, onDelete }) {
  const [expandido, setExpandido] = useState(false)
  const items      = lista.items_lista ?? []
  const pendientes = items.filter(i => !i.checked).length
  const total      = items.length
  const progreso   = total > 0 ? ((total - pendientes) / total) * 100 : 0

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${completada ? 'bg-[#EBF0EB]' : 'bg-[#FAF0EB]'}`}>
          {completada
            ? <Check size={18} className="text-[#8BAF8D]" strokeWidth={2.5} />
            : <ShoppingCart size={18} className="text-[#D4845A]" strokeWidth={1.8} />
          }
        </div>

        <button className="flex-1 text-left min-w-0" onClick={onTap}>
          <p className={`text-sm font-semibold truncate ${completada ? 'text-[#8C7E75] line-through' : 'text-[#2D2926]'}`}>
            {lista.nombre}
          </p>
          <p className="text-xs text-[#8C7E75] mt-0.5">
            {total === 0
              ? 'Lista vacía'
              : completada
                ? `${total} ítem${total !== 1 ? 's' : ''} · completada`
                : `${pendientes} pendiente${pendientes !== 1 ? 's' : ''} de ${total}`
            }
          </p>
        </button>

        <button
          onClick={() => setExpandido(v => !v)}
          className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors flex-shrink-0"
        >
          <ChevronDown size={16} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Barra de progreso */}
      {total > 0 && !completada && (
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-[#EDE8E3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8BAF8D] rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      )}

      {/* Expandido: acciones */}
      {expandido && (
        <div className="border-t border-[#EDE8E3] px-4 py-3 flex gap-2">
          <button
            onClick={onTap}
            className="flex-1 bg-[#FAF7F4] text-[#2D2926] text-sm font-medium py-2.5 rounded-xl"
          >
            {completada ? 'Ver lista' : 'Abrir lista'}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 bg-[#FFF0EE] text-[#C0614A] text-sm font-medium py-2.5 px-4 rounded-xl"
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
