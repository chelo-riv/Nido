import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Clock, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS_RECETA } from '../lib/categoriasReceta'
import BottomNav from '../components/BottomNav'

export default function Recetas() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recetas,  setRecetas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('todas')

  useEffect(() => {
    if (user) cargarRecetas()
  }, [user])

  async function cargarRecetas() {
    const { data } = await supabase
      .from('recetas')
      .select('*')
      .order('created_at', { ascending: false })
    setRecetas(data ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-3xl animate-pulse">👨‍🍳</span>
      </div>
    )
  }

  const filtradas = filtro === 'todas'
    ? recetas
    : recetas.filter(r => r.categoria === filtro)

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/hogar')}
              className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#2D2926]">Recetas del hogar</h1>
              <p className="text-xs text-[#8C7E75]">{recetas.length} receta{recetas.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/nueva-receta')}
            className="flex items-center gap-1.5 bg-[#D4845A] text-white text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva
          </button>
        </div>

        {/* Filtro por categoría */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <FiltroBtn activo={filtro === 'todas'} onClick={() => setFiltro('todas')} label="Todas" />
          {Object.entries(CATEGORIAS_RECETA).map(([key, { label, emoji }]) => (
            <FiltroBtn
              key={key}
              activo={filtro === key}
              onClick={() => setFiltro(key)}
              label={`${emoji} ${label}`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pt-5">
        {filtradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-8 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">👨‍🍳</span>
            <p className="text-sm font-semibold text-[#2D2926]">
              {filtro === 'todas' ? 'Sin recetas todavía' : `Sin recetas de ${CATEGORIAS_RECETA[filtro]?.label}`}
            </p>
            <p className="text-xs text-[#8C7E75] leading-relaxed max-w-xs">
              Guarda tus recetas favoritas del hogar para tenerlas siempre a mano
            </p>
            {filtro === 'todas' && (
              <button
                onClick={() => navigate('/nueva-receta')}
                className="mt-1 bg-[#D4845A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                Agregar receta
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtradas.map(receta => (
              <RecetaCard
                key={receta.id}
                receta={receta}
                onClick={() => navigate(`/recetas/${receta.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function FiltroBtn({ activo, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
        activo
          ? 'bg-[#D4845A] text-white'
          : 'bg-[#FAF7F4] text-[#8C7E75] border border-[#EDE8E3]'
      }`}
    >
      {label}
    </button>
  )
}

function RecetaCard({ receta, onClick }) {
  const cat = CATEGORIAS_RECETA[receta.categoria] ?? CATEGORIAS_RECETA.comida
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden text-left active:opacity-80 transition-opacity"
    >
      {/* Cabecera con emoji */}
      <div className={`${cat.color} h-24 flex items-center justify-center`}>
        <span className="text-4xl">{cat.emoji}</span>
      </div>
      {/* Información */}
      <div className="p-3">
        <p className="text-sm font-semibold text-[#2D2926] leading-tight line-clamp-2">{receta.nombre}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {receta.tiempo_prep && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#8C7E75]">
              <Clock size={9} /> {receta.tiempo_prep} min
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-[#8C7E75]">
            <Users size={9} /> {receta.porciones}
          </span>
        </div>
        <span className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF7F4] text-[#8C7E75]">
          {cat.label}
        </span>
      </div>
    </button>
  )
}
