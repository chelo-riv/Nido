// Arrastre de saldo: mover lo que quedó pendiente de un mes al mes siguiente.
//
// Se guardan como gastos en la categoría "ajustes" (visibles en Gastos / historial):
// uno el último día del mes de origen (deja ese mes en cero) y otro el primer día
// del mes destino (vuelve a abrir la deuda). Con porcentaje_pagador = 0, el monto
// entero es deuda del que no "pagó", y la fórmula de balance de siempre alcanza.

import { CATEGORIA_AJUSTES } from './categorias'
import { etiquetaMes, rangoMes, sumarMeses } from './fechas'

// balance viene de calcularBalance: positivo = me deben | negativo = debo.
export function filasDeArrastre({ mes, balance, miId, otroId }) {
  const mesDestino = sumarMeses(mes, 1)
  const monto = Math.round(Math.abs(balance))
  const meDeben = balance > 0

  // porcentaje_pagador 0 = el otro absorbe el 100% → mueve el saldo completo.
  return {
    mesDestino,
    monto,
    filas: [
      {
        monto,
        fecha: rangoMes(mes).fin,
        categoria: CATEGORIA_AJUSTES,
        tipo: 'compartido',
        porcentaje_pagador: 0,
        // Al revés del saldo: cancela el mes de origen.
        pagado_por: meDeben ? otroId : miId,
        descripcion: `Saldo arrastrado a ${etiquetaMes(mesDestino)}`,
      },
      {
        monto,
        fecha: rangoMes(mesDestino).inicio,
        categoria: CATEGORIA_AJUSTES,
        tipo: 'compartido',
        porcentaje_pagador: 0,
        // Mismo sentido del saldo original: lo reabre en el destino.
        pagado_por: meDeben ? miId : otroId,
        descripcion: `Saldo que viene de ${etiquetaMes(mes)}`,
      },
    ],
  }
}

// Día 1 del mes = llegó del anterior; si no, es el que se mandó al siguiente.
export function esArrastreEntrante(movimiento, mes) {
  return String(movimiento.fecha).slice(0, 10) === rangoMes(mes).inicio
}

export async function insertarArrastre(supabase, filas) {
  return supabase.from('gastos').insert(filas)
}

export function mensajeErrorArrastre(error) {
  const msg = error?.message ?? ''
  const details = error?.details ?? ''
  const hint = error?.hint ?? ''
  const code = error?.code ?? ''
  const todo = `${msg} ${details} ${hint} ${code}`.toLowerCase()

  if (todo.includes('row-level security') || todo.includes('rls') || code === '42501') {
    return 'Supabase bloqueó el insert (RLS). Revisa las políticas de la tabla gastos.'
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
