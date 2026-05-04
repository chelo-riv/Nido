import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Check, Trash2, ChevronDown, Link as LinkIcon, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', emoji: '🔴', color: 'text-[#C0614A]', bg: 'bg-[#FDF0EE]', border: 'border-[#C0614A]/20' },
  { value: 'media', label: 'Media', emoji: '🟡', color: 'text-[#D4845A]', bg: 'bg-[#FDF4EF]', border: 'border-[#D4845A]/20' },
  { value: 'baja', label: 'Baja', emoji: '🟢', color: 'text-[#8BAF8D]', bg: 'bg-[#F0F5F0]', border: 'border-[#8BAF8D]/20' },
]

function getPrioridad(value) {
  return PRIORIDADES.find(p => p.value === value) ?? PRIORIDADES[1]
}

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export default function WishlistDetalle() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const nombreRef = useRef(null)

  const [lista, setLista] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Form item
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [link, setLink] = useState('')
  const [precio, setPrecio] = useState('')
  const [prioridad, setPrioridad] = useState('media')
  const [errorGuardar, setErrorGuardar] = useState('')

  useEffect(() => {
    if (user && id) cargarDetalle()
  }, [user, id])

  useEffect(() => {
    if (searchParams.get('agregar') === 'true') {
      setMostrarForm(true)
      setTimeout(() => nombreRef.current?.focus(), 0)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  async function cargarDetalle() {
    const [{ data: listaData }, { data: itemsData }] = await Promise.all([
      supabase.from('wishlists').select('*').eq('id', id).single(),
      supabase.from('wishlist_items').select('*').eq('wishlist_id', id).order('comprado', { ascending: true }).order('created_at', { ascending: false }),
    ])

    if (!listaData) {
      navigate('/wishlist')
      return
    }

    setLista(listaData)
    setItems(itemsData ?? [])
    setLoading(false)
  }

  function resetForm() {
    setNombre('')
    setDescripcion('')
    setLink('')
    setPrecio('')
    setPrioridad('media')
    setErrorGuardar('')
    setMostrarForm(false)
  }

  function linkNormalizado(v) {
    const raw = (v ?? '').trim()
    if (!raw) return ''
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    return `https://${raw}`
  }

  async function guardar() {
    if (!nombre.trim() || guardando || !id) return
    setGuardando(true)
    setErrorGuardar('')

    const safeLink = linkNormalizado(link)
    const { data: inserted, error } = await supabase
      .from('wishlist_items')
      .insert({
        wishlist_id: id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        link: safeLink || null,
        precio_estimado: precio ? Number(precio) : null,
        prioridad,
        agregado_por: user.id,
      })
      .select()

    if (error) {
      setErrorGuardar(error.message || 'No se pudo guardar el ítem')
      setGuardando(false)
      return
    }

    const row = inserted?.[0]
    if (row) {
      setItems(prev => [row, ...prev])
    } else {
      await cargarDetalle()
    }
    resetForm()
    setGuardando(false)
  }

  async function marcarComprado(item) {
    const nuevo = !item.comprado
    setItems(prev => prev.map(i => (
      i.id === item.id ? { ...i, comprado: nuevo, comprado_en: nuevo ? new Date().toISOString().split('T')[0] : null } : i
    )).sort((a, b) => a.comprado - b.comprado))

    await supabase
      .from('wishlist_items')
      .update({ comprado: nuevo, comprado_en: nuevo ? new Date().toISOString().split('T')[0] : null })
      .eq('id', item.id)
  }

  async function eliminarItem(itemId) {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await supabase.from('wishlist_items').delete().eq('id', itemId)
  }

  async function toggleArchivada() {
    if (!lista?.id) return
    const nuevo = !lista.archivada
    setLista(prev => ({ ...prev, archivada: nuevo }))
    await supabase.from('wishlists').update({ archivada: nuevo }).eq('id', lista.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  const pendientes = items.filter(i => !i.comprado)
  const comprados = items.filter(i => i.comprado)

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/wishlist')}
              className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#2D2926] truncate">{lista.titulo}</h1>
              <p className="text-xs text-[#8C7E75]">
                {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {comprados.length} comprado{comprados.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleArchivada}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                lista.archivada
                  ? 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
                  : 'bg-[#F0F5F0] text-[#8BAF8D] border-[#8BAF8D]/20'
              }`}
            >
              {lista.archivada ? 'Archivada' : 'Archivar'}
            </button>
            <button
              onClick={() => { setMostrarForm(true); setTimeout(() => nombreRef.current?.focus(), 0) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4845A] text-white text-sm font-medium"
            >
              <Plus size={16} strokeWidth={2.5} /> Agregar
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">
        {/* Estado vacío */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-5xl mb-3">🛒</p>
            <p className="text-sm font-medium text-[#2D2926]">Wishlist vacía por ahora</p>
            <p className="text-xs text-[#8C7E75] mt-1">Agrega productos con link o una nota rápida</p>
            <button
              onClick={() => { setMostrarForm(true); setTimeout(() => nombreRef.current?.focus(), 0) }}
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
            {pendientes.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onToggle={() => marcarComprado(item)}
                onDelete={() => eliminarItem(item.id)}
              />
            ))}
          </>
        )}

        {/* Comprados */}
        {comprados.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wide px-1 mt-2">
              Comprado · {comprados.length}
            </p>
            {comprados.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                comprado
                onToggle={() => marcarComprado(item)}
                onDelete={() => eliminarItem(item.id)}
              />
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
              <p className="text-base font-bold text-[#2D2926]">Nuevo ítem</p>
              <button onClick={resetForm} className="p-1.5 rounded-xl text-[#8C7E75]">
                <X size={18} />
              </button>
            </div>

            {errorGuardar && (
              <p className="text-xs text-[#C0614A] bg-[#FFF0EE] border border-[#C0614A]/20 rounded-lg px-3 py-2">
                {errorGuardar}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2D2926]">Producto</label>
              <input
                ref={nombreRef}
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
                maxLength={160}
                className="px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm placeholder-[#8C7E75] focus:outline-none focus:border-[#D4845A]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2D2926]">
                Link <span className="text-[#8C7E75] font-normal">(opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] flex-1">
                  <LinkIcon size={16} className="text-[#8C7E75]" />
                  <input
                    type="url"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="amazon.com/..."
                    maxLength={400}
                    className="bg-transparent text-[#2D2926] text-sm placeholder-[#8C7E75] focus:outline-none w-full"
                  />
                </div>
              </div>
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
                    type="button"
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
              {guardando ? 'Guardando...' : 'Agregar a la wishlist'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function ItemCard({ item, comprado, onToggle, onDelete }) {
  const [mostrarLink, setMostrarLink] = useState(false)
  const [mostrarAcciones, setMostrarAcciones] = useState(false)
  const p = getPrioridad(item.prioridad)

  const link = item.link && typeof item.link === 'string' ? item.link.trim() : ''
  const showLink = Boolean(link)

  return (
    <div className={`bg-white rounded-2xl border border-[#EDE8E3] p-4 ${comprado ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            comprado ? 'bg-[#8BAF8D] border-[#8BAF8D]' : 'border-[#EDE8E3] hover:border-[#8BAF8D]'
          }`}
        >
          {comprado && <Check size={13} strokeWidth={3} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold text-[#2D2926] ${comprado ? 'line-through' : ''}`}>{item.nombre}</p>
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
            {showLink && (
              <button
                type="button"
                onClick={() => setMostrarLink(v => !v)}
                className="text-xs text-[#8C7E75] underline underline-offset-2"
              >
                {mostrarLink ? 'Ocultar link' : 'Ver link'}
              </button>
            )}
          </div>

          {showLink && mostrarLink && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#2D2926] bg-[#FAF7F4] border border-[#EDE8E3] px-3 py-2 rounded-xl max-w-full"
            >
              <LinkIcon size={14} className="text-[#8C7E75]" />
              <span className="truncate">{link}</span>
            </a>
          )}
        </div>

        <button
          onClick={() => setMostrarAcciones(v => !v)}
          className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors flex-shrink-0"
          aria-label="Opciones"
        >
          <ChevronDown size={14} className={`transition-transform ${mostrarAcciones ? 'rotate-180' : ''}`} />
        </button>

        {mostrarAcciones && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FDF0EE] hover:text-[#C0614A] transition-colors flex-shrink-0"
            aria-label="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

