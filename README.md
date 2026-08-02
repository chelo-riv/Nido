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
  nota text,
  created_at timestamptz default now()
);

-- Wishlists (varias listas con título) + ítems
create table if not exists wishlists (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  creado_por uuid references auth.users on delete cascade not null,
  archivada boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists wishlist_items (
  id uuid default gen_random_uuid() primary key,
  wishlist_id uuid references wishlists(id) on delete cascade not null,
  nombre text not null,
  descripcion text,
  link text,
  precio_estimado numeric(10,2),
  prioridad text not null default 'media',
  agregado_por uuid references auth.users not null,
  comprado boolean not null default false,
  comprado_en date,
  created_at timestamptz default now()
);

-- Lista del súper (hogar). IF NOT EXISTS evita error 42P07 si ya creaste estas tablas antes.
create table if not exists listas_super (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  creado_por uuid references auth.users on delete cascade not null,
  completada boolean not null default false,
  completada_en date,
  created_at timestamptz default now()
);

create table if not exists items_lista (
  id uuid default gen_random_uuid() primary key,
  lista_id uuid references listas_super(id) on delete cascade not null,
  nombre text not null,
  categoria text not null default 'otros',
  checked boolean not null default false,
  checked_por uuid references auth.users on delete set null,
  checked_en timestamptz,
  created_at timestamptz default now()
);

-- RLS: acceso total a usuarios autenticados
alter table perfiles enable row level security;
alter table gastos enable row level security;
alter table presupuestos enable row level security;
alter table liquidaciones enable row level security;
alter table wishlists enable row level security;
alter table wishlist_items enable row level security;
alter table listas_super enable row level security;
alter table items_lista enable row level security;

create policy "usuarios autenticados" on perfiles for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on gastos for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on presupuestos for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados" on liquidaciones for all using (auth.role() = 'authenticated');

drop policy if exists "usuarios autenticados" on wishlists;
drop policy if exists "usuarios autenticados" on wishlist_items;
create policy "usuarios autenticados" on wishlists for all to authenticated using (true) with check (true);
create policy "usuarios autenticados" on wishlist_items for all to authenticated using (true) with check (true);

drop policy if exists "usuarios autenticados" on listas_super;
drop policy if exists "usuarios autenticados" on items_lista;
create policy "usuarios autenticados" on listas_super for all to authenticated using (true) with check (true);
create policy "usuarios autenticados" on items_lista for all to authenticated using (true) with check (true);
```

**Wishlists — proyectos que ya tenían la tabla `wishlist` (modelo antiguo):** la app usa `wishlists` y `wishlist_items`. Crea esas tablas y políticas con el bloque de arriba (o solo el fragmento `create table if not exists` + `alter` + `create policy` si el resto ya existe). Los datos viejos en `wishlist` no se migran solos; puedes copiarlos en el Table Editor o dejar la tabla sin usar.

**Proyectos ya creados:** en el SQL Editor de Supabase, añade la columna opcional de nota en liquidaciones:

```sql
alter table liquidaciones add column if not exists nota text;
```

**Lista del súper — error RLS en `items_lista`:** si al agregar un ítem aparece *new row violates row-level security policy*, las tablas existen pero faltan políticas que permitan `INSERT` (o el `WITH CHECK` no aplica).

Si aparece el error `relation "listas_super" already exists` (42P07), no vuelvas a ejecutar el `create table` del bloque grande del paso 3: las tablas ya existen. Solo ejecuta el siguiente bloque (solo políticas RLS):

```sql
do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname = 'public' and tablename = 'listas_super') loop
    execute format('drop policy if exists %I on listas_super', r.policyname);
  end loop;
  for r in (select policyname from pg_policies where schemaname = 'public' and tablename = 'items_lista') loop
    execute format('drop policy if exists %I on items_lista', r.policyname);
  end loop;
end $$;

alter table listas_super enable row level security;
alter table items_lista enable row level security;

create policy "usuarios autenticados" on listas_super
  for all to authenticated using (true) with check (true);

create policy "usuarios autenticados" on items_lista
  for all to authenticated using (true) with check (true);
```

Mismo criterio que el resto de la app: cualquier usuario **autenticado** puede leer y escribir (hogar de dos personas sin `hogar_id`).

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
│   ├── BottomNav.jsx        # Barra de navegación inferior fija (5 tabs)
│   └── SelectorMes.jsx      # Navegador « Mes Año » compartido por las pantallas de finanzas
├── hooks/
│   └── useAuth.js           # Hook que expone { user, loading } via Supabase session
├── lib/
│   ├── supabase.js          # Cliente de Supabase (singleton)
│   ├── categorias.js        # Catálogo de categorías con emoji y label
│   ├── fechas.js            # Helpers de mes "YYYY-MM" (rango, etiqueta, param ?mes=)
│   └── balance.js           # Cálculo del balance neto de un mes (gastos + liquidaciones)
├── pages/
│   ├── Login.jsx            # Login + Registro (tabs)
│   ├── Dashboard.jsx        # Balance del mes con navegación entre meses + últimos gastos
│   ├── Gastos.jsx           # Lista por mes (navegación) + filtros + editar/eliminar inline
│   ├── AgregarGasto.jsx     # Formulario de nuevo gasto (acepta ?fecha= para meses pasados)
│   ├── EditarGasto.jsx      # Formulario de edición (/editar/:id)
│   ├── Balances.jsx         # Balance por mes + desglose + liquidaciones (dirección, cantidad, fecha, nota)
│   ├── Presupuestos.jsx     # Límites por categoría con barra de progreso
│   ├── Graficas.jsx         # Pie chart por categoría + barras por semana
│   ├── Wishlist.jsx         # Índice de wishlists (crear / abrir / archivadas)
│   └── WishlistDetalle.jsx  # Ítems de una wishlist (link, notas, prioridad, comprado)
└── App.jsx                  # Router principal + RutaProtegida HOC
```

---

## Meses pasados y ajustes

Todas las pantallas de finanzas se ven mes por mes y se navegan con el mismo control « Mes Año »:

| Pantalla | Qué se ve del mes seleccionado | Qué se puede ajustar |
|---|---|---|
| Dashboard | Balance neto, quién pagó cuánto, transferencias y últimos gastos | Atajo para agregar un gasto con fecha de ese mes |
| Gastos | Lista filtrable de gastos | Editar o eliminar cualquier gasto |
| Balances | Balance neto, desglose y pagos registrados | Registrar un pago con la fecha que sea |
| Gráficas | Categorías y semanas | — |

Detalles útiles:

- El mes viaja entre pantallas con `?mes=YYYY-MM`, así que al entrar a Gastos o Balances desde el Dashboard se abre el mismo mes.
- No se puede avanzar más allá del mes actual; el enlace «Ir a este mes» regresa de un toque.
- Si el mes que se está viendo no tiene nada, el Dashboard muestra atajos a los meses que sí tienen movimiento.
- Al agregar un gasto desde un mes pasado, la fecha se propone en ese mes y al guardar se vuelve al mes del gasto.
- Al registrar un pago en Balances, la fecha por defecto es el último día del mes visible (u hoy, si es el mes actual). Si se guarda con una fecha de otro mes, aparece un aviso con el atajo para ir a verlo.

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
Pagos para saldar la deuda acumulada. `fecha` decide en qué mes entra el pago (solo se cargan las liquidaciones del mes que se está viendo). `nota` es texto libre opcional (comentario o referencia del traspaso).

El balance neto se calcula así:

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

### `wishlists` y `wishlist_items`
Varias wishlists con `titulo`; cada ítem tiene `nombre`, `descripcion` y `link` opcionales, `precio_estimado` y `prioridad`. `comprado = true` mueve el ítem a completados. `archivada` en la lista agrupa wishlists terminadas sin borrarlas.

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
El Dashboard (tarjeta «Balance del mes») y Balances comparten la misma lógica de balance neto (`src/lib/balance.js`) incluyendo liquidaciones del mes visible. Las deudas de meses anteriores no se arrastran automáticamente — se asume que se saldan mes a mes con liquidaciones.

**El mes visible vive en la URL**
Dashboard, Gastos, Balances y Gráficas guardan el mes que se está viendo en `?mes=YYYY-MM` (se omite cuando es el mes actual). Así el mes se conserva al recargar y se arrastra al saltar de una pantalla a otra. Todo el manejo de meses está en `src/lib/fechas.js` y el navegador visual en `src/components/SelectorMes.jsx`.

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
