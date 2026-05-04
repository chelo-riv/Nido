import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS_RECETA } from '../lib/categoriasReceta'

export default function NuevaReceta() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [nombre,      setNombre]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria,   setCategoria]   = useState('comida')
  const [tiempoPrep,  setTiempoPrep]  = useState('')
  const [porciones,   setPorciones]   = useState('2')
  const [ingredientes, setIngredientes] = useState([{ nombre: '', cantidad: '' }])
  const [pasos,        setPasos]       = useState([{ descripcion: '' }])
  const [guardando,   setGuardando]   = useState(false)
  const [error,       setError]       = useState('')

  // ── Ingredientes ────────────────────────────────────────────────────────
  function updateIng(idx, campo, valor) {
    setIngredientes(prev => prev.map((ing, i) => i === idx ? { ...ing, [campo]: valor } : ing))
  }
  function addIng() {
    setIngredientes(prev => [...prev, { nombre: '', cantidad: '' }])
  }
  function removeIng(idx) {
    if (ingredientes.length === 1) return
    setIngredientes(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Pasos ────────────────────────────────────────────────────────────────
  function updatePaso(idx, valor) {
    setPasos(prev => prev.map((p, i) => i === idx ? { ...p, descripcion: valor } : p))
  }
  function addPaso() {
    setPasos(prev => [...prev, { descripcion: '' }])
  }
  function removePaso(idx) {
    if (pasos.length === 1) return
    setPasos(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Guardar ─────────────────────────────────────────────────────────────
  async function guardar() {
    if (!nombre.trim()) { setError('El nombre de la receta es obligatorio'); return }
    setGuardando(true)
    setError('')

    // 1. Insertar receta
    const { data: receta, error: errReceta } = await supabase
      .from('recetas')
      .insert({
        nombre:      nombre.trim(),
        descripcion: descripcion.trim() || null,
        tiempo_prep: tiempoPrep ? parseInt(tiempoPrep) : null,
        porciones:   parseInt(porciones) || 2,
        categoria,
        creado_por:  user.id,
      })
      .select()
      .single()

    if (errReceta) { setError('Error al guardar la receta'); setGuardando(false); return }

    // 2. Insertar ingredientes (solo los que tengan nombre)
    const ingsValidos = ingredientes.filter(i => i.nombre.trim())
    if (ingsValidos.length > 0) {
      await supabase.from('ingredientes_receta').insert(
        ingsValidos.map(i => ({
          receta_id: receta.id,
          nombre:    i.nombre.trim(),
          cantidad:  i.cantidad.trim() || null,
        }))
      )
    }

    // 3. Insertar pasos (solo los que tengan descripción)
    const pasosValidos = pasos.filter(p => p.descripcion.trim())
    if (pasosValidos.length > 0) {
      await supabase.from('pasos_receta').insert(
        pasosValidos.map((p, idx) => ({
          receta_id:   receta.id,
          orden:        idx + 1,
          descripcion: p.descripcion.trim(),
        }))
      )
    }

    navigate(`/recetas/${receta.id}`)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-10">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/recetas')}
          className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-[#2D2926]">Nueva receta</h1>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-6">

        {/* ── Info básica ─────────────────────────────────────────────── */}
        <Section label="Información">
          <input
            autoFocus
            type="text"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setError('') }}
            placeholder="Nombre de la receta *"
            className="input-base"
          />
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción breve (opcional)"
            rows={2}
            className="input-base resize-none"
          />

          {/* Categoría */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {Object.entries(CATEGORIAS_RECETA).map(([key, { label, emoji }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoria(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-colors ${
                  categoria === key
                    ? 'bg-[#D4845A] text-white border-[#D4845A]'
                    : 'bg-white text-[#8C7E75] border-[#EDE8E3]'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Tiempo y porciones */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-[#8C7E75] uppercase tracking-wider block mb-1.5 px-1">
                Tiempo (min)
              </label>
              <input
                type="number"
                value={tiempoPrep}
                onChange={e => setTiempoPrep(e.target.value)}
                placeholder="30"
                min="1"
                className="input-base"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-[#8C7E75] uppercase tracking-wider block mb-1.5 px-1">
                Porciones
              </label>
              <input
                type="number"
                value={porciones}
                onChange={e => setPorciones(e.target.value)}
                placeholder="2"
                min="1"
                className="input-base"
              />
            </div>
          </div>
        </Section>

        {/* ── Ingredientes ────────────────────────────────────────────── */}
        <Section label="Ingredientes" hint="opcional">
          {ingredientes.map((ing, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={ing.nombre}
                onChange={e => updateIng(idx, 'nombre', e.target.value)}
                placeholder={`Ingrediente ${idx + 1}`}
                className="input-base flex-1"
              />
              <input
                type="text"
                value={ing.cantidad}
                onChange={e => updateIng(idx, 'cantidad', e.target.value)}
                placeholder="Cantidad"
                className="input-base w-24"
              />
              {ingredientes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIng(idx)}
                  className="p-2.5 rounded-xl text-[#8C7E75] bg-white border border-[#EDE8E3] flex-shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addIng}
            className="flex items-center gap-2 text-sm text-[#D4845A] font-medium py-1"
          >
            <Plus size={16} strokeWidth={2.5} /> Agregar ingrediente
          </button>
        </Section>

        {/* ── Pasos ───────────────────────────────────────────────────── */}
        <Section label="Preparación" hint="opcional">
          {pasos.map((paso, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-[#D4845A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2.5">
                {idx + 1}
              </div>
              <textarea
                value={paso.descripcion}
                onChange={e => updatePaso(idx, e.target.value)}
                placeholder={`Paso ${idx + 1}...`}
                rows={2}
                className="input-base flex-1 resize-none"
              />
              {pasos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePaso(idx)}
                  className="p-2.5 rounded-xl text-[#8C7E75] bg-white border border-[#EDE8E3] flex-shrink-0 mt-1.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPaso}
            className="flex items-center gap-2 text-sm text-[#D4845A] font-medium py-1"
          >
            <Plus size={16} strokeWidth={2.5} /> Agregar paso
          </button>
        </Section>

        {/* Error */}
        {error && (
          <div className="bg-[#FFF0EE] border border-[#F5C6BB] rounded-xl px-4 py-3">
            <p className="text-sm text-[#C0614A]">{error}</p>
          </div>
        )}

        {/* Guardar */}
        <button
          onClick={guardar}
          disabled={!nombre.trim() || guardando}
          className="w-full bg-[#D4845A] text-white font-semibold py-4 rounded-2xl text-sm disabled:opacity-50 transition-opacity"
        >
          {guardando ? 'Guardando...' : 'Guardar receta'}
        </button>

      </div>
    </div>
  )
}

// ── Componentes de apoyo ──────────────────────────────────────────────────────
function Section({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-[#8C7E75] uppercase tracking-wider px-1 flex items-center gap-1.5">
        {label}
        {hint && <span className="normal-case font-normal opacity-60">({hint})</span>}
      </p>
      {children}
    </div>
  )
}
