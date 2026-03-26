-- =============================================
-- 002: Add valor_adicional to jornadas
-- Allows adding extra income to the day's total
-- =============================================

ALTER TABLE jornadas ADD COLUMN valor_adicional numeric(10,2) NOT NULL DEFAULT 0;
