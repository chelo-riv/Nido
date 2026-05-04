import { useState, useEffect } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS } from '../lib/categorias'
import BottomNav from '../components/BottomNav'

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Math.abs(n))
}

function formatFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

function nombreDelMes() {
  return new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function fechaLocalHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ymPantallaActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Balances() {
  const { user } = useAuth()

  const [gastos, setGastos]             = useState([])
  const [liquidaciones, setLiquidaciones] = useState([])
  const [perfiles, setPerfiles]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [mostrarLiquidar, setMostrarLiquidar] = useState(false)
  const [montoLiquidar, setMontoLiquidar] = useState('')
  // recibi = el otro me transfirió | pague = yo le transferí al otro
  const [direccionTransferencia, setDireccionTransferencia] = useState('recibi')
  const [fechaLiquidacion, setFechaLiquidacion] = useState(() => fechaLocalHoy())
  const [notaLiquidacion, setNotaLiquidacion] = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [mostrarDesglose, setMostrarDesglose] = useState(false)
  const [avisoExito, setAvisoExito]     = useState('')

  useEffect(() => {
    if (user) cargarDatos()
  }, [user])

  async function cargarDatos() {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

    const [{ data: gastosData }, { data: liquidacionesData }, { data: perfilesData }] = await Promise.all([
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('liquidaciones').select('*').gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: false }),
      supabase.from('perfiles').select('*'),
    ])

    setGastos(gastosData ?? [])
    setLiquidaciones(liquidacionesData ?? [])
    setPerfiles(perfilesData ?? [])
    setLoading(false)
  }

  async function liquidar() {
    if (!montoLiquidar || Number(montoLiquidar) <= 0 || !otroUsuario?.id) return
    if (!fechaLiquidacion || fechaLiquidacion.length < 10) return

    setGuardando(true)

    const pagadoPor = direccionTransferencia === 'recibi' ? otroUsuario.id : user.id
    const pagadoA   = direccionTransferencia === 'recibi' ? user.id : otroUsuario.id
    const nota = notaLiquidacion.trim() || null

    const payload = {
      monto: Number(montoLiquidar),
      pagado_por: pagadoPor,
      pagado_a: pagadoA,
      fecha: fechaLiquidacion,
    }
    if (nota) payload.nota = nota

    const { error } = await supabase.from('liquidaciones').insert(payload)

    if (!error) {
      const guardadoFueraDelMesVisible = fechaLiquidacion.slice(0, 7) !== ymPantallaActual()
      setMontoLiquidar('')
      setNotaLiquidacion('')
      setFechaLiquidacion(fechaLocalHoy())
      setMostrarLiquidar(false)
      setDireccionTransferencia('recibi')
      if (guardadoFueraDelMesVisible) {
        setAvisoExito('Pago guardado. La fecha es de otro mes: no aparecerá en la lista de este mes.')
        window.setTimeout(() => setAvisoExito(''), 7000)
      }
      await cargarDatos()
    }

    setGuardando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  const miPerfil    = perfiles.find(p => p.id === user.id)
  const otroUsuario = perfiles.find(p => p.id !== user.id)
  const miNombre    = miPerfil?.nombre ?? 'Yo'

  // Balance de gastos compartidos
  const compartidos = gastos.filter(g => g.tipo === 'compartido' || !g.tipo)

  const meDebenTotal = compartidos
    .filter(g => g.pagado_por === user.id)
    .reduce((a, g) => a + Number(g.monto) * (1 - (g.porcentaje_pagador ?? 50) / 100), 0)

  const deboTotal = compartidos
    .filter(g => g.pagado_por !== user.id)
    .reduce((a, g) => a + Number(g.monto) * (1 - (g.porcentaje_pagador ?? 50) / 100), 0)

  const balanceBruto = meDebenTotal - deboTotal

  // Ajuste por liquidaciones del mes
  const pagosRecibidos = liquidaciones
    .filter(l => l.pagado_a === user.id)
    .reduce((a, l) => a + Number(l.monto), 0)

  const pagosRealizados = liquidaciones
    .filter(l => l.pagado_por === user.id)
    .reduce((a, l) => a + Number(l.monto), 0)

  const balance = balanceBruto - pagosRecibidos + pagosRealizados

  function abrirLiquidarDesdeSaldo() {
    if (balance > 0) setDireccionTransferencia('recibi')
    else if (balance < 0) setDireccionTransferencia('pague')
    setMontoLiquidar(Math.abs(balance) > 0.5 ? String(Math.round(Math.abs(balance))) : '')
    setFechaLiquidacion(fechaLocalHoy())
    setNotaLiquidacion('')
    setMostrarLiquidar(true)
  }

  function abrirLiquidarManual() {
    setDireccionTransferencia('recibi')
    setMontoLiquidar('')
    setFechaLiquidacion(fechaLocalHoy())
    setNotaLiquidacion('')
    setMostrarLiquidar(true)
  }

  function cerrarFormLiquidar() {
    setMostrarLiquidar(false)
    setDireccionTransferencia('recibi')
    setFechaLiquidacion(fechaLocalHoy())
    setNotaLiquidacion('')
  }

  const hayBalance = Math.abs(balance) > 0.5
  const meDeben = balance > 0
  const nombreDeudor  = meDeben ? (otroUsuario?.nombre ?? 'Tu pareja') : miNombre
  const nombreAcreedor = meDeben ? miNombre : (otroUsuario?.nombre ?? 'Tu pareja')

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <p className="text-xs text-[#8C7E75] capitalize">{nombreDelMes()}</p>
        <h1 className="text-lg font-bold text-[#2D2926]">Balances</h1>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-4">
        {avisoExito && (
          <div className="rounded-xl border border-[#D4845A]/40 bg-[#FDF6F3] px-3 py-2 text-xs text-[#2D2926]">
            {avisoExito}
          </div>
        )}

        {/* Tarjeta de balance principal */}
        <div className={`rounded-2xl p-6 text-white ${meDeben ? 'bg-[#8BAF8D]' : 'bg-[#D4845A]'}`}>
          {!hayBalance ? (
            <div className="text-center py-2">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-xl font-bold">¡Están a mano!</p>
              <p className="text-sm opacity-80 mt-1">No hay deuda pendiente este mes</p>
              {otroUsuario && (
                <button
                  type="button"
                  onClick={abrirLiquidarManual}
                  className="mt-4 w-full py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-semibold backdrop-blur-sm active:scale-[0.98] transition-all"
                >
                  Anotar transferencia igualmente
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm opacity-80 mb-1">
                {nombreDeudor} {meDeben ? 'te debe' : `le debe a ${nombreAcreedor}`}
              </p>
              <p className="text-4xl font-bold mb-1">{formatMonto(balance)}</p>
              {balanceBruto !== balance && (
                <p className="text-xs opacity-70 mt-1">
                  Bruto {formatMonto(balanceBruto)} · Liquidado {formatMonto(pagosRecibidos + pagosRealizados)}
                </p>
              )}

              {/* Botón liquidar */}
              <button
                onClick={abrirLiquidarDesdeSaldo}
                className="mt-4 w-full py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-semibold backdrop-blur-sm active:scale-[0.98] transition-all"
              >
                Registrar pago
              </button>
            </>
          )}
        </div>

        {/* Formulario de liquidación */}
        {mostrarLiquidar && otroUsuario && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-2">¿Quién transfirió?</p>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDireccionTransferencia('recibi')}
                className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  direccionTransferencia === 'recibi'
                    ? 'bg-[#2D2926] text-white border-[#2D2926]'
                    : 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
                }`}
              >
                {otroUsuario.nombre} me pagó
              </button>
              <button
                type="button"
                onClick={() => setDireccionTransferencia('pague')}
                className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  direccionTransferencia === 'pague'
                    ? 'bg-[#2D2926] text-white border-[#2D2926]'
                    : 'bg-[#FAF7F4] text-[#8C7E75] border-[#EDE8E3]'
                }`}
              >
                Yo le pagué a {otroUsuario.nombre}
              </button>
            </div>

            <p className="text-sm font-semibold text-[#2D2926] mb-1">Cantidad</p>
            <p className="text-[11px] text-[#8C7E75] mb-2">
              Monto de la transferencia (puede ser parcial o distinto al saldo mostrado arriba).
            </p>
            {hayBalance && (
              <button
                type="button"
                onClick={() => setMontoLiquidar(String(Math.round(Math.abs(balance))))}
                className="mb-2 text-xs font-semibold text-[#D4845A]"
              >
                Usar saldo pendiente ({formatMonto(Math.abs(balance))})
              </button>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={montoLiquidar}
                onChange={e => setMontoLiquidar(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-lg font-bold text-center focus:outline-none focus:border-[#D4845A]"
              />
              <button
                type="button"
                onClick={liquidar}
                disabled={guardando}
                className="px-4 py-3 rounded-xl bg-[#D4845A] text-white font-semibold flex items-center gap-1.5 disabled:opacity-60"
              >
                <Check size={16} strokeWidth={2.5} />
                {guardando ? '...' : 'Guardar'}
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="fecha-liquidacion" className="text-sm font-semibold text-[#2D2926] block mb-1">
                Fecha del pago
              </label>
              <input
                id="fecha-liquidacion"
                type="date"
                value={fechaLiquidacion}
                onChange={e => setFechaLiquidacion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm focus:outline-none focus:border-[#D4845A]"
              />
              {fechaLiquidacion.slice(0, 7) !== ymPantallaActual() && (
                <p className="text-[11px] text-[#C0614A] mt-1.5">
                  Este mes no es el que estás viendo arriba: el pago contará solo en el mes de esa fecha.
                </p>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="nota-liquidacion" className="text-sm font-semibold text-[#2D2926] block mb-1">
                Nota <span className="font-normal text-[#8C7E75]">(opcional)</span>
              </label>
              <input
                id="nota-liquidacion"
                type="text"
                value={notaLiquidacion}
                onChange={e => setNotaLiquidacion(e.target.value)}
                placeholder="Ej. transfer SPEI, mitad del mes…"
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] text-sm focus:outline-none focus:border-[#D4845A]"
              />
            </div>

            <button
              type="button"
              onClick={cerrarFormLiquidar}
              className="mt-2 w-full text-xs text-[#8C7E75] py-1"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Desglose de gastos compartidos */}
        {compartidos.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden">
            <button
              onClick={() => setMostrarDesglose(!mostrarDesglose)}
              className="w-full flex items-center justify-between p-4"
            >
              <p className="text-sm font-semibold text-[#2D2926]">
                Desglose de gastos compartidos
              </p>
              {mostrarDesglose
                ? <ChevronUp size={16} className="text-[#8C7E75]" />
                : <ChevronDown size={16} className="text-[#8C7E75]" />}
            </button>

            {mostrarDesglose && (
              <div className="border-t border-[#EDE8E3]">
                {compartidos.map(gasto => {
                  const cat = CATEGORIAS[gasto.categoria] ?? CATEGORIAS.otros
                  const pagadorNombre = gasto.pagado_por === user.id ? miNombre : (otroUsuario?.nombre ?? '?')
                  const pct = gasto.porcentaje_pagador ?? 50
                  const montoOtro = Number(gasto.monto) * (1 - pct / 100)
                  const esMiDeuda = gasto.pagado_por !== user.id

                  return (
                    <div key={gasto.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#EDE8E3] last:border-0">
                      <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#2D2926] truncate">
                          {gasto.descripcion || cat.label}
                        </p>
                        <p className="text-[11px] text-[#8C7E75]">
                          Pagó {pagadorNombre} · {pct}/{100 - pct}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold ${esMiDeuda ? 'text-[#C0614A]' : 'text-[#8BAF8D]'}`}>
                          {esMiDeuda ? '−' : '+'}{formatMonto(montoOtro)}
                        </p>
                        <p className="text-[10px] text-[#8C7E75]">{formatMonto(gasto.monto)} total</p>
                      </div>
                    </div>
                  )
                })}

                {/* Totales del desglose */}
                <div className="bg-[#FAF7F4] px-4 py-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#2D2926]">Balance bruto</span>
                  <span className={`text-sm font-bold ${balanceBruto >= 0 ? 'text-[#8BAF8D]' : 'text-[#C0614A]'}`}>
                    {balanceBruto >= 0 ? '+' : '−'}{formatMonto(balanceBruto)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historial de liquidaciones */}
        {liquidaciones.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-3">Pagos registrados este mes</p>
            <div className="flex flex-col gap-2">
              {liquidaciones.map(liq => {
                const pagadorNombre = liq.pagado_por === user.id ? miNombre : (otroUsuario?.nombre ?? '?')
                const receptorNombre = liq.pagado_a === user.id ? miNombre : (otroUsuario?.nombre ?? '?')
                return (
                  <div key={liq.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F0F5F0] flex items-center justify-center text-base flex-shrink-0">
                      💸
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2D2926]">
                        {pagadorNombre} le pagó a {receptorNombre}
                      </p>
                      <p className="text-[11px] text-[#8C7E75]">{formatFecha(liq.fecha)}</p>
                      {liq.nota && (
                        <p className="text-[11px] text-[#8C7E75] mt-0.5 italic truncate" title={liq.nota}>
                          {liq.nota}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[#8BAF8D]">
                      {formatMonto(liq.monto)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {compartidos.length === 0 && liquidaciones.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-sm text-[#8C7E75]">Sin gastos compartidos este mes</p>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
