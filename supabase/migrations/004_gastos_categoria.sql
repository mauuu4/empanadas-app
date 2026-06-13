-- Migration 004: categorizar gastos
-- Añade una columna `categoria` a la tabla gastos para poder analizar los
-- gastos por tipo (Comida, Transporte, Insumos, Casa, Personal, Otro).
-- La descripción del gasto pasa a ser opcional desde la app; la categoría
-- siempre tiene valor (default 'otro').

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'otro';

ALTER TABLE gastos DROP CONSTRAINT IF EXISTS gastos_categoria_check;
ALTER TABLE gastos ADD CONSTRAINT gastos_categoria_check
  CHECK (categoria IN ('comida','transporte','insumos','casa','personal','otro'));

-- Backfill por palabra clave sobre los gastos existentes.
-- Orden: de genérico a específico (el último UPDATE que calce gana), para que
-- p.ej. "churos thiago" termine en 'personal' y "gasolina" en 'transporte'.

UPDATE gastos SET categoria = 'comida'
 WHERE descripcion ILIKE ANY (ARRAY['%refrigerio%','%comida%','%merienda%','%almuerzo%','%cafe%','%sopa%','%helado%','%churo%','%alita%','%shawar%','%pollo%','%nugget%','%cheetos%','%galleta%','%espumilla%','%tilapia%','%cola%','%veneno%','%super mio%']);

UPDATE gastos SET categoria = 'insumos'
 WHERE descripcion ILIKE ANY (ARRAY['%pan%','%huevo%','%aceite%','%aguacate%','%arroz%','%piña%','%tomate%','%leche%','%lecha%','%fresa%','%choclo%','%crema%','%cubeta%','%hoja%','%lamina%']);

UPDATE gastos SET categoria = 'casa'
 WHERE descripcion ILIKE ANY (ARRAY['%casa%','%foco%','%vela%','%parlante%','%arreglo%','%lava%','%pastilla%','%gas%','%agua%']);

UPDATE gastos SET categoria = 'transporte'
 WHERE descripcion ILIKE ANY (ARRAY['%gasolina%','%taxi%']);

UPDATE gastos SET categoria = 'personal'
 WHERE descripcion ILIKE ANY (ARRAY['%thiago%','%tuti%','%gordo%','%mami%','%pañal%','%panal%','%corte pelo%','%cumple%']);
