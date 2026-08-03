// Arrastre de saldo: mover lo que quedó pendiente de un mes al mes siguiente.
//
// No hay una tabla aparte. Se insertan dos liquidaciones espejo con tipo 'arrastre':
// una con fecha del último día del mes de origen (deja ese mes en cero) y otra con
// fecha del primer día del mes destino (vuelve a abrir la deuda ahí, en la misma
// dirección). Así la fórmula de balance de siempre da el resultado correcto en los
// dos meses sin tratarlos como caso especial.

import { TIPO_ARRASTRE } from './balance'
import { etiquetaMes, rangoMes, sumarMeses } from './fechas'

// Prefijo en nota por si la columna tipo aún no existe / PostgREST no la ve.
const PREFIJO_NOTA = '[arrastre]'

function notaConMarca(texto) {
  const t = (texto ?? '').trim()
  return t.startsWith(PREFIJO_NOTA) ? t : `${PREFIJO_NOTA} ${t}`.trim()
}

// balance viene de calcularBalance: positivo = me deben | negativo = debo.
export function filasDeArrastre({ mes, balance, miId, otroId }) {
  const mesDestino = sumarMeses(mes, 1)
  const monto = Math.round(Math.abs(balance))
  const meDeben = balance > 0

  return {
    mesDestino,
    monto,
    filas: [
      {
        monto,
        fecha: rangoMes(mes).fin,
        tipo: TIPO_ARRASTRE,
        // Se anota al revés del saldo para cancelarlo en el mes de origen.
        pagado_por: meDeben ? otroId : miId,
        pagado_a: meDeben ? miId : otroId,
        nota: notaConMarca(`Saldo arrastrado a ${etiquetaMes(mesDestino)}`),
      },
      {
        monto,
        fecha: rangoMes(mesDestino).inicio,
        tipo: TIPO_ARRASTRE,
        // En el destino se anota en el sentido del saldo original para recrearlo.
        pagado_por: meDeben ? miId : otroId,
        pagado_a: meDeben ? otroId : miId,
        nota: notaConMarca(`Saldo que viene de ${etiquetaMes(mes)}`),
      },
    ],
  }
}

// Dentro de un mes, el arrastre con fecha del día 1 es el que llegó del mes anterior;
// el otro (último día) es el que se mandó al mes siguiente.
export function esArrastreEntrante(liquidacion, mes) {
  return String(liquidacion.fecha).slice(0, 10) === rangoMes(mes).inicio
}

// ¿El fallo es porque PostgREST no conoce la columna tipo?
function esErrorDeColumnaTipo(error) {
  const texto = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''} ${error?.code ?? ''}`.toLowerCase()
  return texto.includes('tipo') || texto.includes('schema cache') || texto.includes('pgrst204')
}

// Inserta las dos filas. Si la columna tipo no existe / no está en el cache, reintenta sin ella.
export async function insertarArrastre(supabase, filas) {
  const primerIntento = await supabase.from('liquidaciones').insert(filas)
  if (!primerIntento.error) return primerIntento

  if (!esErrorDeColumnaTipo(primerIntento.error)) return primerIntento

  // Mismo movimiento, sin `tipo`: esArrastre() las reconoce por el prefijo de la nota.
  const sinTipo = filas.map(({ tipo: _tipo, ...resto }) => ({
    ...resto,
    nota: notaConMarca(resto.nota),
  }))
  return supabase.from('liquidaciones').insert(sinTipo)
}

export function mensajeErrorArrastre(error) {
  const msg = error?.message ?? ''
  const details = error?.details ?? ''
  const hint = error?.hint ?? ''
  const code = error?.code ?? ''
  const todo = `${msg} ${details} ${hint} ${code}`.toLowerCase()

  if (esErrorDeColumnaTipo(error)) {
    return 'Falta la columna "tipo" (o PostgREST aún no la ve). Corre el ALTER TABLE del README y recarga el schema de la API.'
  }

  if (todo.includes('row-level security') || todo.includes('rls') || code === '42501') {
    return 'Supabase bloqueó el insert (RLS). Corre el bloque de políticas de liquidaciones del README.'
  }

  if (todo.includes('foreign key') || code === '23503') {
    return 'El otro usuario no existe en auth.users. Revisa que ambos perfiles tengan el mismo id que su cuenta.'
  }

  // Siempre mostramos algo útil: sin esto queda el mensaje genérico y no se puede depurar.
  const detalle = [code && `código ${code}`, msg, details, hint].filter(Boolean).join(' — ')
  if (detalle) return `No se pudo arrastrar el saldo: ${detalle}`

  try {
    return `No se pudo arrastrar el saldo: ${JSON.stringify(error)}`
  } catch {
    return 'No se pudo arrastrar el saldo. Intenta de nuevo.'
  }
}
