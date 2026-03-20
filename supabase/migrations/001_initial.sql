-- =============================================
-- Empanadas App - Migracion Inicial
-- Base de datos: PostgreSQL (Supabase)
-- =============================================

-- =============================================
-- 1. TABLAS
-- =============================================

-- Vendedores
CREATE TABLE vendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  pin text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin', 'vendedor')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Productos
CREATE TABLE productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  unidades_por_bandeja integer NOT NULL CHECK (unidades_por_bandeja > 0),
  precio numeric(10,2) NOT NULL CHECK (precio >= 0),
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Semanas (viernes a jueves)
CREATE TABLE semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio date NOT NULL UNIQUE,
  fecha_fin date NOT NULL,
  saldo_inicial numeric(10,2) NOT NULL DEFAULT 0,
  estado text NOT NULL CHECK (estado IN ('abierta', 'cerrada')) DEFAULT 'abierta',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Jornadas (un dia de venta)
CREATE TABLE jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id uuid NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  fecha date NOT NULL UNIQUE,
  estado text NOT NULL CHECK (estado IN ('abierta', 'cerrada')) DEFAULT 'abierta',
  monto_alcancia numeric(10,2) NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Asignaciones (productos que lleva cada vendedor)
CREATE TABLE asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_inicial integer NOT NULL CHECK (cantidad_inicial >= 0),
  cantidad_sobrante integer CHECK (cantidad_sobrante >= 0) DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(jornada_id, vendedor_id, producto_id)
);

-- Gastos (egresos del vendedor durante la jornada)
CREATE TABLE gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Transferencias (pagos por transferencia bancaria)
CREATE TABLE transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Descuentos (rebajas otorgadas)
CREATE TABLE descuentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pagas (pago a trabajadores al final del dia)
CREATE TABLE pagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  persona text NOT NULL,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inversiones (compras de insumos y gastos personales)
CREATE TABLE inversiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id uuid NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  descripcion text NOT NULL,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  tipo text NOT NULL CHECK (tipo IN ('inversion', 'gasto_personal')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 2. INDICES
-- =============================================

-- Vendedores
CREATE INDEX idx_vendedores_pin ON vendedores(pin);
CREATE INDEX idx_vendedores_activo ON vendedores(activo);

-- Productos
CREATE INDEX idx_productos_activo ON productos(activo);

-- Semanas
CREATE INDEX idx_semanas_fecha_inicio ON semanas(fecha_inicio);
CREATE INDEX idx_semanas_estado ON semanas(estado);

-- Jornadas
CREATE INDEX idx_jornadas_semana_id ON jornadas(semana_id);
CREATE INDEX idx_jornadas_fecha ON jornadas(fecha);
CREATE INDEX idx_jornadas_estado ON jornadas(estado);

-- Asignaciones
CREATE INDEX idx_asignaciones_jornada ON asignaciones(jornada_id);
CREATE INDEX idx_asignaciones_vendedor ON asignaciones(vendedor_id);
CREATE INDEX idx_asignaciones_jornada_vendedor ON asignaciones(jornada_id, vendedor_id);

-- Gastos
CREATE INDEX idx_gastos_jornada ON gastos(jornada_id);
CREATE INDEX idx_gastos_vendedor ON gastos(vendedor_id);
CREATE INDEX idx_gastos_jornada_vendedor ON gastos(jornada_id, vendedor_id);

-- Transferencias
CREATE INDEX idx_transferencias_jornada ON transferencias(jornada_id);
CREATE INDEX idx_transferencias_vendedor ON transferencias(vendedor_id);

-- Descuentos
CREATE INDEX idx_descuentos_jornada ON descuentos(jornada_id);
CREATE INDEX idx_descuentos_vendedor ON descuentos(vendedor_id);

-- Pagas
CREATE INDEX idx_pagas_jornada ON pagas(jornada_id);

-- Inversiones
CREATE INDEX idx_inversiones_semana ON inversiones(semana_id);
CREATE INDEX idx_inversiones_fecha ON inversiones(fecha);
CREATE INDEX idx_inversiones_tipo ON inversiones(tipo);

-- =============================================
-- 3. FUNCIONES
-- =============================================

-- Funcion para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funcion para validar que cantidad_sobrante no sea mayor que cantidad_inicial
CREATE OR REPLACE FUNCTION validar_sobrante()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cantidad_sobrante IS NOT NULL AND NEW.cantidad_sobrante > NEW.cantidad_inicial THEN
    RAISE EXCEPTION 'La cantidad sobrante (%) no puede ser mayor que la cantidad inicial (%)',
      NEW.cantidad_sobrante, NEW.cantidad_inicial;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calcular venta de un vendedor en una jornada
CREATE OR REPLACE FUNCTION calcular_venta_vendedor(
  p_jornada_id uuid,
  p_vendedor_id uuid
)
RETURNS TABLE (
  venta_bruta numeric,
  total_gastos numeric,
  total_transferencias numeric,
  total_descuentos numeric,
  efectivo_a_entregar numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Venta bruta: suma de (cantidad_vendida * precio) para cada producto
    COALESCE(
      (SELECT SUM((a.cantidad_inicial - COALESCE(a.cantidad_sobrante, 0)) * p.precio)
       FROM asignaciones a
       JOIN productos p ON p.id = a.producto_id
       WHERE a.jornada_id = p_jornada_id AND a.vendedor_id = p_vendedor_id),
      0
    ) AS venta_bruta,
    -- Total gastos
    COALESCE(
      (SELECT SUM(g.monto) FROM gastos g
       WHERE g.jornada_id = p_jornada_id AND g.vendedor_id = p_vendedor_id),
      0
    ) AS total_gastos,
    -- Total transferencias
    COALESCE(
      (SELECT SUM(t.monto) FROM transferencias t
       WHERE t.jornada_id = p_jornada_id AND t.vendedor_id = p_vendedor_id),
      0
    ) AS total_transferencias,
    -- Total descuentos
    COALESCE(
      (SELECT SUM(d.monto) FROM descuentos d
       WHERE d.jornada_id = p_jornada_id AND d.vendedor_id = p_vendedor_id),
      0
    ) AS total_descuentos,
    -- Efectivo a entregar = venta_bruta - gastos - transferencias - descuentos
    COALESCE(
      (SELECT SUM((a.cantidad_inicial - COALESCE(a.cantidad_sobrante, 0)) * p.precio)
       FROM asignaciones a
       JOIN productos p ON p.id = a.producto_id
       WHERE a.jornada_id = p_jornada_id AND a.vendedor_id = p_vendedor_id),
      0
    )
    - COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.jornada_id = p_jornada_id AND g.vendedor_id = p_vendedor_id), 0)
    - COALESCE((SELECT SUM(t.monto) FROM transferencias t WHERE t.jornada_id = p_jornada_id AND t.vendedor_id = p_vendedor_id), 0)
    - COALESCE((SELECT SUM(d.monto) FROM descuentos d WHERE d.jornada_id = p_jornada_id AND d.vendedor_id = p_vendedor_id), 0)
    AS efectivo_a_entregar;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calcular consolidado de un dia (todos los vendedores)
CREATE OR REPLACE FUNCTION calcular_consolidado_dia(p_jornada_id uuid)
RETURNS TABLE (
  venta_total numeric,
  total_gastos numeric,
  total_transferencias numeric,
  total_descuentos numeric,
  efectivo_total numeric,
  monto_alcancia numeric,
  total_pagas numeric,
  saldo_dia numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Venta total
    COALESCE(
      (SELECT SUM((a.cantidad_inicial - COALESCE(a.cantidad_sobrante, 0)) * p.precio)
       FROM asignaciones a
       JOIN productos p ON p.id = a.producto_id
       WHERE a.jornada_id = p_jornada_id),
      0
    ) AS venta_total,
    -- Total gastos
    COALESCE(
      (SELECT SUM(g.monto) FROM gastos g WHERE g.jornada_id = p_jornada_id),
      0
    ) AS total_gastos,
    -- Total transferencias
    COALESCE(
      (SELECT SUM(t.monto) FROM transferencias t WHERE t.jornada_id = p_jornada_id),
      0
    ) AS total_transferencias,
    -- Total descuentos
    COALESCE(
      (SELECT SUM(d.monto) FROM descuentos d WHERE d.jornada_id = p_jornada_id),
      0
    ) AS total_descuentos,
    -- Efectivo total
    COALESCE(
      (SELECT SUM((a.cantidad_inicial - COALESCE(a.cantidad_sobrante, 0)) * p.precio)
       FROM asignaciones a
       JOIN productos p ON p.id = a.producto_id
       WHERE a.jornada_id = p_jornada_id),
      0
    )
    - COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.jornada_id = p_jornada_id), 0)
    - COALESCE((SELECT SUM(t.monto) FROM transferencias t WHERE t.jornada_id = p_jornada_id), 0)
    - COALESCE((SELECT SUM(d.monto) FROM descuentos d WHERE d.jornada_id = p_jornada_id), 0)
    AS efectivo_total,
    -- Monto alcancia
    COALESCE(
      (SELECT j.monto_alcancia FROM jornadas j WHERE j.id = p_jornada_id),
      0
    ) AS monto_alcancia,
    -- Total pagas
    COALESCE(
      (SELECT SUM(pg.monto) FROM pagas pg WHERE pg.jornada_id = p_jornada_id),
      0
    ) AS total_pagas,
    -- Saldo del dia = efectivo_total - alcancia - pagas
    (
      COALESCE(
        (SELECT SUM((a.cantidad_inicial - COALESCE(a.cantidad_sobrante, 0)) * p.precio)
         FROM asignaciones a
         JOIN productos p ON p.id = a.producto_id
         WHERE a.jornada_id = p_jornada_id),
        0
      )
      - COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.jornada_id = p_jornada_id), 0)
      - COALESCE((SELECT SUM(t.monto) FROM transferencias t WHERE t.jornada_id = p_jornada_id), 0)
      - COALESCE((SELECT SUM(d.monto) FROM descuentos d WHERE d.jornada_id = p_jornada_id), 0)
      - COALESCE((SELECT j.monto_alcancia FROM jornadas j WHERE j.id = p_jornada_id), 0)
      - COALESCE((SELECT SUM(pg.monto) FROM pagas pg WHERE pg.jornada_id = p_jornada_id), 0)
    ) AS saldo_dia;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calcular saldo semanal
CREATE OR REPLACE FUNCTION calcular_saldo_semanal(p_semana_id uuid)
RETURNS TABLE (
  saldo_inicial numeric,
  total_saldos_diarios numeric,
  total_inversiones numeric,
  total_gastos_personales numeric,
  saldo_actual numeric
) AS $$
DECLARE
  v_saldo_inicial numeric;
  v_total_saldos_diarios numeric;
  v_total_inversiones numeric;
  v_total_gastos_personales numeric;
BEGIN
  -- Saldo inicial de la semana
  SELECT s.saldo_inicial INTO v_saldo_inicial
  FROM semanas s WHERE s.id = p_semana_id;

  -- Total de saldos diarios (suma de saldo_dia de cada jornada cerrada)
  SELECT COALESCE(SUM(
    (SELECT cd.saldo_dia FROM calcular_consolidado_dia(j.id) cd)
  ), 0) INTO v_total_saldos_diarios
  FROM jornadas j
  WHERE j.semana_id = p_semana_id;

  -- Total inversiones
  SELECT COALESCE(SUM(i.monto), 0) INTO v_total_inversiones
  FROM inversiones i
  WHERE i.semana_id = p_semana_id AND i.tipo = 'inversion';

  -- Total gastos personales
  SELECT COALESCE(SUM(i.monto), 0) INTO v_total_gastos_personales
  FROM inversiones i
  WHERE i.semana_id = p_semana_id AND i.tipo = 'gasto_personal';

  RETURN QUERY SELECT
    v_saldo_inicial,
    v_total_saldos_diarios,
    v_total_inversiones,
    v_total_gastos_personales,
    (v_saldo_inicial + v_total_saldos_diarios - v_total_inversiones - v_total_gastos_personales);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 4. TRIGGERS
-- =============================================

-- Trigger updated_at para todas las tablas que lo necesitan
CREATE TRIGGER trigger_vendedores_updated_at
  BEFORE UPDATE ON vendedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_semanas_updated_at
  BEFORE UPDATE ON semanas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_jornadas_updated_at
  BEFORE UPDATE ON jornadas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_asignaciones_updated_at
  BEFORE UPDATE ON asignaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para validar sobrantes
CREATE TRIGGER trigger_validar_sobrante
  BEFORE INSERT OR UPDATE ON asignaciones
  FOR EACH ROW EXECUTE FUNCTION validar_sobrante();

-- =============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE semanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE descuentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversiones ENABLE ROW LEVEL SECURITY;

-- Funcion auxiliar para obtener el rol del usuario actual
-- Busca el vendedor cuyo email coincide con el del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT v.rol FROM vendedores v
  WHERE v.id = (
    SELECT (raw_user_meta_data->>'vendedor_id')::uuid
    FROM auth.users
    WHERE id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Funcion auxiliar para obtener el vendedor_id del usuario actual
CREATE OR REPLACE FUNCTION get_vendedor_id()
RETURNS uuid AS $$
  SELECT (raw_user_meta_data->>'vendedor_id')::uuid
  FROM auth.users
  WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----- VENDEDORES -----
-- Lectura: todos (anonimos y autenticados) - necesario para login
CREATE POLICY "vendedores_select" ON vendedores
  FOR SELECT TO anon, authenticated USING (true);

-- Escritura: solo admin
CREATE POLICY "vendedores_insert" ON vendedores
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "vendedores_update" ON vendedores
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "vendedores_delete" ON vendedores
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- ----- PRODUCTOS -----
-- Lectura: todos (anonimos y autenticados) - necesario para login
CREATE POLICY "productos_select" ON productos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "productos_insert" ON productos
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "productos_update" ON productos
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "productos_delete" ON productos
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- ----- SEMANAS -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "semanas_select" ON semanas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "semanas_insert" ON semanas
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "semanas_update" ON semanas
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "semanas_delete" ON semanas
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- ----- JORNADAS -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "jornadas_select" ON jornadas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "jornadas_insert" ON jornadas
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "jornadas_update" ON jornadas
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "jornadas_delete" ON jornadas
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- ----- ASIGNACIONES -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "asignaciones_select" ON asignaciones
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "asignaciones_insert" ON asignaciones
  FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "asignaciones_update" ON asignaciones
  FOR UPDATE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "asignaciones_delete" ON asignaciones
  FOR DELETE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

-- ----- GASTOS -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "gastos_select" ON gastos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "gastos_insert" ON gastos
  FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "gastos_update" ON gastos
  FOR UPDATE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "gastos_delete" ON gastos
  FOR DELETE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

-- ----- TRANSFERENCIAS -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "transferencias_select" ON transferencias
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "transferencias_insert" ON transferencias
  FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "transferencias_update" ON transferencias
  FOR UPDATE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "transferencias_delete" ON transferencias
  FOR DELETE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

-- ----- DESCUENTOS -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "descuentos_select" ON descuentos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "descuentos_insert" ON descuentos
  FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "descuentos_update" ON descuentos
  FOR UPDATE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

CREATE POLICY "descuentos_delete" ON descuentos
  FOR DELETE TO authenticated
  USING (vendedor_id = get_vendedor_id() OR get_user_role() = 'admin');

-- ----- PAGAS -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "pagas_select" ON pagas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pagas_insert" ON pagas
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "pagas_update" ON pagas
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "pagas_delete" ON pagas
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- ----- INVERSIONES -----
-- Lectura: todos (anonimos y autenticados)
CREATE POLICY "inversiones_select" ON inversiones
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "inversiones_insert" ON inversiones
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "inversiones_update" ON inversiones
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "inversiones_delete" ON inversiones
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');
