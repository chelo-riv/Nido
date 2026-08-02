// Cálculo del balance neto de un mes. Lo usan Dashboard y Balances para no repetir la fórmula.

// Diferencias menores a esto son ruido de redondeo de porcentajes: se considera que están a mano.
export const UMBRAL_BALANCE_MANO = 0.5

// Los gastos sin tipo son de antes de que existiera el campo: cuentan como compartidos.
function esCompartido(gasto) {
  return gasto.tipo === 'compartido' || !gasto.tipo
}

// Parte del gasto que le toca al que NO pagó.
function parteDelOtro(gasto) {
  return Number(gasto.monto) * (1 - (gasto.porcentaje_pagador ?? 50) / 100)
}

export function calcularBalance({ gastos = [], liquidaciones = [], userId }) {
  const compartidos = gastos.filter(esCompartido)

  const meDebenTotal = compartidos
    .filter(g => g.pagado_por === userId)
    .reduce((a, g) => a + parteDelOtro(g), 0)

  const deboTotal = compartidos
    .filter(g => g.pagado_por !== userId)
    .reduce((a, g) => a + parteDelOtro(g), 0)

  const balanceBruto = meDebenTotal - deboTotal

  const pagosRecibidos = liquidaciones
    .filter(l => l.pagado_a === userId)
    .reduce((a, l) => a + Number(l.monto), 0)

  const pagosRealizados = liquidaciones
    .filter(l => l.pagado_por === userId)
    .reduce((a, l) => a + Number(l.monto), 0)

  // Positivo = me deben | negativo = debo.
  const balance = balanceBruto - pagosRecibidos + pagosRealizados

  const misPagos = gastos
    .filter(g => g.pagado_por === userId)
    .reduce((a, g) => a + Number(g.monto), 0)

  const otrosPagos = gastos
    .filter(g => g.pagado_por !== userId)
    .reduce((a, g) => a + Number(g.monto), 0)

  return {
    compartidos,
    meDebenTotal,
    deboTotal,
    balanceBruto,
    pagosRecibidos,
    pagosRealizados,
    balance,
    misPagos,
    otrosPagos,
    totalGastado: misPagos + otrosPagos,
    estanAMano: Math.abs(balance) <= UMBRAL_BALANCE_MANO,
  }
}
