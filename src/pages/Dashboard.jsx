import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ArrowRight, PieChart, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS } from '../lib/categorias'
import BottomNav from '../components/BottomNav'

function saludo() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function nombreDelMes() {
  return new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [gastos, setGastos] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) cargarDatos()
  }, [user])

  async function cargarDatos() {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

    const [{ data: gastosData }, { data: perfilesData }] = await Promise.all([
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: false }),
      supabase.from('perfiles').select('*'),
    ])

    // Si el usuario no tiene perfil, crear uno automáticamente
    const tienePerfil = perfilesData?.some(p => p.id === user.id)
    if (!tienePerfil) {
      const nombreAuto = user.email.split('@')[0]
      await supabase.from('perfiles').insert({ id: user.id, nombre: nombreAuto })
      setPerfiles([...(perfilesData ?? []), { id: user.id, nombre: nombreAuto }])
    } else {
      setPerfiles(perfilesData ?? [])
    }

    setGastos(gastosData ?? [])
    setLoading(false)
  }

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

  // Cálculo de balance — solo gastos compartidos generan deuda
  const compartidos = gastos.filter(g => g.tipo === 'compartido' || !g.tipo)

  // Lo que me deben: yo pagué, el otro debe su % del gasto
  const meDebenTotal = compartidos
    .filter(g => g.pagado_por === user.id)
    .reduce((a, g) => a + Number(g.monto) * (1 - (g.porcentaje_pagador ?? 50) / 100), 0)

  // Lo que debo: el otro pagó, yo debo mi % del gasto
  const deboTotal = compartidos
    .filter(g => g.pagado_por !== user.id)
    .reduce((a, g) => a + Number(g.monto) * (1 - (g.porcentaje_pagador ?? 50) / 100), 0)

  const balance = meDebenTotal - deboTotal  // positivo = me deben, negativo = debo

  // Totales para el resumen (todos los gastos, incluyendo personales)
  const misPagos   = gastos.filter(g => g.pagado_por === user.id).reduce((a, g) => a + Number(g.monto), 0)
  const otrosPagos = gastos.filter(g => g.pagado_por !== user.id).reduce((a, g) => a + Number(g.monto), 0)
  const total      = misPagos + otrosPagos

  const miPerfil    = perfiles.find(p => p.id === user.id)
  const otroUsuario = perfiles.find(p => p.id !== user.id)
  const miNombre    = miPerfil?.nombre ?? user.email.split('@')[0]

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-20">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8C7E75] capitalize">{nombreDelMes()}</p>
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

        {/* Tarjeta de balance */}
        <div className={`rounded-2xl p-5 text-white ${balance >= 0 ? 'bg-[#8BAF8D]' : 'bg-[#D4845A]'}`}>
          <p className="text-sm opacity-80 mb-1">Balance del mes</p>
          {total === 0 ? (
            <p className="text-lg font-semibold">Sin gastos este mes 🪺</p>
          ) : balance === 0 ? (
            <p className="text-xl font-bold">¡Están a mano! 🎉</p>
          ) : balance > 0 ? (
            <>
              <p className="text-2xl font-bold">{formatMonto(balance)}</p>
              <p className="text-sm opacity-80 mt-1">
                {otroUsuario ? `${otroUsuario.nombre} te debe` : 'Te deben'}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">{formatMonto(Math.abs(balance))}</p>
              <p className="text-sm opacity-80 mt-1">
                {otroUsuario ? `Le debes a ${otroUsuario.nombre}` : 'Debes'}
              </p>
            </>
          )}
        </div>

        {/* Resumen del mes */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <p className="text-sm font-semibold text-[#2D2926] mb-3">Este mes</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-[#FAF7F4] rounded-xl p-3 text-center">
              <p className="text-xs text-[#8C7E75] mb-1">{miNombre}</p>
              <p className="text-base font-bold text-[#2D2926]">{formatMonto(misPagos)}</p>
            </div>
            <div className="flex-1 bg-[#FAF7F4] rounded-xl p-3 text-center">
              <p className="text-xs text-[#8C7E75] mb-1">{otroUsuario?.nombre ?? '—'}</p>
              <p className="text-base font-bold text-[#2D2926]">{formatMonto(otrosPagos)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#EDE8E3] flex justify-between items-center">
            <span className="text-xs text-[#8C7E75]">Total gastado</span>
            <span className="text-sm font-bold text-[#2D2926]">{formatMonto(total)}</span>
          </div>
        </div>

        {/* Últimos gastos */}
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-[#2D2926]">Últimos gastos</p>
            <button
              onClick={() => navigate('/gastos')}
              className="text-xs text-[#D4845A] flex items-center gap-0.5 font-medium"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          {gastos.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-2xl mb-2">🌿</p>
              <p className="text-sm text-[#8C7E75]">Sin gastos este mes</p>
              <button
                onClick={() => navigate('/agregar')}
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

        {/* Accesos rápidos */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/graficas')}
            className="flex-1 bg-white rounded-2xl border border-[#EDE8E3] p-3 flex items-center gap-2"
          >
            <BarChart2 size={18} className="text-[#D4845A]" />
            <span className="text-sm font-medium text-[#2D2926]">Gráficas</span>
            <ArrowRight size={14} className="text-[#8C7E75] ml-auto" />
          </button>
          <button
            onClick={() => navigate('/presupuestos')}
            className="flex-1 bg-white rounded-2xl border border-[#EDE8E3] p-3 flex items-center gap-2"
          >
            <PieChart size={18} className="text-[#D4845A]" />
            <span className="text-sm font-medium text-[#2D2926]">Límites</span>
            <ArrowRight size={14} className="text-[#8C7E75] ml-auto" />
          </button>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
