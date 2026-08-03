// Cálculo del balance neto de un mes. Lo usan Dashboard y Balances para no repetir la fórmula.

import { esGastoAjuste } from './categorias'

// Diferencias menores a esto son ruido de redondeo de porcentajes: se considera que están a mano.
export const UMBRAL_BALANCE_MANO = 0.5

// Valor de liquidaciones.tipo para arrastres viejos (antes de guardarlos como gastos).
export const TIPO_ARRASTRE = 'arrastre'

export function esArrastre(liquidacion) {
  if (liquidacion.tipo === TIPO_ARRASTRE) return true
  return String(liquidacion.nota ?? '').startsWith('[arrastre]')
}

// Los gastos sin tipo son de antes de que existiera el campo: cuentan como compartidos.
function esCompartido(gasto) {
  return gasto.tipo === 'compartido' || !gasto.tipo
}

// Parte del gasto que le toca al que NO pagó.
function parteDelOtro(gasto) {
  return Number(gasto.monto) * (1 - (gasto.porcentaje_pagador ?? 50) / 100)
}

function sumarMontos(filas) {
  return filas.reduce((a, f) => a + Number(f.monto), 0)
}

export function calcularBalance({ gastos = [], liquidaciones = [], userId }) {
  const compartidos = gastos.filter(esCompartido)
  // Ajustes de arrastre: cuentan en el balance, no en "cuánto gastamos de verdad".
  const ajustes = gastos.filter(esGastoAjuste)
  const gastosReales = gastos.filter(g => !esGastoAjuste(g))

  const meDebenTotal = compartidos
    .filter(g => g.pagado_por === userId)
    .reduce((a, g) => a + parteDelOtro(g), 0)

  const deboTotal = compartidos
    .filter(g => g.pagado_por !== userId)
    .reduce((a, g) => a + parteDelOtro(g), 0)

  const balanceBruto = meDebenTotal - deboTotal

  // Arrastres viejos siguen en liquidaciones; los nuevos son gastos categoría ajustes.
  const pagos = liquidaciones.filter(l => !esArrastre(l))
  const arrastres = liquidaciones.filter(esArrastre)

  const pagosRecibidos = sumarMontos(pagos.filter(l => l.pagado_a === userId))
  const pagosRealizados = sumarMontos(pagos.filter(l => l.pagado_por === userId))

  const arrastreRecibido = sumarMontos(arrastres.filter(l => l.pagado_a === userId))
  const arrastreRealizado = sumarMontos(arrastres.filter(l => l.pagado_por === userId))

  // Positivo = me deben | negativo = debo.
  // Los ajustes-gasto ya van dentro de balanceBruto; los arrastres-liquidación se suman aquí.
  const balance = balanceBruto
    - pagosRecibidos + pagosRealizados
    - arrastreRecibido + arrastreRealizado

  const misPagos = sumarMontos(gastosReales.filter(g => g.pagado_por === userId))
  const otrosPagos = sumarMontos(gastosReales.filter(g => g.pagado_por !== userId))

  // Cuánto del balance viene de saldos movidos (gastos nuevos + liquidaciones viejas).
  const ajusteAFavor = sumarMontos(ajustes.filter(g => g.pagado_por === userId))
  const ajusteEnContra = sumarMontos(ajustes.filter(g => g.pagado_por !== userId))
  const arrastreNeto = (ajusteAFavor - ajusteEnContra) + (arrastreRealizado - arrastreRecibido)

  return {
    compartidos,
    ajustes,
    meDebenTotal,
    deboTotal,
    balanceBruto,
    pagos,
    arrastres,
    pagosRecibidos,
    pagosRealizados,
    arrastreNeto,
    balance,
    misPagos,
    otrosPagos,
    totalGastado: misPagos + otrosPagos,
    estanAMano: Math.abs(balance) <= UMBRAL_BALANCE_MANO,
  }
}
