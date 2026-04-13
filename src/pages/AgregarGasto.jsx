import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LISTA_CATEGORIAS } from '../lib/categorias'
import BottomNav from '../components/BottomNav'

const PRESETS = [
  { label: '50 / 50', valor: 50 },
  { label: '60 / 40', valor: 60 },
  { label: '70 / 30', valor: 70 },
  { label: '30 / 70', valor: 30 },
]

function hoy() {
  return new Date().toISOString().split('T')[0]
}

export default function AgregarGasto() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [monto, setMonto]               = useState('')
  const [descripcion, setDescripcion]   = useState('')
  const [categoria, setCategoria]       = useState('')
  const [pagadoPor, setPagadoPor]       = useState('')
  const [fecha, setFecha]               = useState(hoy())
  const [tipo, setTipo]                 = useState('compartido')
  const [porcentaje, setPorcentaje]     = useState(50)
  const [porcentajeCustom, setPorcentajeCustom] = useState('')
  const [modoCustom, setModoCustom]     = useState(false)
  const [perfiles, setPerfiles]         = useState([])
  const [guardando, setGuardando]       = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    if (user) {
      setPagadoPor(user.id)
      cargarPerfiles()
    }
  }, [user])

  async function cargarPerfiles() {
    const { data } = await supabase.from('perfiles').select('*')
    setPerfiles(data ?? [])
  }

  function handleMonto(e) {
    const val = e.target.value.replace(/[^0-9.]/g, '')
    const partes = val.split('.')
    if (partes.length > 2) return
    if (partes[1]?.length > 2) return
    setMonto(val)
  }

  function seleccionarPreset(valor) {
    setPorcentaje(valor)
    setModoCustom(false)
    setPorcentajeCustom('')
  }

  function handleCustom(e) {
    const val = e.target.value.replace(/[^0-9]/g, '')
    if (Number(val) > 100) return
    setPorcentajeCustom(val)
    if (val) setPorcentaje(Number(val))
  }

  async function guardar() {
    if (!monto || Number(monto) <= 0) { setError('Ingresa un monto válido'); return }
    if (!categoria) { setError('Selecciona una categoría'); return }
    if (tipo === 'compartido' && modoCustom && !porcentajeCustom) {
      setError('Ingresa el porcentaje del pagador'); return
    }

    setGuardando(true)
    setError('')

    const { error } = await supabase.from('gastos').insert({
      monto: Number(monto),
      descripcion: descripcion.trim() || null,
      categoria,
      pagado_por: pagadoPor,
      fecha,
      tipo,
      porcentaje_pagador: tipo === 'personal' ? 100 : porcentaje,
    })

    if (error) {
      setError('Ocurrió un error al guardar. Intenta de nuevo.')
      setGuardando(false)
    } else {
      navigate('/dashboard')
    }
  }

  const montoFormateado = monto
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(monto))
    : '$0'

  const otrosPorcentaje = 100 - porcentaje

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-4 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-[#2D2926]">Agregar gasto</h1>
      </div>

      <div className="flex-1 px-4 pt-6 flex flex-col gap-5">

        {/* Monto */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-5 text-center">
          <p className="text-xs text-[#8C7E75] mb-2 uppercase tracking-wide">¿Cuánto fue?</p>
          <div className="text-4xl font-bold text-[#2D2926] mb-3 min-h-[48px]">
            {montoFormateado}
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={monto}
            onChange={handleMonto}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-center text-[#2D2926] text-lg font-semibold focus:outline-none focus:border-[#D4845A] transition-colors"
          />
        </div>

        {/* Tipo de gasto */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <p className="text-sm font-semibold text-[#2D2926] mb-3">Tipo de gasto</p>
          <div className="flex gap-2">
            <button
              onClick={() => setTipo('compartido')}
              className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-all ${
                tipo === 'compartido'
                  ? 'border-[#D4845A] bg-[#FDF4EF] text-[#D4845A]'
                  : 'border-[#EDE8E3] bg-[#FAF7F4] text-[#8C7E75]'
              }`}
            >
              🤝 Compartido
            </button>
            <button
              onClick={() => setTipo('personal')}
              className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-all ${
                tipo === 'personal'
                  ? 'border-[#D4845A] bg-[#FDF4EF] text-[#D4845A]'
                  : 'border-[#EDE8E3] bg-[#FAF7F4] text-[#8C7E75]'
              }`}
            >
              👤 Personal
            </button>
          </div>
          {tipo === 'personal' && (
            <p className="text-xs text-[#8C7E75] mt-2 text-center">
              Este gasto no genera deuda — solo queda registrado
            </p>
          )}
        </div>

        {/* División (solo si es compartido) */}
        {tipo === 'compartido' && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-1">¿Cómo se divide?</p>
            <p className="text-xs text-[#8C7E75] mb-3">
              Pagador / El otro — ¿qué % absorbe cada uno?
            </p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESETS.map(({ label, valor }) => (
                <button
                  key={valor}
                  onClick={() => seleccionarPreset(valor)}
                  className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    !modoCustom && porcentaje === valor
                      ? 'border-[#D4845A] bg-[#FDF4EF] text-[#D4845A]'
                      : 'border-[#EDE8E3] bg-[#FAF7F4] text-[#8C7E75]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setModoCustom(true); setPorcentajeCustom('') }}
              className={`w-full py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                modoCustom
                  ? 'border-[#D4845A] bg-[#FDF4EF] text-[#D4845A]'
                  : 'border-[#EDE8E3] bg-[#FAF7F4] text-[#8C7E75]'
              }`}
            >
              Personalizado
            </button>
            {modoCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={porcentajeCustom}
                  onChange={handleCustom}
                  placeholder="Ej: 45"
                  min="1"
                  max="99"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-sm text-center text-[#2D2926] focus:outline-none focus:border-[#D4845A]"
                />
                <span className="text-sm text-[#8C7E75]">% pagador /</span>
                <span className="text-sm font-semibold text-[#2D2926] w-10 text-center">
                  {porcentajeCustom ? 100 - Number(porcentajeCustom) : '—'}%
                </span>
              </div>
            )}
            {!modoCustom && (
              <div className="mt-3 bg-[#FAF7F4] rounded-xl px-4 py-2 flex justify-between">
                <span className="text-xs text-[#8C7E75]">Pagador paga</span>
                <span className="text-xs font-bold text-[#2D2926]">{porcentaje}%</span>
                <span className="text-xs text-[#8C7E75]">El otro paga</span>
                <span className="text-xs font-bold text-[#2D2926]">{otrosPorcentaje}%</span>
              </div>
            )}
          </div>
        )}

        {/* Categoría */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <p className="text-sm font-semibold text-[#2D2926] mb-3">Categoría</p>
          <div className="grid grid-cols-4 gap-2">
            {LISTA_CATEGORIAS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setCategoria(value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  categoria === value
                    ? 'border-[#D4845A] bg-[#FDF4EF]'
                    : 'border-[#EDE8E3] bg-[#FAF7F4]'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className={`text-[10px] font-medium leading-tight text-center ${
                  categoria === value ? 'text-[#D4845A]' : 'text-[#8C7E75]'
                }`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quién pagó */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <p className="text-sm font-semibold text-[#2D2926] mb-3">¿Quién pagó?</p>
          <div className="flex gap-2">
            {perfiles.length === 0 ? (
              <div className="flex-1 py-3 rounded-xl bg-[#FAF7F4] text-center text-sm text-[#8C7E75]">
                Cargando...
              </div>
            ) : (
              perfiles.map(perfil => (
                <button
                  key={perfil.id}
                  onClick={() => setPagadoPor(perfil.id)}
                  className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-all ${
                    pagadoPor === perfil.id
                      ? 'border-[#D4845A] bg-[#FDF4EF] text-[#D4845A]'
                      : 'border-[#EDE8E3] bg-[#FAF7F4] text-[#8C7E75]'
                  }`}
                >
                  {perfil.id === user?.id ? `${perfil.nombre} (yo)` : perfil.nombre}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <p className="text-sm font-semibold text-[#2D2926] mb-2">
            Descripción <span className="text-[#8C7E75] font-normal">(opcional)</span>
          </p>
          <input
            type="text"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: Cena del sábado"
            maxLength={80}
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm placeholder-[#8C7E75] focus:outline-none focus:border-[#D4845A] transition-colors"
          />
        </div>

        {/* Fecha */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <p className="text-sm font-semibold text-[#2D2926] mb-2">Fecha</p>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm focus:outline-none focus:border-[#D4845A] transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#FDF0EE] border border-[#C0614A]/20">
            <p className="text-sm text-[#C0614A]">{error}</p>
          </div>
        )}

        {/* Botón guardar */}
        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full py-4 rounded-2xl bg-[#D4845A] text-white font-bold text-base disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {guardando ? 'Guardando...' : (
            <><Check size={18} strokeWidth={2.5} /> Guardar gasto</>
          )}
        </button>

      </div>

      <BottomNav />
    </div>
  )
}
