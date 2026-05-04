import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Check, Trash2, ChevronDown, RotateCcw, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'

// ── Helpers ──────────────────────────────────────────────────────────────────
function hoyStr() {
  return new Date().toISOString().split('T')[0]
}

function enDiasStr(dias) {
  return new Date(Date.now() + dias * 86400000).toISOString().split('T')[0]
}

function formatFecha(fechaStr) {
  const hoy  = hoyStr()
  const man  = enDiasStr(1)
  if (fechaStr === hoy) return 'Hoy'
  if (fechaStr === man) return 'Mañana'
  return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function siguienteFecha(fechaStr, recurrencia) {
  const base = fechaStr ? new Date(fechaStr + 'T12:00:00') : null
  if (!base) return null
  if (recurrencia === 'diaria')   base.setDate(base.getDate() + 1)
  if (recurrencia === 'semanal')  base.setDate(base.getDate() + 7)
  if (recurrencia === 'mensual')  base.setMonth(base.getMonth() + 1)
  return base.toISOString().split('T')[0]
}

const PRIORIDAD = {
  alta:  { dot: 'bg-[#C0614A]', badge: 'bg-[#FFF0EE] text-[#C0614A]', label: 'Alta' },
  media: { dot: 'bg-[#C8A94A]', badge: 'bg-[#FDF6E3] text-[#C8A94A]', label: 'Media' },
  baja:  { dot: 'bg-[#8BAF8D]', badge: 'bg-[#EBF0EB] text-[#8BAF8D]', label: 'Baja' },
}

const RECURRENCIA_LABEL = {
  diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual',
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Tareas() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tareas,   setTareas]   = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('todas')
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false)

  useEffect(() => {
    if (user) cargarDatos()
  }, [user])

  async function cargarDatos() {
    const [{ data: tareasData }, { data: perfilesData }] = await Promise.all([
      supabase.from('tareas').select('*').order('fecha_limite', { ascending: true, nullsFirst: false }),
      supabase.from('perfiles').select('*'),
    ])
    setTareas(tareasData ?? [])
    setPerfiles(perfilesData ?? [])
    setLoading(false)
  }

  async function completarTarea(tarea) {
    // Optimistic update
    setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, completada: true, completada_en: new Date().toISOString() } : t))

    await supabase.from('tareas')
      .update({ completada: true, completada_en: new Date().toISOString() })
      .eq('id', tarea.id)

    // Si tiene recurrencia, generar la siguiente instancia
    if (tarea.recurrencia && tarea.recurrencia !== 'ninguna') {
      const nuevaFecha = siguienteFecha(tarea.fecha_limite, tarea.recurrencia)
      const { data: nueva } = await supabase.from('tareas')
        .insert({
          titulo:      tarea.titulo,
          descripcion: tarea.descripcion,
          asignado_a:  tarea.asignado_a,
          prioridad:   tarea.prioridad,
          recurrencia: tarea.recurrencia,
          fecha_limite: nuevaFecha,
          completada:  false,
          creado_por:  user.id,
        })
        .select()
        .single()
      if (nueva) {
        setTareas(prev => [nueva, ...prev])
      }
    }
  }

  async function eliminarTarea(id) {
    setTareas(prev => prev.filter(t => t.id !== id))
    await supabase.from('tareas').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-3xl animate-pulse">📋</span>
      </div>
    )
  }

  const pareja = perfiles.find(p => p.id !== user.id)
  const hoy    = hoyStr()
  const en7    = enDiasStr(7)

  // Filtrar pendientes según selector
  const pendientes = tareas.filter(t => !t.completada)
  const filtradas = filtro === 'yo'
    ? pendientes.filter(t => t.asignado_a === user.id || !t.asignado_a)
    : filtro === 'pareja'
      ? pendientes.filter(t => t.asignado_a === pareja?.id)
      : pendientes

  // Agrupar por fecha
  const grupos = {
    vencidas:  filtradas.filter(t => t.fecha_limite && t.fecha_limite < hoy),
    hoy:       filtradas.filter(t => t.fecha_limite === hoy),
    semana:    filtradas.filter(t => t.fecha_limite && t.fecha_limite > hoy && t.fecha_limite <= en7),
    despues:   filtradas.filter(t => t.fecha_limite && t.fecha_limite > en7),
    sinFecha:  filtradas.filter(t => !t.fecha_limite),
  }

  const completadas = tareas.filter(t => t.completada)
    .sort((a, b) => new Date(b.completada_en) - new Date(a.completada_en))

  const hayTareas = filtradas.length > 0

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
              <h1 className="text-lg font-bold text-[#2D2926]">Tareas del hogar</h1>
              <p className="text-xs text-[#8C7E75]">
                {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/nueva-tarea')}
            className="flex items-center gap-1.5 bg-[#D4845A] text-white text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva
          </button>
        </div>

        {/* Filtro por persona */}
        <div className="flex gap-2">
          {[
            { key: 'todas',  label: 'Todas' },
            { key: 'yo',     label: 'Yo' },
            { key: 'pareja', label: pareja?.nombre ?? 'Pareja' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                filtro === key
                  ? 'bg-[#D4845A] text-white'
                  : 'bg-[#FAF7F4] text-[#8C7E75] border border-[#EDE8E3]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Empty state */}
        {!hayTareas && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-8 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-sm font-semibold text-[#2D2926]">
              {filtro === 'todas' ? '¡Sin tareas pendientes!' : 'Sin tareas para esta persona'}
            </p>
            <p className="text-xs text-[#8C7E75] leading-relaxed max-w-xs">
              {filtro === 'todas'
                ? 'Agrega una nueva tarea para mantener el hogar en orden'
                : 'Todas las tareas están completadas o no hay asignadas'}
            </p>
            {filtro === 'todas' && (
              <button
                onClick={() => navigate('/nueva-tarea')}
                className="mt-1 bg-[#D4845A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                Nueva tarea
              </button>
            )}
          </div>
        )}

        {/* Vencidas */}
        {grupos.vencidas.length > 0 && (
          <GrupoTareas
            label="Vencidas"
            icono={<AlertCircle size={13} className="text-[#C0614A]" />}
            labelColor="text-[#C0614A]"
            tareas={grupos.vencidas}
            perfiles={perfiles}
            userId={user.id}
            onCompletar={completarTarea}
            onEliminar={eliminarTarea}
          />
        )}

        {/* Hoy */}
        {grupos.hoy.length > 0 && (
          <GrupoTareas
            label="Hoy"
            tareas={grupos.hoy}
            perfiles={perfiles}
            userId={user.id}
            onCompletar={completarTarea}
            onEliminar={eliminarTarea}
          />
        )}

        {/* Esta semana */}
        {grupos.semana.length > 0 && (
          <GrupoTareas
            label="Esta semana"
            tareas={grupos.semana}
            perfiles={perfiles}
            userId={user.id}
            onCompletar={completarTarea}
            onEliminar={eliminarTarea}
          />
        )}

        {/* Más adelante */}
        {grupos.despues.length > 0 && (
          <GrupoTareas
            label="Más adelante"
            tareas={grupos.despues}
            perfiles={perfiles}
            userId={user.id}
            onCompletar={completarTarea}
            onEliminar={eliminarTarea}
          />
        )}

        {/* Sin fecha */}
        {grupos.sinFecha.length > 0 && (
          <GrupoTareas
            label="Sin fecha"
            tareas={grupos.sinFecha}
            perfiles={perfiles}
            userId={user.id}
            onCompletar={completarTarea}
            onEliminar={eliminarTarea}
          />
        )}

        {/* Completadas */}
        {completadas.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMostrarCompletadas(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1 py-1 w-full"
            >
              <ChevronDown size={14} className={`transition-transform ${mostrarCompletadas ? 'rotate-180' : ''}`} />
              Completadas ({completadas.length})
            </button>
            {mostrarCompletadas && completadas.slice(0, 10).map(tarea => (
              <TareaCard
                key={tarea.id}
                tarea={tarea}
                perfiles={perfiles}
                userId={user.id}
                onCompletar={completarTarea}
                onEliminar={eliminarTarea}
              />
            ))}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}

// ── Grupo de tareas ───────────────────────────────────────────────────────────
function GrupoTareas({ label, icono, labelColor = 'text-[#8C7E75]', tareas, perfiles, userId, onCompletar, onEliminar }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={`text-xs font-semibold uppercase tracking-wider px-1 flex items-center gap-1.5 ${labelColor}`}>
        {icono}
        {label}
        <span className="opacity-50 normal-case tracking-normal font-normal">({tareas.length})</span>
      </p>
      {tareas.map(tarea => (
        <TareaCard
          key={tarea.id}
          tarea={tarea}
          perfiles={perfiles}
          userId={userId}
          onCompletar={onCompletar}
          onEliminar={onEliminar}
        />
      ))}
    </div>
  )
}

// ── Tarjeta de tarea ──────────────────────────────────────────────────────────
function TareaCard({ tarea, perfiles, userId, onCompletar, onEliminar }) {
  const [expandido, setExpandido] = useState(false)

  const asignado = tarea.asignado_a
    ? (perfiles.find(p => p.id === tarea.asignado_a)?.nombre ?? '?')
    : 'Cualquiera'

  const prio = PRIORIDAD[tarea.prioridad] ?? PRIORIDAD.media
  const recLabel = RECURRENCIA_LABEL[tarea.recurrencia]

  return (
    <div className={`bg-white rounded-xl border border-[#EDE8E3] overflow-hidden transition-opacity ${tarea.completada ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Punto de prioridad */}
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${prio.dot}`} />

        {/* Contenido */}
        <button className="flex-1 text-left min-w-0" onClick={() => setExpandido(v => !v)}>
          <p className={`text-sm font-medium leading-snug ${tarea.completada ? 'line-through text-[#8C7E75]' : 'text-[#2D2926]'}`}>
            {tarea.titulo}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-[#8C7E75]">{asignado}</span>
            {tarea.fecha_limite && !tarea.completada && (
              <span className="text-xs text-[#8C7E75]">· {formatFecha(tarea.fecha_limite)}</span>
            )}
            {recLabel && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#8BAF8D] bg-[#EBF0EB] px-1.5 py-0.5 rounded-full">
                <RotateCcw size={8} /> {recLabel}
              </span>
            )}
          </div>
        </button>

        {/* Botón completar */}
        {!tarea.completada ? (
          <button
            onClick={() => onCompletar(tarea)}
            className="w-6 h-6 rounded-full border-2 border-[#D0C9C3] hover:border-[#8BAF8D] hover:bg-[#EBF0EB] flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
          >
            <Check size={10} className="text-[#8BAF8D] opacity-0 hover:opacity-100" />
          </button>
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#8BAF8D] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={10} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Expandido: descripción + eliminar */}
      {expandido && (
        <div className="border-t border-[#EDE8E3] px-4 py-3 flex flex-col gap-2">
          {tarea.descripcion && (
            <p className="text-xs text-[#8C7E75] leading-relaxed">{tarea.descripcion}</p>
          )}
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${prio.badge}`}>
              Prioridad {prio.label}
            </span>
            <button
              onClick={() => onEliminar(tarea.id)}
              className="flex items-center gap-1.5 text-[#C0614A] text-xs font-medium py-1 px-2 rounded-lg hover:bg-[#FFF0EE] transition-colors"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
