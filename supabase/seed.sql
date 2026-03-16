-- =============================================
-- Empanadas App - Datos Iniciales (Seed)
-- =============================================

-- Productos iniciales
INSERT INTO productos (nombre, descripcion, unidades_por_bandeja, precio, activo, orden) VALUES
  ('Empanadas de verde', 'Pollo y queso, mismo precio', 5, 1.75, true, 1),
  ('Bolones mixtos (3 uds)', 'Queso y chicharron', 3, 1.75, true, 2),
  ('Bolones mixtos (4 uds)', 'Queso y chicharron', 4, 2.25, true, 3),
  ('Bolones mixtos (6 uds)', 'Queso y chicharron', 6, 3.50, true, 4),
  ('Majado', NULL, 1, 1.50, true, 5);

-- NOTA: El vendedor admin (Mauricio Romero) se debe crear
-- a traves de la API de Supabase Auth cuando se configure
-- el proyecto por primera vez. Al crear el usuario en Auth,
-- se debe insertar tambien una fila en la tabla vendedores
-- con el mismo ID y rol 'admin'.
--
-- Ejemplo de como se haria manualmente en SQL
-- (requiere que el usuario ya exista en auth.users):
--
-- INSERT INTO vendedores (nombre, pin, rol) VALUES
--   ('Mauricio Romero', '1234', 'admin');
