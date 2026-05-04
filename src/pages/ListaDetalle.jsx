import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Check, Trash2, ChevronDown, ShoppingCart, PackageCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS_SUPER } from '../lib/categoriasSuper'
import BottomNav from '../components/BottomNav'

// Orden visual de las categorías en la lista
const ORDEN_CATS = [
  'frutas_verduras', 'lacteos', 'carnes', 'panaderia',
  'abarrotes', 'bebidas', 'limpieza', 'congelados', 'salud', 'otros',
]

export default function ListaDetalle() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [lista, setLista]           = useState(null)
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaCat, setNuevaCat]     = useState('otros')
  const [agregando, setAgregando]   = useState(false)
  const [modoCompra, setModoCompra] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    if (user && id) cargarDetalle()
  }, [user, id])

  async function cargarDetalle() {
    const [{ data: listaData }, { data: itemsData }] = await Promise.all([
      supabase.from('listas_super').select('*').eq('id', id).single(),
      supabase.from('items_lista').select('*').eq('lista_id', id).order('created_at'),
    ])
    if (!listaData) { navigate('/lista-super'); return }
    setLista(listaData)
    setItems(itemsData ?? [])
    setLoading(false)
  }

  async function agregarItem(e) {
    e?.preventDefault()
    if (!nuevoNombre.trim() || agregando || lista?.completada) return
    setAgregando(true)
    const { data, error } = await supabase
      .from('items_lista')
      .insert({ lista_id: id, nombre: nuevoNombre.trim(), categoria: nuevaCat, checked: false })
      .select()
      .single()
    if (!error && data) {
      setItems(prev => [...prev, data])
      setNuevoNombre('')
      inputRef.current?.focus()
    }
    setAgregando(false)
  }

  async function toggleItem(item) {
    const nuevoChecked = !item.checked
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, checked: nuevoChecked, checked_por: nuevoChecked ? user.id : null }
        : i
    ))
    await supabase
      .from('items_lista')
      .update({
        checked: nuevoChecked,
        checked_por: nuevoChecked ? user.id : null,
        checked_en: nuevoChecked ? new Date().toISOString() : null,
      })
      .eq('id', item.id)
  }

  async function eliminarItem(itemId) {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await supabase.from('items_lista').delete().eq('id', itemId)
  }

  async function completarLista() {
    await supabase
      .from('listas_super')
      .update({ completada: true, completada_en: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    navigate('/lista-super')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-3xl animate-pulse">🛒</span>
      </div>
    )
  }

  // Agrupar ítems por categoría en el orden definido
  const agrupados = ORDEN_CATS.reduce((acc, cat) => {
    const catItems = items.filter(i => (i.categoria || 'otros') === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  const totalItems    = items.length
  const checkedItems  = items.filter(i => i.checked).length
  const progreso      = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/lista-super')}
              className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#2D2926] truncate max-w-[180px]">{lista.nombre}</h1>
              <p className="text-xs text-[#8C7E75]">
                {lista.completada
                  ? `${totalItems} ítems · completada`
                  : `${checkedItems} de ${totalItems} ítems`
                }
              </p>
            </div>
          </div>

          {/* Modo compra toggle */}
          {!lista.completada && (
            <button
              onClick={() => setModoCompra(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
                modoCompra
                  ? 'bg-[#D4845A] text-white'
                  : 'bg-[#FAF7F4] text-[#8C7E75] border border-[#EDE8E3]'
              }`}
            >
              <ShoppingCart size={14} strokeWidth={2} />
              {modoCompra ? 'Comprando' : 'Ir a comprar'}
            </button>
          )}
        </div>

        {/* Barra de progreso */}
        {totalItems > 0 && (
          <div className="h-1.5 bg-[#EDE8E3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8BAF8D] rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* ── Agregar ítem ──────────────────────────────────────────────── */}
        {!lista.completada && (
          <form onSubmit={agregarItem} className="bg-white rounded-2xl border border-[#EDE8E3] p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Agregar ítem..."
                className="flex-1 bg-[#FAF7F4] border border-[#EDE8E3] rounded-xl px-3 py-2.5 text-sm text-[#2D2926] placeholder-[#8C7E75] outline-none focus:border-[#D4845A]"
              />
              <button
                type="submit"
                disabled={!nuevoNombre.trim() || agregando}
                className="bg-[#D4845A] text-white px-4 py-2.5 rounded-xl disabled:opacity-40 transition-opacity flex items-center"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Selector de categoría */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {ORDEN_CATS.map(cat => {
                const info = CATEGORIAS_SUPER[cat]
                const activo = nuevaCat === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNuevaCat(cat)}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      activo
                        ? 'bg-[#D4845A] text-white border-[#D4845A]'
                        : 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
                    }`}
                  >
                    <span>{info.emoji}</span>
                    <span className="font-medium">{info.label.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </form>
        )}

        {/* ── Lista de ítems agrupados ───────────────────────────────────── */}
        {totalItems === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-8 flex flex-col items-center gap-2 text-center">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-medium text-[#2D2926]">Lista vacía</p>
            <p className="text-xs text-[#8C7E75]">Agrega el primer ítem arriba</p>
          </div>
        ) : (
          Object.entries(agrupados).map(([cat, catItems]) => {
            const info = CATEGORIAS_SUPER[cat] ?? CATEGORIAS_SUPER.otros
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-[#8C7E75] px-1 mb-2 flex items-center gap-1.5">
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                  <span className="opacity-50">({catItems.length})</span>
                </p>
                <div className="flex flex-col gap-2">
                  {catItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      modoCompra={modoCompra}
                      listaCompletada={lista.completada}
                      onToggle={toggleItem}
                      onDelete={eliminarItem}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}

        {/* ── Completar lista ───────────────────────────────────────────── */}
        {!lista.completada && totalItems > 0 && (
          <div className="mt-2">
            {confirmando ? (
              <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-[#2D2926] text-center">
                  ¿Marcar lista como completada?
                </p>
                <p className="text-xs text-[#8C7E75] text-center">
                  Se moverá a "Completadas" y no podrás editarla
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmando(false)}
                    className="flex-1 bg-[#FAF7F4] text-[#8C7E75] font-medium py-2.5 rounded-xl text-sm border border-[#EDE8E3]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={completarLista}
                    className="flex-1 bg-[#8BAF8D] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck size={16} /> Completar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmando(true)}
                className="w-full bg-white border border-[#EDE8E3] text-[#8BAF8D] font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
              >
                <PackageCheck size={18} />
                Completar lista
              </button>
            )}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}

/* ─── Fila de ítem ───────────────────────────────────────────────────────── */
function ItemRow({ item, modoCompra, listaCompletada, onToggle, onDelete }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className={`bg-white rounded-xl border border-[#EDE8E3] overflow-hidden transition-opacity ${item.checked ? 'opacity-50' : ''}`}>
      <div className={`flex items-center gap-3 ${modoCompra ? 'px-4 py-4' : 'px-4 py-3'}`}>

        {/* Checkbox */}
        <button
          onClick={() => !listaCompletada && onToggle(item)}
          className={`flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
            modoCompra ? 'w-7 h-7' : 'w-5 h-5'
          } ${
            item.checked
              ? 'bg-[#8BAF8D] border-[#8BAF8D]'
              : 'border-[#D0C9C3] hover:border-[#D4845A]'
          }`}
        >
          {item.checked && <Check size={modoCompra ? 14 : 10} className="text-white" strokeWidth={3} />}
        </button>

        {/* Nombre */}
        <p className={`flex-1 text-sm font-medium ${item.checked ? 'line-through text-[#8C7E75]' : 'text-[#2D2926]'}`}>
          {item.nombre}
        </p>

        {/* Expandir (solo si no es modo compra ni completada) */}
        {!modoCompra && !listaCompletada && (
          <button
            onClick={() => setExpandido(v => !v)}
            className="p-1.5 rounded-lg text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Acción eliminar */}
      {expandido && !modoCompra && !listaCompletada && (
        <div className="border-t border-[#EDE8E3] px-4 py-2.5 flex justify-end">
          <button
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-1.5 text-[#C0614A] text-xs font-medium py-1 px-2 rounded-lg hover:bg-[#FFF0EE] transition-colors"
          >
            <Trash2 size={13} /> Eliminar ítem
          </button>
        </div>
      )}
    </div>
  )
}
