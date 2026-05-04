import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Clock, Users, ChevronDown, Trash2, X, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS_RECETA } from '../lib/categoriasReceta'
import BottomNav from '../components/BottomNav'

export default function RecetaDetalle() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [receta,       setReceta]       = useState(null)
  const [ingredientes, setIngredientes] = useState([])
  const [pasos,        setPasos]        = useState([])
  const [listas,       setListas]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [mostrarSuper, setMostrarSuper] = useState(false)
  const [agregando,    setAgregando]    = useState(false)
  const [mostrarElim,  setMostrarElim]  = useState(false)

  useEffect(() => {
    if (user && id) cargarDatos()
  }, [user, id])

  async function cargarDatos() {
    const [
      { data: recetaData },
      { data: ingsData },
      { data: pasosData },
      { data: listasData },
    ] = await Promise.all([
      supabase.from('recetas').select('*').eq('id', id).single(),
      supabase.from('ingredientes_receta').select('*').eq('receta_id', id).order('created_at'),
      supabase.from('pasos_receta').select('*').eq('receta_id', id).order('orden'),
      supabase.from('listas_super').select('*, items_lista(id)').eq('completada', false).order('created_at', { ascending: false }),
    ])
    if (!recetaData) { navigate('/recetas'); return }
    setReceta(recetaData)
    setIngredientes(ingsData ?? [])
    setPasos(pasosData ?? [])
    setListas(listasData ?? [])
    setLoading(false)
  }

  async function agregarAlSuper(listaId) {
    if (ingredientes.length === 0 || agregando) return
    setAgregando(true)
    await supabase.from('items_lista').insert(
      ingredientes.map(ing => ({
        lista_id: listaId,
        nombre:   ing.cantidad ? `${ing.nombre} (${ing.cantidad})` : ing.nombre,
        categoria: 'otros',
        checked:   false,
      }))
    )
    setAgregando(false)
    setMostrarSuper(false)
    navigate(`/lista-super/${listaId}`)
  }

  async function eliminarReceta() {
    await supabase.from('recetas').delete().eq('id', id)
    navigate('/recetas')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-3xl animate-pulse">👨‍🍳</span>
      </div>
    )
  }

  const cat = CATEGORIAS_RECETA[receta.categoria] ?? CATEGORIAS_RECETA.comida

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24">

      {/* Hero con emoji de categoría */}
      <div className={`${cat.color} px-5 pt-12 pb-6 relative`}>
        <button
          onClick={() => navigate('/recetas')}
          className="absolute top-12 left-5 p-2 bg-white/70 rounded-xl text-[#2D2926] backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center pt-4 gap-2">
          <span className="text-6xl">{cat.emoji}</span>
          <span className="text-xs font-medium text-[#8C7E75] bg-white/70 px-3 py-1 rounded-full">
            {cat.label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Título e info */}
        <div>
          <h1 className="text-xl font-bold text-[#2D2926] leading-tight">{receta.nombre}</h1>
          <div className="flex items-center gap-3 mt-2">
            {receta.tiempo_prep && (
              <span className="flex items-center gap-1 text-xs text-[#8C7E75] bg-white border border-[#EDE8E3] px-2.5 py-1 rounded-full">
                <Clock size={12} /> {receta.tiempo_prep} min
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-[#8C7E75] bg-white border border-[#EDE8E3] px-2.5 py-1 rounded-full">
              <Users size={12} /> {receta.porciones} porciones
            </span>
          </div>
          {receta.descripcion && (
            <p className="text-sm text-[#8C7E75] mt-3 leading-relaxed">{receta.descripcion}</p>
          )}
        </div>

        {/* Ingredientes */}
        {ingredientes.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#2D2926]">
                Ingredientes <span className="text-[#8C7E75] font-normal">({ingredientes.length})</span>
              </p>
              <button
                onClick={() => setMostrarSuper(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8BAF8D] bg-[#EBF0EB] px-3 py-1.5 rounded-full"
              >
                <ShoppingCart size={12} /> Agregar al súper
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {ingredientes.map(ing => (
                <div key={ing.id} className="flex items-center gap-3 py-1.5 border-b border-[#FAF7F4] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4845A] flex-shrink-0" />
                  <span className="flex-1 text-sm text-[#2D2926]">{ing.nombre}</span>
                  {ing.cantidad && (
                    <span className="text-xs text-[#8C7E75] font-medium">{ing.cantidad}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pasos */}
        {pasos.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-3">Preparación</p>
            <div className="flex flex-col gap-4">
              {pasos.map(paso => (
                <div key={paso.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#D4845A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {paso.orden}
                  </div>
                  <p className="flex-1 text-sm text-[#2D2926] leading-relaxed pt-0.5">{paso.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eliminar receta */}
        <div>
          {mostrarElim ? (
            <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-[#2D2926] text-center">¿Eliminar esta receta?</p>
              <p className="text-xs text-[#8C7E75] text-center">Esta acción no se puede deshacer</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarElim(false)}
                  className="flex-1 bg-[#FAF7F4] text-[#8C7E75] font-medium py-2.5 rounded-xl text-sm border border-[#EDE8E3]"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarReceta}
                  className="flex-1 bg-[#FFF0EE] text-[#C0614A] font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setMostrarElim(true)}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-[#8C7E75] py-3"
            >
              <ChevronDown size={14} /> Eliminar receta
            </button>
          )}
        </div>

      </div>

      {/* Modal agregar al súper */}
      {mostrarSuper && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setMostrarSuper(false)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-base font-bold text-[#2D2926]">Agregar al súper</p>
                <p className="text-xs text-[#8C7E75] mt-0.5">
                  {ingredientes.length} ingrediente{ingredientes.length !== 1 ? 's' : ''} se agregarán a la lista
                </p>
              </div>
              <button
                onClick={() => setMostrarSuper(false)}
                className="p-1.5 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4]"
              >
                <X size={18} />
              </button>
            </div>

            {listas.length === 0 ? (
              <div className="py-4 text-center flex flex-col gap-2">
                <p className="text-sm text-[#8C7E75]">No hay listas activas del súper</p>
                <button
                  onClick={() => { setMostrarSuper(false); navigate('/lista-super?nueva=true') }}
                  className="text-sm font-semibold text-[#D4845A]"
                >
                  Crear una lista →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {listas.map(lista => (
                  <button
                    key={lista.id}
                    onClick={() => agregarAlSuper(lista.id)}
                    disabled={agregando}
                    className="flex items-center gap-3 bg-[#FAF7F4] rounded-xl p-3.5 text-left border border-[#EDE8E3] active:bg-[#F0EBE3] transition-colors disabled:opacity-50"
                  >
                    <div className="bg-[#EBF0EB] rounded-lg p-2 flex-shrink-0">
                      <ShoppingCart size={16} className="text-[#8BAF8D]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2D2926] truncate">{lista.nombre}</p>
                      <p className="text-xs text-[#8C7E75]">
                        {lista.items_lista?.length ?? 0} ítem{(lista.items_lista?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-[#8C7E75] flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
