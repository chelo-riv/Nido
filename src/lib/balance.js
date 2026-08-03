// Cálculo del balance neto de un mes. Lo usan Dashboard y Balances para no repetir la fórmula.

// Diferencias menores a esto son ruido de redondeo de porcentajes: se considera que están a mano.
export const UMBRAL_BALANCE_MANO = 0.5

// Valor de liquidaciones.tipo para los movimientos que solo mueven un saldo de un mes a otro.
export const TIPO_ARRASTRE = 'arrastre'

// Las liquidaciones viejas no tienen tipo: son pagos reales.
export function esArrastre(liquidacion) {
  return liquidacion.tipo === TIPO_ARRASTRE
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

  const meDebenTotal = compartidos
    .filter(g => g.pagado_por === userId)
    .reduce((a, g) => a + parteDelOtro(g), 0)

  const deboTotal = compartidos
    .filter(g => g.pagado_por !== userId)
    .reduce((a, g) => a + parteDelOtro(g), 0)

  const balanceBruto = meDebenTotal - deboTotal

  // Transferencias de dinero real vs. saldos movidos entre meses: cuentan igual en la
  // fórmula pero se muestran distinto, porque el arrastre no movió dinero.
  const pagos = liquidaciones.filter(l => !esArrastre(l))
  const arrastres = liquidaciones.filter(esArrastre)

  const pagosRecibidos = sumarMontos(pagos.filter(l => l.pagado_a === userId))
  const pagosRealizados = sumarMontos(pagos.filter(l => l.pagado_por === userId))

  const arrastreRecibido = sumarMontos(arrastres.filter(l => l.pagado_a === userId))
  const arrastreRealizado = sumarMontos(arrastres.filter(l => l.pagado_por === userId))

  // Positivo = me deben | negativo = debo.
  const balance = balanceBruto
    - pagosRecibidos + pagosRealizados
    - arrastreRecibido + arrastreRealizado

  const misPagos = sumarMontos(gastos.filter(g => g.pagado_por === userId))
  const otrosPagos = sumarMontos(gastos.filter(g => g.pagado_por !== userId))

  return {
    compartidos,
    meDebenTotal,
    deboTotal,
    balanceBruto,
    pagos,
    arrastres,
    pagosRecibidos,
    pagosRealizados,
    // Cuánto de este balance viene de saldos arrastrados (positivo = suma a mi favor).
    arrastreNeto: arrastreRealizado - arrastreRecibido,
    balance,
    misPagos,
    otrosPagos,
    totalGastado: misPagos + otrosPagos,
    estanAMano: Math.abs(balance) <= UMBRAL_BALANCE_MANO,
  }
}
