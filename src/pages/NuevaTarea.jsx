import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const PRIORIDADES = [
  { key: 'alta',  label: '🔴 Alta'   },
  { key: 'media', label: '🟡 Media'  },
  { key: 'baja',  label: '🟢 Baja'   },
]

const RECURRENCIAS = [
  { key: 'ninguna',  label: 'No repite' },
  { key: 'diaria',   label: 'Diaria'    },
  { key: 'semanal',  label: 'Semanal'   },
  { key: 'mensual',  label: 'Mensual'   },
]

export default function NuevaTarea() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [perfiles,    setPerfiles]    = useState([])
  const [titulo,      setTitulo]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [asignadoA,   setAsignadoA]   = useState(user?.id ?? null)
  const [fechaLimite, setFechaLimite] = useState('')
  const [prioridad,   setPrioridad]   = useState('media')
  const [recurrencia, setRecurrencia] = useState('ninguna')
  const [guardando,   setGuardando]   = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (user) cargarPerfiles()
  }, [user])

  async function cargarPerfiles() {
    const { data } = await supabase.from('perfiles').select('*')
    setPerfiles(data ?? [])
    // Default asignar a mí mismo
    setAsignadoA(user.id)
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setGuardando(true)
    setError('')

    const { error: err } = await supabase.from('tareas').insert({
      titulo:      titulo.trim(),
      descripcion: descripcion.trim() || null,
      asignado_a:  asignadoA,
      fecha_limite: fechaLimite || null,
      prioridad,
      recurrencia,
      completada:  false,
      creado_por:  user.id,
    })

    if (err) { setError('Error al guardar. Inténtalo de nuevo.'); setGuardando(false); return }
    navigate('/tareas')
  }

  const pareja = perfiles.find(p => p.id !== user?.id)
  const miNombre = perfiles.find(p => p.id === user?.id)?.nombre ?? 'Yo'

  const asignadoOpciones = [
    { id: user?.id,  label: miNombre },
    { id: pareja?.id ?? null, label: pareja?.nombre ?? 'Pareja', disabled: !pareja },
    { id: null,      label: 'Cualquiera' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-10">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/tareas')}
          className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-[#2D2926]">Nueva tarea</h1>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Título */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
            Tarea *
          </label>
          <input
            autoFocus
            type="text"
            value={titulo}
            onChange={e => { setTitulo(e.target.value); setError('') }}
            placeholder="¿Qué hay que hacer?"
            className="w-full bg-white border border-[#EDE8E3] rounded-xl px-4 py-3 text-sm text-[#2D2926] placeholder-[#8C7E75] outline-none focus:border-[#D4845A]"
          />
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
            Descripción <span className="normal-case font-normal opacity-60">(opcional)</span>
          </label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Más detalle sobre la tarea..."
            rows={3}
            className="w-full bg-white border border-[#EDE8E3] rounded-xl px-4 py-3 text-sm text-[#2D2926] placeholder-[#8C7E75] outline-none focus:border-[#D4845A] resize-none"
          />
        </div>

        {/* Para quién */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
            Para quién
          </label>
          <div className="flex gap-2">
            {asignadoOpciones.map(({ id, label, disabled }) => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setAsignadoA(id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border disabled:opacity-40 ${
                  asignadoA === id
                    ? 'bg-[#D4845A] text-white border-[#D4845A]'
                    : 'bg-white text-[#8C7E75] border-[#EDE8E3]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Prioridad */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
            Prioridad
          </label>
          <div className="flex gap-2">
            {PRIORIDADES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPrioridad(key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  prioridad === key
                    ? 'bg-[#D4845A] text-white border-[#D4845A]'
                    : 'bg-white text-[#8C7E75] border-[#EDE8E3]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha límite */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
            Fecha límite <span className="normal-case font-normal opacity-60">(opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaLimite}
              onChange={e => setFechaLimite(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 bg-white border border-[#EDE8E3] rounded-xl px-4 py-3 text-sm text-[#2D2926] outline-none focus:border-[#D4845A]"
            />
            {fechaLimite && (
              <button
                type="button"
                onClick={() => setFechaLimite('')}
                className="px-4 py-3 rounded-xl text-sm text-[#8C7E75] bg-white border border-[#EDE8E3]"
              >
                Quitar
              </button>
            )}
          </div>
        </div>

        {/* Recurrencia */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1">
            Repetir
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RECURRENCIAS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRecurrencia(key)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  recurrencia === key
                    ? 'bg-[#D4845A] text-white border-[#D4845A]'
                    : 'bg-white text-[#8C7E75] border-[#EDE8E3]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#FFF0EE] border border-[#F5C6BB] rounded-xl px-4 py-3">
            <p className="text-sm text-[#C0614A]">{error}</p>
          </div>
        )}

        {/* Guardar */}
        <button
          onClick={guardar}
          disabled={!titulo.trim() || guardando}
          className="w-full bg-[#D4845A] text-white font-semibold py-4 rounded-2xl text-sm disabled:opacity-50 transition-opacity mt-2"
        >
          {guardando ? 'Guardando...' : 'Guardar tarea'}
        </button>

      </div>
    </div>
  )
}
