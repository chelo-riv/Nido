import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Heart, Trash2, X, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'

export default function Wishlist() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [listas, setListas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [creando, setCreando] = useState(false)
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false)

  // Formulario
  const [titulo, setTitulo] = useState('')

  useEffect(() => {
    if (user) cargarListas()
  }, [user])

  useEffect(() => {
    if (searchParams.get('nueva') === 'true') {
      setMostrarModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  async function cargarListas() {
    const { data } = await supabase
      .from('wishlists')
      .select('*, wishlist_items(id, comprado)')
      .order('created_at', { ascending: false })
    setListas(data ?? [])
    setLoading(false)
  }

  function resetModal() {
    setTitulo('')
    setMostrarModal(false)
  }

  async function crearLista() {
    if (!titulo.trim() || creando) return
    setCreando(true)
    const { data, error } = await supabase
      .from('wishlists')
      .insert({ titulo: titulo.trim(), creado_por: user.id })
      .select('*, wishlist_items(id, comprado)')
      .single()

    if (!error && data) {
      setTitulo('')
      setMostrarModal(false)
      navigate(`/wishlist/${data.id}`)
    }
    setCreando(false)
  }

  async function eliminarLista(id) {
    setListas(prev => prev.filter(l => l.id !== id))
    await supabase.from('wishlists').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  const activas = listas.filter(l => !l.archivada)
  const archivadas = listas.filter(l => l.archivada)

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#2D2926]">Wishlists 🛋️</h1>
            <p className="text-xs text-[#8C7E75]">Crea listas con títulos y agrega cosas que quieren comprar</p>
          </div>
          <button
            onClick={() => setMostrarModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4845A] text-white text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2.5} /> Agregar
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">

        {/* Estado vacío */}
        {listas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-5xl mb-3">🛒</p>
            <p className="text-sm font-medium text-[#2D2926]">No hay wishlists por ahora</p>
            <p className="text-xs text-[#8C7E75] mt-1">Crea una lista y agrega productos con link o descripción</p>
            <button
              onClick={() => setMostrarModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#D4845A] text-white text-sm font-medium"
            >
              + Crear la primera
            </button>
          </div>
        )}

        {/* Listas activas */}
        {activas.length > 0 && activas.map(lista => (
          <WishlistCard
            key={lista.id}
            lista={lista}
            onTap={() => navigate(`/wishlist/${lista.id}`)}
            onDelete={() => eliminarLista(lista.id)}
          />
        ))}

        {/* Archivadas */}
        {archivadas.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMostrarArchivadas(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1 py-1 w-full"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${mostrarArchivadas ? 'rotate-180' : ''}`}
              />
              Archivadas ({archivadas.length})
            </button>
            {mostrarArchivadas && archivadas.map(lista => (
              <WishlistCard
                key={lista.id}
                lista={lista}
                archivada
                onTap={() => navigate(`/wishlist/${lista.id}`)}
                onDelete={() => eliminarLista(lista.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal nueva wishlist */}
      {mostrarModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={resetModal}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <p className="text-base font-bold text-[#2D2926]">Nueva wishlist</p>
              <button
                onClick={resetModal}
                className="p-1.5 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4]"
              >
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && crearLista()}
              placeholder="Ej. Sala, Cocina, Viajes, Gadgets..."
              className="w-full bg-[#FAF7F4] border border-[#EDE8E3] rounded-xl px-4 py-3 text-sm text-[#2D2926] placeholder-[#8C7E75] outline-none focus:border-[#D4845A] mb-4"
            />
            <button
              onClick={crearLista}
              disabled={!titulo.trim() || creando}
              className="w-full bg-[#D4845A] text-white font-semibold py-3.5 rounded-xl text-sm disabled:opacity-50 transition-opacity"
            >
              {creando ? 'Creando...' : 'Crear y abrir wishlist'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function WishlistCard({ lista, archivada, onTap, onDelete }) {
  const [expandido, setExpandido] = useState(false)
  const items = lista.wishlist_items ?? []
  const pendientes = items.filter(i => !i.comprado).length
  const total = items.length

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${archivada ? 'bg-[#F4F1EE]' : 'bg-[#FAF0EB]'}`}>
          <Heart size={18} className={`${archivada ? 'text-[#8C7E75]' : 'text-[#D4845A]'}`} strokeWidth={1.8} />
        </div>

        <button className="flex-1 text-left min-w-0" onClick={onTap}>
          <p className={`text-sm font-semibold truncate ${archivada ? 'text-[#8C7E75]' : 'text-[#2D2926]'}`}>
            {lista.titulo}
          </p>
          <p className="text-xs text-[#8C7E75] mt-0.5">
            {total === 0
              ? 'Wishlist vacía'
              : archivada
                ? `${total} ítem${total !== 1 ? 's' : ''}`
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

      {expandido && (
        <div className="border-t border-[#EDE8E3] px-4 py-3 flex gap-2">
          <button
            onClick={onTap}
            className="flex-1 bg-[#FAF7F4] text-[#2D2926] text-sm font-medium py-2.5 rounded-xl"
          >
            Abrir wishlist
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
