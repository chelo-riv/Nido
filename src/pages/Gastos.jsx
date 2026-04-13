import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS, LISTA_CATEGORIAS } from '../lib/categorias'
import BottomNav from '../components/BottomNav'

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function formatFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default function Gastos() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [gastos, setGastos]           = useState([])
  const [perfiles, setPerfiles]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [gastoActivo, setGastoActivo] = useState(null) // id del gasto con opciones abiertas
  const [eliminando, setEliminando]   = useState(false)

  useEffect(() => {
    if (user) cargarDatos()
  }, [user])

  async function cargarDatos() {
    const [{ data: gastosData }, { data: perfilesData }] = await Promise.all([
      supabase.from('gastos').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('perfiles').select('*'),
    ])
    setGastos(gastosData ?? [])
    setPerfiles(perfilesData ?? [])
    setLoading(false)
  }

  async function eliminarGasto(id) {
    setEliminando(true)
    await supabase.from('gastos').delete().eq('id', id)
    setGastos(prev => prev.filter(g => g.id !== id))
    setGastoActivo(null)
    setEliminando(false)
  }

  function nombreUsuario(id) {
    const p = perfiles.find(p => p.id === id)
    if (!p) return '?'
    return id === user?.id ? `${p.nombre} (yo)` : p.nombre
  }

  const otroUsuario = perfiles.find(p => p.id !== user?.id)

  // Filtros
  const gastosFiltrados = gastos.filter(g => {
    if (filtroUsuario !== 'todos' && g.pagado_por !== filtroUsuario) return false
    if (filtroCategoria && g.categoria !== filtroCategoria) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-[#2D2926]">Gastos</h1>
          <button
            onClick={() => navigate('/agregar')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4845A] text-white text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo
          </button>
        </div>

        {/* Filtro por usuario */}
        <div className="flex gap-2 mb-3">
          {[
            { id: 'todos', label: 'Todos' },
            { id: user?.id, label: 'Yo' },
            ...(otroUsuario ? [{ id: otroUsuario.id, label: otroUsuario.nombre }] : []),
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFiltroUsuario(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filtroUsuario === id
                  ? 'bg-[#2D2926] text-white border-[#2D2926]'
                  : 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtro por categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFiltroCategoria('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filtroCategoria === ''
                ? 'bg-[#D4845A] text-white border-[#D4845A]'
                : 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
            }`}
          >
            Todas
          </button>
          {LISTA_CATEGORIAS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => setFiltroCategoria(filtroCategoria === value ? '' : value)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filtroCategoria === value
                  ? 'bg-[#D4845A] text-white border-[#D4845A]'
                  : 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 px-4 pt-4 flex flex-col gap-2">
        {gastosFiltrados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <p className="text-3xl mb-3">🌿</p>
            <p className="text-sm text-[#8C7E75]">Sin gastos con ese filtro</p>
          </div>
        ) : (
          gastosFiltrados.map(gasto => {
            const cat = CATEGORIAS[gasto.categoria] ?? CATEGORIAS.otros
            const abierto = gastoActivo === gasto.id
            const esMio = gasto.pagado_por === user?.id
            const esCompartido = gasto.tipo === 'compartido' || !gasto.tipo

            return (
              <div
                key={gasto.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  abierto ? 'border-[#D4845A]' : 'border-[#EDE8E3]'
                }`}
              >
                {/* Fila principal */}
                <button
                  onClick={() => setGastoActivo(abierto ? null : gasto.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7F4] flex items-center justify-center text-xl flex-shrink-0">
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D2926] truncate">
                      {gasto.descripcion || cat.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-[#8C7E75]">{nombreUsuario(gasto.pagado_por)}</span>
                      <span className="text-[10px] text-[#8C7E75]">·</span>
                      <span className="text-xs text-[#8C7E75]">{formatFecha(gasto.fecha)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        esCompartido
                          ? 'bg-[#F0F5F0] text-[#8BAF8D]'
                          : 'bg-[#FAF7F4] text-[#8C7E75]'
                      }`}>
                        {esCompartido
                          ? `${gasto.porcentaje_pagador ?? 50}/${100 - (gasto.porcentaje_pagador ?? 50)}`
                          : 'Personal'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#2D2926] flex-shrink-0">
                    {formatMonto(gasto.monto)}
                  </p>
                </button>

                {/* Acciones */}
                {abierto && (
                  <div className="flex border-t border-[#EDE8E3]">
                    <button
                      onClick={() => navigate(`/editar/${gasto.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#2D2926] hover:bg-[#FAF7F4] transition-colors"
                    >
                      <Pencil size={15} /> Editar
                    </button>
                    <div className="w-px bg-[#EDE8E3]" />
                    <button
                      onClick={() => eliminarGasto(gasto.id)}
                      disabled={eliminando}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#C0614A] hover:bg-[#FDF0EE] transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={15} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
