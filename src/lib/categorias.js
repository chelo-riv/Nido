export const CATEGORIAS = {
  supermercado:    { label: 'Supermercado',    emoji: '🛒' },
  hogar:           { label: 'Hogar',           emoji: '🏠' },
  transporte:      { label: 'Transporte',      emoji: '🚗' },
  restaurante:     { label: 'Restaurantes',    emoji: '🍽️' },
  entretenimiento: { label: 'Entretenimiento', emoji: '🎬' },
  salud:           { label: 'Salud',           emoji: '💊' },
  servicios:       { label: 'Servicios',       emoji: '💡' },
  otros:           { label: 'Otros',           emoji: '📦' },
}

export const LISTA_CATEGORIAS = Object.entries(CATEGORIAS).map(([value, { label, emoji }]) => ({
  value,
  label,
  emoji,
}))
