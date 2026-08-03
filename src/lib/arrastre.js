// Arrastre de saldo: mover lo que quedó pendiente de un mes al mes siguiente.
//
// Dos liquidaciones espejo: cierre el último día del mes de origen, apertura el
// primer día del mes destino. No mandamos `tipo` en el INSERT — si PostgREST no
// tiene esa columna en el schema cache, el request truena aunque exista en Postgres.
// La marca va en la nota (`[arrastre] ...`); si `nota` tampoco existe, insertamos
// igual sin ella (el balance numérico sigue siendo correcto).

import { etiquetaMes, rangoMes, sumarMeses } from './fechas'

export const PREFIJO_NOTA_ARRASTRE = '[arrastre]'

function notaConMarca(texto) {
  const t = (texto ?? '').trim()
  return t.startsWith(PREFIJO_NOTA_ARRASTRE) ? t : `${PREFIJO_NOTA_ARRASTRE} ${t}`.trim()
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
        pagado_por: meDeben ? otroId : miId,
        pagado_a: meDeben ? miId : otroId,
        nota: notaConMarca(`Saldo arrastrado a ${etiquetaMes(mesDestino)}`),
      },
      {
        monto,
        fecha: rangoMes(mesDestino).inicio,
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

function esErrorDeColumna(error, columna) {
  const texto = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()
  return texto.includes(columna) || texto.includes('schema cache') || String(error?.code ?? '') === 'PGRST204'
}

// Inserta sin `tipo`. Si `nota` tampoco está en el cache, reintenta sin nota.
export async function insertarArrastre(supabase, filas) {
  const conNota = await supabase.from('liquidaciones').insert(filas)
  if (!conNota.error) return conNota

  if (!esErrorDeColumna(conNota.error, 'nota') && !esErrorDeColumna(conNota.error, 'tipo')) {
    return conNota
  }

  const minimas = filas.map(({ nota: _nota, tipo: _tipo, ...resto }) => resto)
  return supabase.from('liquidaciones').insert(minimas)
}

export function mensajeErrorArrastre(error) {
  const msg = error?.message ?? ''
  const details = error?.details ?? ''
  const hint = error?.hint ?? ''
  const code = error?.code ?? ''
  const todo = `${msg} ${details} ${hint} ${code}`.toLowerCase()

  if (todo.includes('row-level security') || todo.includes('rls') || code === '42501') {
    return 'Supabase bloqueó el insert (RLS). En el SQL Editor corre el bloque de políticas de liquidaciones del README.'
  }

  if (todo.includes('foreign key') || code === '23503') {
    return 'El otro usuario no existe en auth.users. Revisa que ambos perfiles tengan el mismo id que su cuenta.'
  }

  // Mensaje crudo de PostgREST: si volvemos a adivinar "falta tipo" confundimos el diagnóstico.
  const detalle = [code && `código ${code}`, msg, details, hint].filter(Boolean).join(' — ')
  if (detalle) return `No se pudo arrastrar el saldo: ${detalle}`

  try {
    return `No se pudo arrastrar el saldo: ${JSON.stringify(error)}`
  } catch {
    return 'No se pudo arrastrar el saldo. Intenta de nuevo.'
  }
}
