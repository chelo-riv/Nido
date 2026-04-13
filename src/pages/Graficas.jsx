import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIAS } from '../lib/categorias'
import BottomNav from '../components/BottomNav'

const COLORES_CAT = {
  supermercado:    '#D4845A',
  hogar:           '#8BAF8D',
  transporte:      '#6B9BB8',
  restaurante:     '#E8A87C',
  entretenimiento: '#B5A4D0',
  salud:           '#7FB5A0',
  servicios:       '#F4C47E',
  otros:           '#C4B5A0',
}

function formatMonto(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function semanaDelMes(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dia = new Date(y, m - 1, d).getDate()
  return `Sem ${Math.ceil(dia / 7)}`
}

function CustomTooltipPie({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-white border border-[#EDE8E3] rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-[#2D2926]">{name}</p>
      <p className="text-[#8C7E75]">{formatMonto(value)}</p>
    </div>
  )
}

function CustomTooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#EDE8E3] rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-[#2D2926]">{label}</p>
      <p className="text-[#8C7E75]">{formatMonto(payload[0].value)}</p>
    </div>
  )
}

export default function Graficas() {
  const { user } = useAuth()

  const ahora = new Date()
  const [anio, setAnio]   = useState(ahora.getFullYear())
  const [mes, setMes]     = useState(ahora.getMonth())
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) cargarDatos()
  }, [user, anio, mes])

  async function cargarDatos() {
    setLoading(true)
    const inicio = new Date(anio, mes, 1).toISOString().split('T')[0]
    const fin    = new Date(anio, mes + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('gastos')
      .select('monto, categoria, fecha')
      .gte('fecha', inicio)
      .lte('fecha', fin)

    setGastos(data ?? [])
    setLoading(false)
  }

  function cambiarMes(delta) {
    const d = new Date(anio, mes + delta, 1)
    setAnio(d.getFullYear())
    setMes(d.getMonth())
  }

  const nombreMes = new Date(anio, mes, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  const totalMes = gastos.reduce((a, g) => a + Number(g.monto), 0)

  // Datos para pie chart por categoría
  const porCategoria = Object.entries(
    gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] ?? 0) + Number(g.monto)
      return acc
    }, {})
  )
    .map(([cat, total]) => ({
      name: CATEGORIAS[cat]?.label ?? cat,
      value: total,
      color: COLORES_CAT[cat] ?? '#C4B5A0',
      emoji: CATEGORIAS[cat]?.emoji ?? '📦',
    }))
    .sort((a, b) => b.value - a.value)

  // Datos para bar chart por semana
  const porSemana = gastos.reduce((acc, g) => {
    const sem = semanaDelMes(g.fecha)
    acc[sem] = (acc[sem] ?? 0) + Number(g.monto)
    return acc
  }, {})

  const dataSemanas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5']
    .filter(s => porSemana[s] !== undefined)
    .map(s => ({ semana: s, total: porSemana[s] ?? 0 }))

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#EDE8E3] px-5 pt-12 pb-4">
        <h1 className="text-lg font-bold text-[#2D2926] mb-3">Gráficas</h1>

        {/* Selector de mes */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => cambiarMes(-1)}
            className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <p className="text-sm font-semibold text-[#2D2926] capitalize">{nombreMes}</p>
          <button
            onClick={() => cambiarMes(1)}
            disabled={anio === ahora.getFullYear() && mes === ahora.getMonth()}
            className="p-2 rounded-xl text-[#8C7E75] hover:bg-[#FAF7F4] disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-4xl animate-pulse">🪺</span>
        </div>
      ) : gastos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <p className="text-4xl mb-3">🌿</p>
          <p className="text-sm text-[#8C7E75]">Sin gastos en este mes</p>
        </div>
      ) : (
        <div className="px-4 pt-5 flex flex-col gap-4">

          {/* Total del mes */}
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8C7E75]">Total gastado</p>
              <p className="text-2xl font-bold text-[#2D2926]">{formatMonto(totalMes)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8C7E75]">Registros</p>
              <p className="text-2xl font-bold text-[#2D2926]">{gastos.length}</p>
            </div>
          </div>

          {/* Pie chart por categoría */}
          <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
            <p className="text-sm font-semibold text-[#2D2926] mb-4">Por categoría</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={porCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {porCategoria.map((entry, i) => (
                    <Cell key={i} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Leyenda */}
            <div className="flex flex-col gap-2 mt-2">
              {porCategoria.map((item, i) => {
                const pct = ((item.value / totalMes) * 100).toFixed(0)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[#2D2926] flex-1">{item.emoji} {item.name}</span>
                    <span className="text-xs text-[#8C7E75]">{pct}%</span>
                    <span className="text-xs font-semibold text-[#2D2926]">{formatMonto(item.value)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bar chart por semana */}
          {dataSemanas.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
              <p className="text-sm font-semibold text-[#2D2926] mb-4">Por semana</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dataSemanas} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E3" vertical={false} />
                  <XAxis
                    dataKey="semana"
                    tick={{ fontSize: 11, fill: '#8C7E75' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8C7E75' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#FAF7F4' }} />
                  <Bar dataKey="total" fill="#D4845A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </div>
  )
}
