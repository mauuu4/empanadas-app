-- Migration 005: permitir PIN compartido entre vendedores
-- El login selecciona primero al vendedor por nombre y luego pide el PIN; la
-- autenticación real usa email + password de Supabase Auth, así que el PIN de la
-- tabla `vendedores` (referencia) NO necesita ser único. Quitar el UNIQUE permite
-- que varios vendedores compartan el mismo PIN (p. ej. un PIN común 1111).

ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_pin_key;
