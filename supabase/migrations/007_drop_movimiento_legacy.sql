-- Migration 007: limpieza tras unificar en `movimientos`.
--
-- ⚠️ APLICAR SOLO DESPUÉS de desplegar el código nuevo (el que lee/escribe en
-- `movimientos`). Si la nube todavía corre el código viejo, borrar estas tablas
-- la rompería. Verificar primero que `movimientos` tiene todos los datos:
--   SELECT tipo, count(*) FROM movimientos GROUP BY tipo;
--
-- Elimina las tablas viejas (ya migradas), un índice sin uso y dos funciones RPC
-- muertas (el cálculo vive en src/lib/queries.ts, no en la BDD).

DROP TABLE IF EXISTS gastos;
DROP TABLE IF EXISTS transferencias;
DROP TABLE IF EXISTS descuentos;

DROP INDEX IF EXISTS idx_vendedores_pin;

DROP FUNCTION IF EXISTS calcular_consolidado_dia(uuid);
DROP FUNCTION IF EXISTS calcular_venta_vendedor(uuid, uuid);
