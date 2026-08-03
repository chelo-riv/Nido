// Arrastre de saldo: mover lo que quedó pendiente de un mes al mes siguiente.
//
// No hay una tabla aparte. Se insertan dos liquidaciones espejo:
// una con fecha del último día del mes de origen (deja ese mes en cero) y otra con
// fecha del primer día del mes destino (vuelve a abrir la deuda ahí).
//
// No mandamos la columna `tipo` en el INSERT: si PostgREST aún no la ve, el insert
// truena. Las filas se reconocen por el prefijo [arrastre] en la nota (y por tipo
// cuando la columna ya existe y alguien la rellena a mano o con el ALTER).

import { etiquetaMes, rangoMes, sumarMeses } from './fechas'

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

  // Sin `tipo` a propósito: el INSERT tiene que funcionar aunque el schema cache
  // de PostgREST aún no haya cargado esa columna.
  return {
    mesDestino,
    monto,
    filas: [
      {
        monto,
        fecha: rangoMes(mes).fin,
        // Se anota al revés del saldo para cancelarlo en el mes de origen.
        pagado_por: meDeben ? otroId : miId,
        pagado_a: meDeben ? miId : otroId,
        nota: notaConMarca(`Saldo arrastrado a ${etiquetaMes(mesDestino)}`),
      },
      {
        monto,
        fecha: rangoMes(mesDestino).inicio,
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

export async function insertarArrastre(supabase, filas) {
  return supabase.from('liquidaciones').insert(filas)
}

export function mensajeErrorArrastre(error) {
  const msg = error?.message ?? ''
  const details = error?.details ?? ''
  const hint = error?.hint ?? ''
  const code = error?.code ?? ''
  const todo = `${msg} ${details} ${hint} ${code}`.toLowerCase()

  if (todo.includes('tipo') || todo.includes('schema cache') || code === 'PGRST204') {
    return 'Falta la columna "tipo" (o PostgREST aún no la ve). Corre el ALTER TABLE del README y recarga el schema de la API.'
  }

  if (todo.includes('row-level security') || todo.includes('rls') || code === '42501') {
    return 'Supabase bloqueó el insert (RLS). Corre el bloque de políticas de liquidaciones del README.'
  }

  if (todo.includes('foreign key') || code === '23503') {
    return 'El otro usuario no existe en auth.users. Revisa que ambos perfiles tengan el mismo id que su cuenta.'
  }

  const detalle = [code && `código ${code}`, msg, details, hint].filter(Boolean).join(' — ')
  if (detalle) return `No se pudo arrastrar el saldo: ${detalle}`

  try {
    return `No se pudo arrastrar el saldo: ${JSON.stringify(error)}`
  } catch {
    return 'No se pudo arrastrar el saldo. Intenta de nuevo.'
  }
}
