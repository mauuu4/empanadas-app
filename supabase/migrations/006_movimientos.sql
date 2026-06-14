-- Migration 006: unificar gastos + transferencias + descuentos en `movimientos`
-- Las tres tablas tenían estructura casi idéntica (jornada_id, vendedor_id, monto,
-- descripcion, created_at); solo los gastos llevan `categoria`. Se consolidan en
-- una sola tabla con una columna `tipo`. La integridad de la categoría (solo en
-- gastos) la garantiza un CHECK a nivel de base de datos.
--
-- NO destructiva: conserva gastos/transferencias/descuentos. La limpieza
-- (DROP de las tablas viejas) va en 007, a aplicar DESPUÉS de desplegar el código
-- nuevo que ya lee/escribe en `movimientos`.

CREATE TABLE IF NOT EXISTS movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id),
  tipo text NOT NULL CHECK (tipo IN ('gasto','transferencia','descuento')),
  categoria text CHECK (categoria IN ('comida','transporte','insumos','casa','personal','otro')),
  descripcion text,
  monto numeric NOT NULL CHECK (monto > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- La categoría SOLO aplica a gastos: obligatoria en gastos, prohibida en el resto.
  CONSTRAINT movimientos_categoria_solo_gasto CHECK (
    (tipo = 'gasto' AND categoria IS NOT NULL) OR
    (tipo <> 'gasto' AND categoria IS NULL)
  )
);

-- Copia de datos existentes (638 filas)
INSERT INTO movimientos (jornada_id, vendedor_id, tipo, categoria, descripcion, monto, created_at)
  SELECT jornada_id, vendedor_id, 'gasto', categoria, descripcion, monto, created_at FROM gastos;
INSERT INTO movimientos (jornada_id, vendedor_id, tipo, categoria, descripcion, monto, created_at)
  SELECT jornada_id, vendedor_id, 'transferencia', NULL, descripcion, monto, created_at FROM transferencias;
INSERT INTO movimientos (jornada_id, vendedor_id, tipo, categoria, descripcion, monto, created_at)
  SELECT jornada_id, vendedor_id, 'descuento', NULL, descripcion, monto, created_at FROM descuentos;

-- Índices del hot path (resumen por jornada y per-vendedor)
CREATE INDEX IF NOT EXISTS idx_movimientos_jornada ON movimientos (jornada_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_jornada_vendedor ON movimientos (jornada_id, vendedor_id);

-- Índices faltantes en FKs muy consultadas (detectados por los advisors de Supabase)
CREATE INDEX IF NOT EXISTS idx_jornadas_semana ON jornadas (semana_id);
CREATE INDEX IF NOT EXISTS idx_pagas_jornada ON pagas (jornada_id);
