// Arrastre de saldo: mover lo que quedó pendiente de un mes al mes siguiente.
//
// No hay una tabla aparte. Se insertan dos liquidaciones espejo con tipo 'arrastre':
// una con fecha del último día del mes de origen (deja ese mes en cero) y otra con
// fecha del primer día del mes destino (vuelve a abrir la deuda ahí, en la misma
// dirección). Así la fórmula de balance de siempre da el resultado correcto en los
// dos meses sin tratarlos como caso especial.

import { TIPO_ARRASTRE } from './balance'
import { etiquetaMes, rangoMes, sumarMeses } from './fechas'

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
        nota: `Saldo arrastrado a ${etiquetaMes(mesDestino)}`,
      },
      {
        monto,
        fecha: rangoMes(mesDestino).inicio,
        tipo: TIPO_ARRASTRE,
        // En el destino se anota en el sentido del saldo original para recrearlo.
        pagado_por: meDeben ? miId : otroId,
        pagado_a: meDeben ? otroId : miId,
        nota: `Saldo que viene de ${etiquetaMes(mes)}`,
      },
    ],
  }
}

// Dentro de un mes, el arrastre con fecha del día 1 es el que llegó del mes anterior;
// el otro (último día) es el que se mandó al mes siguiente.
export function esArrastreEntrante(liquidacion, mes) {
  return String(liquidacion.fecha).slice(0, 10) === rangoMes(mes).inicio
}

export function mensajeErrorArrastre(error) {
  // Sin la columna nueva en Supabase el error de PostgREST no dice qué hay que hacer.
  if (error?.message?.includes('tipo')) {
    return 'Falta la columna "tipo" en la tabla liquidaciones. Corre el ALTER TABLE que viene en el README.'
  }
  return 'No se pudo arrastrar el saldo. Intenta de nuevo.'
}
