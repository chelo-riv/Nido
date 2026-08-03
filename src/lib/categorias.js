export const CATEGORIA_AJUSTES = 'ajustes'

export const CATEGORIAS = {
  supermercado:    { label: 'Supermercado',    emoji: '🛒' },
  hogar:           { label: 'Hogar',           emoji: '🏠' },
  transporte:      { label: 'Transporte',      emoji: '🚗' },
  restaurante:     { label: 'Restaurantes',    emoji: '🍽️' },
  entretenimiento: { label: 'Entretenimiento', emoji: '🎬' },
  salud:           { label: 'Salud',           emoji: '💊' },
  servicios:       { label: 'Servicios',       emoji: '💡' },
  otros:           { label: 'Otros',           emoji: '📦' },
  // Solo la crea el botón de arrastrar saldo; no se ofrece al agregar un gasto a mano.
  ajustes:         { label: 'Ajustes',         emoji: '🔁', soloSistema: true },
}

function aLista(entries) {
  return entries.map(([value, { label, emoji }]) => ({ value, label, emoji }))
}

// Para formularios de gasto y presupuestos (sin categorías solo del sistema).
export const LISTA_CATEGORIAS = aLista(
  Object.entries(CATEGORIAS).filter(([, c]) => !c.soloSistema)
)

// Incluye Ajustes: filtros de la lista de gastos.
export const LISTA_CATEGORIAS_FILTRO = aLista(Object.entries(CATEGORIAS))

export function esGastoAjuste(gasto) {
  return gasto?.categoria === CATEGORIA_AJUSTES
}
