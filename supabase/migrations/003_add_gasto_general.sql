-- Migration 003: añadir tipo 'gasto_general' a inversiones
-- Permite registrar gastos del negocio (no atados a un vendedor) a nivel semana,
-- junto a las inversiones y gastos personales.

ALTER TABLE inversiones DROP CONSTRAINT IF EXISTS inversiones_tipo_check;

ALTER TABLE inversiones
  ADD CONSTRAINT inversiones_tipo_check
  CHECK (tipo IN ('inversion', 'gasto_personal', 'gasto_general'));
