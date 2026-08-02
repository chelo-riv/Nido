import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut, ArrowRight, House, Lightbulb, Wallet, Scale, PiggyBank, LineChart, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS } from '../lib/categorias'
import { calcularBalance, UMBRAL_BALANCE_MANO } from '../lib/balance'
import {
  esMesActual, etiquetaMes, fechaPorDefectoDelMes, mesDesdeFecha,
  mesDesdeParams, rangoMes, referenciaMes, sufijoMes,
} from '../lib/fechas'
import SelectorMes from '../components/SelectorMes'
import BottomNav from '../components/BottomNav'

function saludo() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function saldoMostrarPesos(n) {
  return Math.round(n)
}

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function fechaHoy() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [mes, setMes] = useState(() => mesDesdeParams(searchParams))
  const [gastos, setGastos] = useState([])
  const [liquidaciones, setLiquidaciones] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [mesesConMovimiento, setMesesConMovimiento] = useState([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  // Cada carga lleva número: si contesta una petición vieja (cambio rápido de mes) se descarta.
  const peticionRef = useRef(0)

  async function cargarDatos() {
    const peticion = ++peticionRef.current
    setActualizando(true)

    const { inicio, fin } = rangoMes(mes)

    const [
      { data: gastosData }, { data: liquidacionesData }, { data: perfilesData },
      { data: fechasGastos }, { data: fechasLiquidaciones },
    ] = await Promise.all([
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: false }),
      supabase.from('liquidaciones').select('*').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('perfiles').select('*'),
      // Solo las fechas: sirven para saber en qué otros meses hay algo registrado.
      supabase.from('gastos').select('fecha'),
      supabase.from('liquidaciones').select('fecha'),
    ])

    if (peticion !== peticionRef.current) return

    const tienePerfil = perfilesData?.some(p => p.id === user.id)
    if (!tienePerfil) {
      const nombreAuto = user.email.split('@')[0]
      await supabase.from('perfiles').insert({ id: user.id, nombre: nombreAuto })
      setPerfiles([...(perfilesData ?? []), { id: user.id, nombre: nombreAuto }])
    } else {
      setPerfiles(perfilesData ?? [])
    }

    // Meses con algo registrado, para saltar a ellos cuando el mes visible está vacío.
    const meses = [...(fechasGastos ?? []), ...(fechasLiquidaciones ?? [])]
      .map(r => mesDesdeFecha(r.fecha))
      .filter(Boolean)

    setGastos(gastosData ?? [])
    setLiquidaciones(liquidacionesData ?? [])
    setMesesConMovimiento([...new Set(meses)].sort((a, b) => b.localeCompare(a)))
    setLoading(false)
    setActualizando(false)
  }

  // El mes visible queda en la URL para poder recargar o compartir el link sin perderlo.
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

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    )
  }

  // ── Cálculos de balance ──────────────────────────────────────────────────
  const {
    compartidos, balance, pagosRecibidos, pagosRealizados,
    misPagos, otrosPagos, totalGastado: total, estanAMano,
  } = calcularBalance({ gastos, liquidaciones, userId: user.id })

  const miPerfil    = perfiles.find(p => p.id === user.id)
  const otroUsuario = perfiles.find(p => p.id !== user.id)
  const miNombre    = miPerfil?.nombre ?? user.email.split('@')[0]
  const otroNombre  = otroUsuario?.nombre ?? 'Tu pareja'
  const nCompartidos = compartidos.length
  const hayMovimiento = total > 0 || liquidaciones.length > 0

  const referencia = referenciaMes(mes)
  const sufijo = sufijoMes(mes)
  // Cuando se ve un mes pasado, un gasto nuevo debería caer en ese mes.
  const linkAgregar = esMesActual(mes) ? '/agregar' : `/agregar?fecha=${fechaPorDefectoDelMes(mes)}`
  const otrosMesesConMovimiento = mesesConMovimiento.filter(m => m !== mes).slice(0, 4)

  // ── Texto del balance ────────────────────────────────────────────────────
  let balanceTexto = ''
  let balanceSubtexto = ''
  if (!hayMovimiento) {
    balanceTexto = 'Sin movimiento'
    balanceSubtexto = `Agrega gastos o anota pagos ${referencia}`
  } else if (estanAMano) {
    balanceTexto = '¡Están a mano!'
    const partes = []
    if (total > 0) partes.push(`${gastos.length} cargos · ${formatMonto(total)} en gastos`)
    if (liquidaciones.length > 0) {
      const p = liquidaciones.length
      partes.push(`${p} pago${p === 1 ? '' : 's'} registrado${p === 1 ? '' : 's'}`)
    }
    balanceSubtexto = partes.join(' · ') || `Sin deuda pendiente ${referencia}`
  } else if (balance > UMBRAL_BALANCE_MANO) {
    balanceTexto = formatMonto(saldoMostrarPesos(balance))
    balanceSubtexto = otroUsuario
      ? `${otroNombre} te debe · saldo neto del mes (${nCompartidos} gasto${nCompartidos === 1 ? '' : 's'} compartido${nCompartidos === 1 ? '' : 's'})`
      : `Te deben · ${nCompartidos} gasto${nCompartidos === 1 ? '' : 's'} compartido${nCompartidos === 1 ? '' : 's'}`
  } else {
    balanceTexto = formatMonto(saldoMostrarPesos(Math.abs(balance)))
    balanceSubtexto = otroUsuario
      ? `Le debes a ${otroNombre} · saldo neto del mes (${nCompartidos} gasto${nCompartidos === 1 ? '' : 's'} compartido${nCompartidos === 1 ? '' : 's'})`
      : `Debes · saldo neto del mes (${nCompartidos} gasto${nCompartidos === 1 ? '' : 's'} compartido${nCompartidos === 1 ? '' : 's'})`
  }

  const balanceColor = estanAMano || balance > UMBRAL_BALANCE_MANO ? 'bg-[#8BAF8D]' : 'bg-[#D4845A]'

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8C7E75] capitalize">{fechaHoy()}</p>
          <h1 className="text-lg font-bold text-[#2D2926]">{saludo()}, {miNombre} 👋</h1>
        </div>
        <button
          onClick={cerrarSesion}
          className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* ── MES DE LA SECCIÓN DE FINANZAS ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-2">
          <SelectorMes mes={mes} onCambiar={setMes} className="min-w-0" />
        </div>

        {/* ── TARJETA FINANZAS (full width) ─────────────────────────────── */}
        <button
          onClick={() => navigate(`/gastos${sufijo}`)}
          className={`${balanceColor} rounded-2xl p-5 text-white text-left w-full transition-opacity active:opacity-90 ${actualizando ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Wallet size={20} className="text-white" strokeWidth={1.8} />
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <span className="text-xs font-medium">Finanzas</span>
              <ArrowRight size={12} />
            </div>
          </div>
          <p className="text-sm opacity-80 mb-0.5">
            {esMesActual(mes) ? 'Balance del mes' : `Balance de ${etiquetaMes(mes)}`}
          </p>
          <p className="text-2xl font-bold mb-1">{balanceTexto}</p>
          <p className="text-sm opacity-75">{balanceSubtexto}</p>

          {total > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              <p className="text-[10px] opacity-75 leading-snug">
                Quién pagó cada gasto del mes · el número grande arriba es el saldo neto (tras transferencias).
              </p>
              <div className="flex justify-between text-xs opacity-85">
                <span>{miNombre} · {formatMonto(misPagos)}</span>
                <span>{otroNombre} · {formatMonto(otrosPagos)}</span>
              </div>
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/70 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (misPagos / total) * 100 : 50}%` }}
                />
              </div>
            </div>
          )}
          {(pagosRecibidos > 0 || pagosRealizados > 0) && (
            <p className="text-[11px] opacity-90 mt-3 leading-snug border-t border-white/20 pt-3">
              Transferencias del mes registradas · Recibiste {formatMonto(pagosRecibidos)} · Pagaste {formatMonto(pagosRealizados)}
            </p>
          )}
        </button>

        {/* Meses con movimiento: atajo cuando el mes visible está vacío */}
        {!hayMovimiento && otrosMesesConMovimiento.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-3">
            <p className="text-[11px] text-[#8C7E75] mb-2">Meses con movimiento registrado</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {otrosMesesConMovimiento.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMes(m)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-xs font-semibold text-[#2D2926] active:bg-[#EDE8E3]/60"
                >
                  {etiquetaMes(m)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Atajos finanzas (rutas sin enlace en la barra inferior) */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {[
            { to: '/balances', label: 'Balances', Icon: Scale, conMes: true },
            { to: '/presupuestos', label: 'Presupuestos', Icon: PiggyBank },
            { to: '/graficas', label: 'Gráficas', Icon: LineChart, conMes: true },
            { to: '/wishlist', label: 'Wishlists', Icon: Heart },
          ].map(({ to, label, Icon, conMes }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(conMes ? `${to}${sufijo}` : to)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EDE8E3] bg-white text-xs font-semibold text-[#2D2926] active:bg-[#FAF7F4]"
            >
              <Icon size={14} className="text-[#8C7E75]" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* ── MÓDULOS SECUNDARIOS (2 columnas) ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Hogar */}
          <button
            onClick={() => navigate('/hogar')}
            className="bg-white rounded-2xl border border-[#EDE8E3] p-4 text-left transition-colors active:bg-[#FAF7F4] flex flex-col gap-3"
          >
            <div className="bg-[#F0EBE3] rounded-xl p-2.5 w-fit">
              <House size={20} className="text-[#D4845A]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2D2926] leading-tight">Gestión del hogar</p>
              <p className="text-[11px] text-[#8C7E75] mt-0.5 leading-snug">Tareas · Lista · Recetas</p>
            </div>
            <span className="text-[10px] font-medium text-[#D4845A] bg-[#FAF0EB] px-2 py-0.5 rounded-full w-fit">
              Próximamente
            </span>
          </button>

          {/* Focos */}
          <button
            onClick={() => navigate('/focos')}
            className="bg-white rounded-2xl border border-[#EDE8E3] p-4 text-left transition-colors active:bg-[#FAF7F4] flex flex-col gap-3"
          >
            <div className="bg-[#FDF6E3] rounded-xl p-2.5 w-fit">
              <Lightbulb size={20} className="text-[#C8A94A]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2D2926] leading-tight">Focos inteligentes</p>
              <p className="text-[11px] text-[#8C7E75] mt-0.5 leading-snug">Control Govee</p>
            </div>
            <span className="text-[10px] font-medium text-[#D4845A] bg-[#FAF0EB] px-2 py-0.5 rounded-full w-fit">
              Próximamente
            </span>
          </button>

        </div>

        {/* ── ÚLTIMOS GASTOS ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-[#2D2926]">
              {esMesActual(mes) ? 'Últimos gastos' : `Gastos de ${etiquetaMes(mes)}`}
            </p>
            <button
              onClick={() => navigate(`/gastos${sufijo}`)}
              className="text-xs text-[#D4845A] flex items-center gap-0.5 font-medium"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          {gastos.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-2xl mb-2">🌿</p>
              <p className="text-sm text-[#8C7E75]">Sin gastos {referencia}</p>
              <button
                onClick={() => navigate(linkAgregar)}
                className="mt-3 text-xs text-[#D4845A] font-medium"
              >
                Agregar el primero
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {gastos.slice(0, 4).map(gasto => {
                const cat = CATEGORIAS[gasto.categoria] ?? CATEGORIAS.otros
                const esMio = gasto.pagado_por === user.id
                const quien = esMio ? miNombre : (otroUsuario?.nombre ?? '?')
                return (
                  <div key={gasto.id} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF7F4] flex items-center justify-center text-lg flex-shrink-0">
                      {cat.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2D2926] truncate">
                        {gasto.descripcion || cat.label}
                      </p>
                      <p className="text-xs text-[#8C7E75]">{quien} · {cat.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#2D2926] flex-shrink-0">
                      {formatMonto(gasto.monto)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
