import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS } from '../lib/categorias'
import { calcularBalance } from '../lib/balance'
import { esArrastreEntrante, filasDeArrastre, insertarArrastre, mensajeErrorArrastre } from '../lib/arrastre'
import {
  esMesActual, etiquetaMes, fechaPorDefectoDelMes, mesDesdeFecha,
  mesDesdeParams, rangoMes, referenciaMes, sumarMeses,
} from '../lib/fechas'
import SelectorMes from '../components/SelectorMes'
import BottomNav from '../components/BottomNav'

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Math.abs(n))
}

function formatFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

export default function Balances() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [mes, setMes]                   = useState(() => mesDesdeParams(searchParams))
  const [gastos, setGastos]             = useState([])
  const [liquidaciones, setLiquidaciones] = useState([])
  const [perfiles, setPerfiles]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [mostrarLiquidar, setMostrarLiquidar] = useState(false)
  const [montoLiquidar, setMontoLiquidar] = useState('')
  // recibi = el otro me transfirió | pague = yo le transferí al otro
  const [direccionTransferencia, setDireccionTransferencia] = useState('recibi')
  const [fechaLiquidacion, setFechaLiquidacion] = useState(() => fechaPorDefectoDelMes(mesDesdeParams(searchParams)))
  const [notaLiquidacion, setNotaLiquidacion] = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [mostrarDesglose, setMostrarDesglose] = useState(false)
  // Guarda el mes de un pago que se anotó con fecha fuera del mes visible.
  const [avisoMesGuardado, setAvisoMesGuardado] = useState('')
  const [arrastrando, setArrastrando]   = useState(false)
  // { mesDestino, monto } del último arrastre, para ofrecer el salto a ese mes.
  const [avisoArrastre, setAvisoArrastre] = useState(null)
  const [errorArrastre, setErrorArrastre] = useState('')

  // Cada carga lleva número: si contesta una petición vieja (cambio rápido de mes) se descarta.
  const peticionRef = useRef(0)

  async function cargarDatos() {
    const peticion = ++peticionRef.current
    setActualizando(true)

    const { inicio, fin } = rangoMes(mes)

    const [{ data: gastosData }, { data: liquidacionesData }, { data: perfilesData }] = await Promise.all([
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('liquidaciones').select('*').gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: false }),
      supabase.from('perfiles').select('*'),
    ])

    if (peticion !== peticionRef.current) return

    setGastos(gastosData ?? [])
    setLiquidaciones(liquidacionesData ?? [])
    setPerfiles(perfilesData ?? [])
    setLoading(false)
    setActualizando(false)
  }

  // El mes visible queda en la URL para no perderlo al recargar o al venir del Dashboard.
  useEffect(() => {
    const enUrl = searchParams.get('mes')
    const deseado = esMesActual(mes) ? null : mes
    if (enUrl === deseado) return
    const params = new URLSearchParams(searchParams)
    if (deseado) params.set('mes', deseado)
    else params.delete('mes')
    setSearchParams(params, { replace: true })
  }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) cargarDatos()
  }, [user, mes]) // eslint-disable-line react-hooks/exhaustive-deps

  function cambiarMes(nuevoMes) {
    setMes(nuevoMes)
    setMostrarDesglose(false)
    setAvisoArrastre(null)
    setErrorArrastre('')
    cerrarFormLiquidar(nuevoMes)
  }

  // Manda lo que quedó pendiente del mes visible al mes siguiente.
  // Se recalcula aquí (no se cierra sobre variables del render) para no arrastrar un saldo viejo.
  async function arrastrarSaldo() {
    const otro = perfiles.find(p => p.id !== user.id)
    const { balance: saldo, estanAMano: aMano } = calcularBalance({
      gastos, liquidaciones, userId: user.id,
    })
    if (!otro?.id || aMano) return

    setArrastrando(true)
    setErrorArrastre('')

    const { filas, mesDestino, monto } = filasDeArrastre({
      mes, balance: saldo, miId: user.id, otroId: otro.id,
    })

    const { error } = await insertarArrastre(supabase, filas)

    if (error) {
      console.error('Arrastre falló:', error)
      setErrorArrastre(mensajeErrorArrastre(error))
    } else {
      setAvisoArrastre({ mesDestino, monto })
      await cargarDatos()
    }

    setArrastrando(false)
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
      const mesDelPago = mesDesdeFecha(fechaLiquidacion)
      setMontoLiquidar('')
      setNotaLiquidacion('')
      setFechaLiquidacion(fechaPorDefectoDelMes(mes))
      setMostrarLiquidar(false)
      setDireccionTransferencia('recibi')
      if (mesDelPago !== mes) {
        // El pago cuenta en el mes de su fecha, así que dejamos el atajo para ir a verlo.
        setAvisoMesGuardado(mesDelPago)
        window.setTimeout(() => setAvisoMesGuardado(''), 9000)
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

  const {
    compartidos, balanceBruto, pagos, ajustes, arrastres, arrastreNeto,
    pagosRecibidos, pagosRealizados, balance, estanAMano,
  } = calcularBalance({ gastos, liquidaciones, userId: user.id })
  // Nuevos = gastos en Ajustes; viejos = liquidaciones de arrastre (por si ya existían).
  const movimientosArrastre = [...ajustes, ...arrastres]

  function abrirLiquidarDesdeSaldo() {
    if (balance > 0) setDireccionTransferencia('recibi')
    else if (balance < 0) setDireccionTransferencia('pague')
    setMontoLiquidar(estanAMano ? '' : String(Math.round(Math.abs(balance))))
    setFechaLiquidacion(fechaPorDefectoDelMes(mes))
    setNotaLiquidacion('')
    setMostrarLiquidar(true)
  }

  function abrirLiquidarManual() {
    setDireccionTransferencia('recibi')
    setMontoLiquidar('')
    setFechaLiquidacion(fechaPorDefectoDelMes(mes))
    setNotaLiquidacion('')
    setMostrarLiquidar(true)
  }

  // mesReferencia permite dejar la fecha lista para el mes al que se acaba de cambiar.
  function cerrarFormLiquidar(mesReferencia = mes) {
    setMostrarLiquidar(false)
    setDireccionTransferencia('recibi')
    setFechaLiquidacion(fechaPorDefectoDelMes(mesReferencia))
    setNotaLiquidacion('')
  }

  const hayBalance = !estanAMano
  const meDeben = balance > 0
  const nombreDeudor  = meDeben ? (otroUsuario?.nombre ?? 'Tu pareja') : miNombre
  const nombreAcreedor = meDeben ? miNombre : (otroUsuario?.nombre ?? 'Tu pareja')
  const referencia = referenciaMes(mes)

  // Solo se puede arrastrar desde un mes cerrado: el siguiente del mes actual sería el futuro.
  const mesSiguiente = sumarMeses(mes, 1)
  const puedeArrastrar = !esMesActual(mes) && hayBalance && !!otroUsuario
  const liquidado = pagosRecibidos + pagosRealizados

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-4 pt-12 pb-4">
        <h1 className="text-lg font-bold text-[#2D2926] px-1 mb-3">Balances</h1>
        <SelectorMes mes={mes} onCambiar={cambiarMes} />
      </div>

      <div className="px-4 pt-5 flex flex-col gap-4">
        {avisoMesGuardado && (
          <div className="rounded-xl border border-[#D4845A]/40 bg-[#FDF6F3] px-3 py-2 text-xs text-[#2D2926] flex items-center justify-between gap-2">
            <span>Pago guardado con fecha de otro mes: cuenta en {etiquetaMes(avisoMesGuardado)}.</span>
            <button
              type="button"
              onClick={() => { cambiarMes(avisoMesGuardado); setAvisoMesGuardado('') }}
              className="flex-shrink-0 font-semibold text-[#D4845A]"
            >
              Ver ese mes
            </button>
          </div>
        )}

        {/* Tarjeta de balance principal */}
        <div className={`rounded-2xl p-6 text-white transition-opacity ${meDeben ? 'bg-[#8BAF8D]' : 'bg-[#D4845A]'} ${actualizando ? 'opacity-60' : ''}`}>
          {!hayBalance ? (
            <div className="text-center py-2">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-xl font-bold">¡Están a mano!</p>
              <p className="text-sm opacity-80 mt-1">No hay deuda pendiente {referencia}</p>
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
                  Bruto {formatMonto(balanceBruto)}
                  {liquidado > 0 && ` · Liquidado ${formatMonto(liquidado)}`}
                  {arrastreNeto !== 0 && ` · Arrastrado ${formatMonto(arrastreNeto)}`}
                </p>
              )}

              {/* Botón liquidar */}
              <button
                onClick={abrirLiquidarDesdeSaldo}
                className="mt-4 w-full py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-semibold backdrop-blur-sm active:scale-[0.98] transition-all"
              >
                Registrar pago
              </button>

              {/* Arrastre: pasa lo pendiente al mes siguiente sin que nadie transfiera nada */}
              {puedeArrastrar && (
                <>
                  <button
                    type="button"
                    onClick={arrastrarSaldo}
                    disabled={arrastrando}
                    className="mt-2 w-full py-2.5 rounded-xl border border-white/40 text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {arrastrando ? 'Arrastrando...' : `Arrastrar saldo a ${etiquetaMes(mesSiguiente)}`}
                  </button>
                  <p className="text-[11px] opacity-75 mt-2 leading-snug">
                    Este mes queda en cero y el saldo se suma a {etiquetaMes(mesSiguiente)}. No cuenta como transferencia.
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {avisoArrastre && (
          <div className="rounded-xl border border-[#8BAF8D]/50 bg-[#F2F7F2] px-3 py-2 text-xs text-[#2D2926] flex items-center justify-between gap-2">
            <span>
              {formatMonto(avisoArrastre.monto)} de {etiquetaMes(mes)} se movieron a {etiquetaMes(avisoArrastre.mesDestino)}.
            </span>
            <button
              type="button"
              onClick={() => cambiarMes(avisoArrastre.mesDestino)}
              className="flex-shrink-0 font-semibold text-[#D4845A]"
            >
              Ver ese mes
            </button>
          </div>
        )}

        {errorArrastre && (
          <div className="rounded-xl border border-[#C0614A]/30 bg-[#FDF0EE] px-3 py-2 text-xs text-[#C0614A]">
            {errorArrastre}
          </div>
        )}

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
              {mesDesdeFecha(fechaLiquidacion) !== mes && (
                <p className="text-[11px] text-[#C0614A] mt-1.5">
                  Esa fecha no es del mes que estás viendo ({etiquetaMes(mes)}): el pago contará solo en su propio mes.
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

        {/* Desglose de gastos compartidos (sin ajustes: esos van en "Saldos arrastrados") */}
        {compartidos.filter(g => g.categoria !== 'ajustes').length > 0 && (
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
                {compartidos.filter(g => g.categoria !== 'ajustes').map(gasto => {
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

        {/* Saldos movidos entre meses (gastos en Ajustes + arrastres viejos) */}
        {movimientosArrastre.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-3">Saldos arrastrados</p>
            <div className="flex flex-col gap-2">
              {movimientosArrastre.map(mov => {
                const entrante = esArrastreEntrante(mov, mes)
                const meSuma = mov.pagado_por === user.id
                const titulo = mov.descripcion
                  || (entrante
                    ? `Viene de ${etiquetaMes(sumarMeses(mes, -1))}`
                    : `Se movió a ${etiquetaMes(mesSiguiente)}`)
                return (
                  <div key={mov.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF0EB] flex items-center justify-center text-base flex-shrink-0">
                      🔁
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2D2926] truncate">{titulo}</p>
                      <p className="text-[11px] text-[#8C7E75]">
                        {entrante
                          ? (meSuma ? `${otroUsuario?.nombre ?? 'Tu pareja'} te lo debe` : `Se lo debes a ${otroUsuario?.nombre ?? 'tu pareja'}`)
                          : 'Este mes quedó saldado'}
                        {' · '}visible en Gastos → Ajustes
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#8C7E75]">
                      {formatMonto(mov.monto)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Historial de liquidaciones */}
        {pagos.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-3">Pagos registrados {referencia}</p>
            <div className="flex flex-col gap-2">
              {pagos.map(liq => {
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
            <p className="text-sm text-[#8C7E75]">Sin gastos compartidos {referencia}</p>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
