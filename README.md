# Nido 🪺
PWA para gestión del hogar en pareja — gastos compartidos, balances y lista de deseos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 8 |
| Estilos | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Routing | React Router v7 |
| Base de datos | Supabase (PostgreSQL + Auth) |
| Gráficas | Recharts |
| Íconos | Lucide React |
| PWA | vite-plugin-pwa (Workbox) |

---

## Setup local

### 1. Clonar e instalar
```bash
npm install --legacy-peer-deps
```
> `--legacy-peer-deps` es necesario porque `vite-plugin-pwa` aún no declaró soporte oficial para Vite 8.

### 2. Variables de entorno
Crear `.env` en la raíz (ver `.env.example`):
```
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Base de datos
Correr los siguientes bloques SQL en el SQL Editor de Supabase:

```sql
-- Perfiles de usuario
create table perfiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  created_at timestamptz default now()
);

-- Gastos compartidos
create table gastos (
  id uuid default gen_random_uuid() primary key,
  monto numeric(10,2) not null,
  descripcion text,
  categoria text not null,
  pagado_por uuid references auth.users not null,
  fecha date not null default current_date,
  tipo text not null default 'compartido',
  porcentaje_pagador integer not null default 50,
  created_at timestamptz default now()
);

-- Presupuestos por categoría
create table presupuestos (
  id uuid default gen_random_uuid() primary key,
  categoria text not null unique,
  monto_limite numeric(10,2) not null,
  updated_at timestamptz default now()
);

-- Liquidaciones (saldos de deuda)
create table liquidaciones (
  id uuid default gen_random_uuid() primary key,
  monto numeric(10,2) not null,
  pagado_por uuid references auth.users not null,
  pagado_a uuid references auth.users not null,
  fecha date not null default current_date,
  created_at timestamptz default now()
);

-- Wishlist del hogar
create table wishlist (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  precio_estimado numeric(10,2),
  prioridad text not null default 'media',
  agregado_por uuid references auth.users not null,
  comprado boolean not null default false,
  comprado_en date,
  created_at timestamptz default now()
);

-- RLS: acceso total a usuarios autenticados
alter table perfiles enable row level security;
alter table gastos enable row level security;
alter table presupuestos enable row level security;
alter table liquidaciones enable row level security;
alter table wishlist enable row level security;

create policy "usuarios autenticados" on perfiles for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on gastos for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on presupuestos for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on liquidaciones for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on wishlist for all using (auth.role() = 'authenticated');
```

### 4. Correr en desarrollo
```bash
npm run dev
```

### 5. Build de producción
```bash
npm run build
```

---

## Estructura de carpetas

```
src/
├── components/
│   └── BottomNav.jsx        # Barra de navegación inferior fija (5 tabs)
├── hooks/
│   └── useAuth.js           # Hook que expone { user, loading } via Supabase session
├── lib/
│   ├── supabase.js          # Cliente de Supabase (singleton)
│   └── categorias.js        # Catálogo de categorías con emoji y label
├── pages/
│   ├── Login.jsx            # Login + Registro (tabs)
│   ├── Dashboard.jsx        # Resumen del mes + balance + últimos gastos
│   ├── Gastos.jsx           # Lista filtrable + editar/eliminar inline
│   ├── AgregarGasto.jsx     # Formulario de nuevo gasto
│   ├── EditarGasto.jsx      # Formulario de edición (/editar/:id)
│   ├── Balances.jsx         # Balance neto + desglose + liquidaciones
│   ├── Presupuestos.jsx     # Límites por categoría con barra de progreso
│   ├── Graficas.jsx         # Pie chart por categoría + barras por semana
│   └── Wishlist.jsx         # Lista de deseos del hogar con prioridades
└── App.jsx                  # Router principal + RutaProtegida HOC
```

---

## Esquema de base de datos

### `auth.users` (Supabase built-in)
Maneja autenticación. La app soporta exactamente 2 usuarios que comparten los mismos datos — no hay concepto de multi-tenant ni households.

### `perfiles`
Extiende `auth.users` con nombre legible. Se crea automáticamente en el primer login usando el prefijo del email si no existe.

### `gastos`
Campo clave: `tipo` + `porcentaje_pagador`.

**Lógica de balance:**
- `tipo = 'personal'` → no genera deuda. Aparece en listas y gráficas pero no en el cálculo de balance.
- `tipo = 'compartido'` → el porcentaje que absorbe **el pagador** determina cuánto debe el otro:

```
deuda_del_otro = monto * (1 - porcentaje_pagador / 100)
```

Ejemplo:
- Yo pago $1,000, `porcentaje_pagador = 30` (yo absorbo 30%) → mi pareja me debe $700
- Mi pareja paga $1,000, `porcentaje_pagador = 70` (ella absorbe 70%) → yo le debo $300

El porcentaje es **por gasto**, no global. Cada gasto puede tener su propia proporción.

### `liquidaciones`
Pagos para saldar la deuda acumulada. El balance neto se calcula así:

```js
const balanceBruto = meDebenTotal - deboTotal  // de gastos compartidos

const pagosRecibidos = liquidaciones
  .filter(l => l.pagado_a === user.id)
  .reduce((a, l) => a + l.monto, 0)

const pagosRealizados = liquidaciones
  .filter(l => l.pagado_por === user.id)
  .reduce((a, l) => a + l.monto, 0)

const balanceNeto = balanceBruto - pagosRecibidos + pagosRealizados
// positivo = me deben | negativo = debo
```

### `presupuestos`
Una fila por categoría (`UNIQUE`). El progreso se calcula en el frontend comparando el total de gastos del mes en esa categoría contra `monto_limite`.

### `wishlist`
Lista compartida entre los dos usuarios. `comprado = true` mueve el item a la sección de completados (con tachado).

---

## Row Level Security

Todas las tablas usan la misma política simple:
```sql
auth.role() = 'authenticated'
```
Cualquier usuario autenticado puede leer y escribir todos los datos. Esto es intencional — los dos usuarios del hogar comparten todo. Si se escala a múltiples parejas habría que agregar `hogar_id` y filtrar por él.

---

## Decisiones de arquitectura

**Sin multi-household**
Todos los usuarios registrados en el proyecto de Supabase pertenecen al mismo hogar implícitamente. Simple y suficiente para el caso de uso de 2 personas.

**Balance por mes, no acumulativo**
El Dashboard y Balances muestran el mes en curso. Las deudas de meses anteriores no se arrastran automáticamente — se asume que se saldan mes a mes con liquidaciones.

**Perfil auto-creado en primer login**
No hay pantalla de onboarding. El nombre se genera del email y puede ajustarse editando directamente en Supabase Table Editor por ahora.

**Tailwind v4**
Configuración via CSS (`@import "tailwindcss"` + `@theme {}`), sin `tailwind.config.js`. Todos los tokens de diseño están en `src/index.css`.

---

## Sistema de diseño

### Colores
| Token | Hex | Uso |
|---|---|---|
| cream | `#FAF7F4` | Fondo principal |
| white | `#FFFFFF` | Tarjetas y superficies |
| terracota | `#D4845A` | Acento principal, botones, CTA |
| terracota-dark | `#C0614A` | Error, alerta, límite superado |
| salvia | `#8BAF8D` | Positivo, éxito, balance a favor |
| text | `#2D2926` | Texto principal |
| text-muted | `#8C7E75` | Texto secundario, placeholders |
| border | `#EDE8E3` | Bordes y separadores |

### Tipografía
**Plus Jakarta Sans** — Google Fonts, pesos 400 / 500 / 600 / 700.

### Categorías
Definidas en `src/lib/categorias.js`. Para agregar una nueva categoría basta con añadir una entrada al objeto `CATEGORIAS`:
```js
nueva: { label: 'Nueva categoría', emoji: '🎯' }
```

---

## Notas de compatibilidad

| Paquete | Situación |
|---|---|
| `vite-plugin-pwa` | Requiere `--legacy-peer-deps` (no declara soporte para Vite 8 aún, funciona en runtime) |
| `lucide-react` | Requiere `--legacy-peer-deps` por la misma razón |
| `react-is` | Debe estar en `v18.3.1` exactamente — v19 eliminó `isFragment` que usa Recharts internamente |
| Node.js | Probado en v25.9.0 |
