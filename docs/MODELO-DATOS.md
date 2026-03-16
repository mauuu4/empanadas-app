# Modelo de Datos - Empanadas App

Base de datos: **PostgreSQL** (Supabase)

---

## Diagrama de Relaciones

```
vendedores ──┐
             ├── asignaciones ──┐
productos ───┘                  │
                                ├── jornadas ── semanas
gastos ─────────────────────────┤
transferencias ─────────────────┤
descuentos ─────────────────────┘
pagas ──────────────────────────┘
inversiones ── semanas
```

---

## Tablas

### `vendedores`

Personas que salen a vender. El administrador tambien es vendedor.

| Campo        | Tipo          | Restricciones                         | Descripcion                                    |
| ------------ | ------------- | ------------------------------------- | ---------------------------------------------- |
| `id`         | `uuid`        | PK, default gen_random_uuid()         | Identificador unico                            |
| `nombre`     | `text`        | NOT NULL                              | Nombre completo                                |
| `pin`        | `text`        | NOT NULL, UNIQUE                      | PIN de 4 digitos (hasheado) para autenticacion |
| `rol`        | `text`        | NOT NULL, CHECK ('admin', 'vendedor') | Rol en el sistema                              |
| `activo`     | `boolean`     | NOT NULL, default true                | Si el vendedor esta activo                     |
| `created_at` | `timestamptz` | NOT NULL, default now()               | Fecha de creacion                              |
| `updated_at` | `timestamptz` | NOT NULL, default now()               | Ultima actualizacion                           |

**Indices:**

- `idx_vendedores_pin` en `pin` (para login rapido)
- `idx_vendedores_activo` en `activo`

---

### `productos`

Catalogo de productos disponibles para la venta. Los precios pueden cambiar.

| Campo                  | Tipo            | Restricciones                 | Descripcion                                              |
| ---------------------- | --------------- | ----------------------------- | -------------------------------------------------------- |
| `id`                   | `uuid`          | PK, default gen_random_uuid() | Identificador unico                                      |
| `nombre`               | `text`          | NOT NULL                      | Nombre del producto (ej: "Empanadas de verde")           |
| `descripcion`          | `text`          |                               | Descripcion opcional (ej: "Pollo y queso, mismo precio") |
| `unidades_por_bandeja` | `integer`       | NOT NULL, CHECK > 0           | Cantidad de unidades en la bandeja                       |
| `precio`               | `numeric(10,2)` | NOT NULL, CHECK >= 0          | Precio por bandeja en dolares                            |
| `activo`               | `boolean`       | NOT NULL, default true        | Si el producto esta disponible                           |
| `orden`                | `integer`       | NOT NULL, default 0           | Orden de aparicion en la interfaz                        |
| `created_at`           | `timestamptz`   | NOT NULL, default now()       | Fecha de creacion                                        |
| `updated_at`           | `timestamptz`   | NOT NULL, default now()       | Ultima actualizacion                                     |

**Indices:**

- `idx_productos_activo` en `activo`

**Datos iniciales:**

| nombre                 | unidades_por_bandeja | precio |
| ---------------------- | -------------------- | ------ |
| Empanadas de verde     | 5                    | 1.75   |
| Bolones mixtos (3 uds) | 3                    | 1.75   |
| Bolones mixtos (4 uds) | 4                    | 2.25   |
| Bolones mixtos (6 uds) | 6                    | 3.50   |
| Majado                 | 1                    | 1.50   |

---

### `semanas`

Representa una semana de negocio (viernes a jueves).

| Campo           | Tipo            | Restricciones                                             | Descripcion                           |
| --------------- | --------------- | --------------------------------------------------------- | ------------------------------------- |
| `id`            | `uuid`          | PK, default gen_random_uuid()                             | Identificador unico                   |
| `fecha_inicio`  | `date`          | NOT NULL, UNIQUE                                          | Viernes de inicio de la semana        |
| `fecha_fin`     | `date`          | NOT NULL                                                  | Jueves de fin de la semana            |
| `saldo_inicial` | `numeric(10,2)` | NOT NULL, default 0                                       | Saldo que quedo de la semana anterior |
| `estado`        | `text`          | NOT NULL, CHECK ('abierta', 'cerrada'), default 'abierta' | Estado de la semana                   |
| `notas`         | `text`          |                                                           | Notas opcionales                      |
| `created_at`    | `timestamptz`   | NOT NULL, default now()                                   | Fecha de creacion                     |
| `updated_at`    | `timestamptz`   | NOT NULL, default now()                                   | Ultima actualizacion                  |

**Campos calculados (no almacenados, se calculan mediante queries):**

- `total_ventas`: suma de ventas de todas las jornadas de la semana
- `total_gastos`: suma de todos los gastos
- `total_transferencias`: suma de todas las transferencias
- `total_descuentos`: suma de todos los descuentos
- `total_alcancia`: suma de la alcancia de todos los dias
- `total_pagas`: suma de todas las pagas
- `total_inversiones`: suma de todas las inversiones de la semana
- `saldo_final`: saldo_inicial + total_ventas - total_gastos - total_transferencias - total_descuentos - total_alcancia - total_pagas - total_inversiones

**Indices:**

- `idx_semanas_fecha_inicio` en `fecha_inicio`
- `idx_semanas_estado` en `estado`

---

### `jornadas`

Un dia de venta. Puede haber maximo una jornada por dia.

| Campo            | Tipo            | Restricciones                                             | Descripcion                   |
| ---------------- | --------------- | --------------------------------------------------------- | ----------------------------- |
| `id`             | `uuid`          | PK, default gen_random_uuid()                             | Identificador unico           |
| `semana_id`      | `uuid`          | FK -> semanas(id), NOT NULL                               | Semana a la que pertenece     |
| `fecha`          | `date`          | NOT NULL, UNIQUE                                          | Fecha de la jornada           |
| `estado`         | `text`          | NOT NULL, CHECK ('abierta', 'cerrada'), default 'abierta' | Estado de la jornada          |
| `monto_alcancia` | `numeric(10,2)` | NOT NULL, default 0                                       | Monto destinado a la alcancia |
| `notas`          | `text`          |                                                           | Notas del dia                 |
| `created_at`     | `timestamptz`   | NOT NULL, default now()                                   | Fecha de creacion             |
| `updated_at`     | `timestamptz`   | NOT NULL, default now()                                   | Ultima actualizacion          |

**Indices:**

- `idx_jornadas_semana_id` en `semana_id`
- `idx_jornadas_fecha` en `fecha`
- `idx_jornadas_estado` en `estado`

---

### `asignaciones`

Productos que lleva cada vendedor en una jornada.

| Campo               | Tipo          | Restricciones                  | Descripcion                                     |
| ------------------- | ------------- | ------------------------------ | ----------------------------------------------- |
| `id`                | `uuid`        | PK, default gen_random_uuid()  | Identificador unico                             |
| `jornada_id`        | `uuid`        | FK -> jornadas(id), NOT NULL   | Jornada de venta                                |
| `vendedor_id`       | `uuid`        | FK -> vendedores(id), NOT NULL | Vendedor asignado                               |
| `producto_id`       | `uuid`        | FK -> productos(id), NOT NULL  | Producto asignado                               |
| `cantidad_inicial`  | `integer`     | NOT NULL, CHECK >= 0           | Bandejas que lleva                              |
| `cantidad_sobrante` | `integer`     | CHECK >= 0, default NULL       | Bandejas que le sobraron (NULL = no ha cerrado) |
| `created_at`        | `timestamptz` | NOT NULL, default now()        | Fecha de creacion                               |
| `updated_at`        | `timestamptz` | NOT NULL, default now()        | Ultima actualizacion                            |

**Restriccion unica:** `UNIQUE(jornada_id, vendedor_id, producto_id)` - Un vendedor no puede tener el mismo producto duplicado en la misma jornada.

**Campos calculados:**

- `cantidad_vendida` = `cantidad_inicial` - `cantidad_sobrante`
- `monto_venta` = `cantidad_vendida` \* precio del producto

**Indices:**

- `idx_asignaciones_jornada` en `jornada_id`
- `idx_asignaciones_vendedor` en `vendedor_id`
- `idx_asignaciones_jornada_vendedor` en `(jornada_id, vendedor_id)`

---

### `gastos`

Egresos de los vendedores durante la jornada de venta.

| Campo         | Tipo            | Restricciones                  | Descripcion                              |
| ------------- | --------------- | ------------------------------ | ---------------------------------------- |
| `id`          | `uuid`          | PK, default gen_random_uuid()  | Identificador unico                      |
| `jornada_id`  | `uuid`          | FK -> jornadas(id), NOT NULL   | Jornada en la que ocurrio                |
| `vendedor_id` | `uuid`          | FK -> vendedores(id), NOT NULL | Vendedor que hizo el gasto               |
| `descripcion` | `text`          | NOT NULL                       | Descripcion del gasto (ej: "Refrigerio") |
| `monto`       | `numeric(10,2)` | NOT NULL, CHECK > 0            | Monto del gasto                          |
| `created_at`  | `timestamptz`   | NOT NULL, default now()        | Fecha de creacion                        |

**Indices:**

- `idx_gastos_jornada` en `jornada_id`
- `idx_gastos_vendedor` en `vendedor_id`
- `idx_gastos_jornada_vendedor` en `(jornada_id, vendedor_id)`

---

### `transferencias`

Pagos recibidos por transferencia bancaria (no es efectivo).

| Campo         | Tipo            | Restricciones                  | Descripcion                  |
| ------------- | --------------- | ------------------------------ | ---------------------------- |
| `id`          | `uuid`          | PK, default gen_random_uuid()  | Identificador unico          |
| `jornada_id`  | `uuid`          | FK -> jornadas(id), NOT NULL   | Jornada en la que se recibio |
| `vendedor_id` | `uuid`          | FK -> vendedores(id), NOT NULL | Vendedor que recibio el pago |
| `monto`       | `numeric(10,2)` | NOT NULL, CHECK > 0            | Monto de la transferencia    |
| `descripcion` | `text`          |                                | Descripcion opcional         |
| `created_at`  | `timestamptz`   | NOT NULL, default now()        | Fecha de creacion            |

**Indices:**

- `idx_transferencias_jornada` en `jornada_id`
- `idx_transferencias_vendedor` en `vendedor_id`

---

### `descuentos`

Rebajas otorgadas durante la venta.

| Campo         | Tipo            | Restricciones                  | Descripcion                           |
| ------------- | --------------- | ------------------------------ | ------------------------------------- |
| `id`          | `uuid`          | PK, default gen_random_uuid()  | Identificador unico                   |
| `jornada_id`  | `uuid`          | FK -> jornadas(id), NOT NULL   | Jornada en la que ocurrio             |
| `vendedor_id` | `uuid`          | FK -> vendedores(id), NOT NULL | Vendedor que otorgo el descuento      |
| `monto`       | `numeric(10,2)` | NOT NULL, CHECK > 0            | Monto del descuento                   |
| `descripcion` | `text`          |                                | Descripcion (ej: "Empanadas a $1.50") |
| `created_at`  | `timestamptz`   | NOT NULL, default now()        | Fecha de creacion                     |

**Indices:**

- `idx_descuentos_jornada` en `jornada_id`
- `idx_descuentos_vendedor` en `vendedor_id`

---

### `pagas`

Pago a trabajadores (vendedores o ayudantes) al final del dia.

| Campo        | Tipo            | Restricciones                 | Descripcion                             |
| ------------ | --------------- | ----------------------------- | --------------------------------------- |
| `id`         | `uuid`          | PK, default gen_random_uuid() | Identificador unico                     |
| `jornada_id` | `uuid`          | FK -> jornadas(id), NOT NULL  | Jornada del pago                        |
| `persona`    | `text`          | NOT NULL                      | Nombre de la persona que recibe el pago |
| `monto`      | `numeric(10,2)` | NOT NULL, CHECK > 0           | Monto pagado                            |
| `created_at` | `timestamptz`   | NOT NULL, default now()       | Fecha de creacion                       |

**Indices:**

- `idx_pagas_jornada` en `jornada_id`

**Nota:** Se usa `persona` (texto libre) en lugar de FK a vendedores porque a veces se paga a ayudantes que no son vendedores registrados en el sistema.

---

### `inversiones`

Compras de insumos y gastos especiales (viernes, martes, domingos, etc.).

| Campo         | Tipo            | Restricciones                                   | Descripcion               |
| ------------- | --------------- | ----------------------------------------------- | ------------------------- |
| `id`          | `uuid`          | PK, default gen_random_uuid()                   | Identificador unico       |
| `semana_id`   | `uuid`          | FK -> semanas(id), NOT NULL                     | Semana a la que pertenece |
| `fecha`       | `date`          | NOT NULL                                        | Fecha de la compra/gasto  |
| `descripcion` | `text`          | NOT NULL                                        | Descripcion de la compra  |
| `monto`       | `numeric(10,2)` | NOT NULL, CHECK > 0                             | Monto total               |
| `tipo`        | `text`          | NOT NULL, CHECK ('inversion', 'gasto_personal') | Tipo de gasto             |
| `created_at`  | `timestamptz`   | NOT NULL, default now()                         | Fecha de creacion         |

**Indices:**

- `idx_inversiones_semana` en `semana_id`
- `idx_inversiones_fecha` en `fecha`
- `idx_inversiones_tipo` en `tipo`

**Tipos:**

- `inversion`: Compras de insumos para el negocio (viernes, martes)
- `gasto_personal`: Gastos personales/familiares (domingos u otros dias)

---

## Politicas de Seguridad (Row Level Security - Supabase)

Supabase usa RLS para controlar el acceso a los datos a nivel de fila.

### Reglas generales

| Tabla            | Lectura | Escritura     | Eliminacion   |
| ---------------- | ------- | ------------- | ------------- |
| `vendedores`     | Todos   | Solo admin    | Solo admin    |
| `productos`      | Todos   | Solo admin    | Solo admin    |
| `semanas`        | Todos   | Solo admin    | Solo admin    |
| `jornadas`       | Todos   | Solo admin    | Solo admin    |
| `asignaciones`   | Todos   | Dueno o admin | Dueno o admin |
| `gastos`         | Todos   | Dueno o admin | Dueno o admin |
| `transferencias` | Todos   | Dueno o admin | Dueno o admin |
| `descuentos`     | Todos   | Dueno o admin | Dueno o admin |
| `pagas`          | Todos   | Solo admin    | Solo admin    |
| `inversiones`    | Todos   | Solo admin    | Solo admin    |

**"Dueno"** = el vendedor cuyo `vendedor_id` coincide con el usuario autenticado.

---

## Funciones de Base de Datos (SQL)

### `calcular_venta_vendedor(p_jornada_id uuid, p_vendedor_id uuid)`

Retorna el resumen de un vendedor en una jornada:

- venta_bruta
- total_gastos
- total_transferencias
- total_descuentos
- efectivo_a_entregar

### `calcular_consolidado_dia(p_jornada_id uuid)`

Retorna el consolidado de todos los vendedores en una jornada:

- venta_total
- total_gastos
- total_transferencias
- total_descuentos
- efectivo_total
- monto_alcancia
- total_pagas
- saldo_dia

### `calcular_saldo_semanal(p_semana_id uuid)`

Retorna el saldo acumulado de la semana:

- saldo_inicial
- total_saldos_diarios
- total_inversiones
- total_gastos_personales
- saldo_actual

---

## Triggers

### `trigger_updated_at`

En todas las tablas que tienen `updated_at`: actualiza automaticamente el campo cuando se modifica un registro.

### `trigger_validar_sobrante`

En `asignaciones`: valida que `cantidad_sobrante` no sea mayor que `cantidad_inicial`.

---

## Migracion SQL

El archivo de migracion completo se generara en `supabase/migrations/` cuando se inicie el desarrollo. Incluira:

1. Creacion de todas las tablas
2. Indices
3. Funciones SQL
4. Triggers
5. Politicas RLS
6. Datos iniciales (seed) de productos
