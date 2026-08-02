// Utilidades de mes en formato "YYYY-MM" (le decimos ym).
// Las comparten Dashboard, Gastos, Balances y Gráficas para navegar entre meses.

// Arma "YYYY-MM" a partir de año y mes (mes 1-12).
function ym(anio, mes) {
  return `${anio}-${String(mes).padStart(2, '0')}`
}

// Mes actual según la hora local del dispositivo.
export function mesActual() {
  const d = new Date()
  return ym(d.getFullYear(), d.getMonth() + 1)
}

// Saca el mes de una fecha de Supabase ("YYYY-MM-DD").
export function mesDesdeFecha(fechaStr) {
  if (!fechaStr) return ''
  return String(fechaStr).slice(0, 7)
}

// Suma o resta meses sin salirse del calendario (diciembre -> enero del año siguiente).
export function sumarMeses(mes, delta) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return ym(d.getFullYear(), d.getMonth() + 1)
}

// "Julio 2026". Se arma mes y año por separado para evitar el "de" que mete el locale.
export function etiquetaMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  const nombre = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long' })
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`
}

// Primer y último día del mes en "YYYY-MM-DD" para filtrar con .gte/.lte en Supabase.
// Se arma a mano en vez de toISOString() porque ese convierte a UTC y corre un día.
export function rangoMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(y, m, 0).getDate()
  return {
    inicio: `${ym(y, m)}-01`,
    fin: `${ym(y, m)}-${String(ultimoDia).padStart(2, '0')}`,
  }
}

export function esMesActual(mes) {
  return mes === mesActual()
}

// "YYYY-MM-DD" de hoy en hora local, para los inputs type="date".
export function fechaLocalHoy() {
  const d = new Date()
  return `${ym(d.getFullYear(), d.getMonth() + 1)}-${String(d.getDate()).padStart(2, '0')}`
}

// Fecha que se propone al registrar algo en el mes que se está viendo:
// hoy si es el mes actual, o el último día si es un mes pasado.
export function fechaPorDefectoDelMes(mes) {
  return esMesActual(mes) ? fechaLocalHoy() : rangoMes(mes).fin
}

// Valida el parámetro ?mes= de la URL antes de usarlo.
export function esMesValido(mes) {
  return typeof mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
}

// Valida el parámetro ?fecha= de la URL antes de usarlo.
export function esFechaValida(fecha) {
  return typeof fecha === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(fecha)
}

// Lee ?mes= de la URL; si no viene o viene mal, devuelve el mes actual.
export function mesDesdeParams(searchParams) {
  const valor = searchParams.get('mes')
  return esMesValido(valor) ? valor : mesActual()
}

// Sufijo para los links entre pantallas: solo se manda el mes si no es el actual.
export function sufijoMes(mes) {
  return esMesActual(mes) ? '' : `?mes=${mes}`
}

// Frase para los textos: "este mes" o "en Julio 2026".
export function referenciaMes(mes) {
  return esMesActual(mes) ? 'este mes' : `en ${etiquetaMes(mes)}`
}
