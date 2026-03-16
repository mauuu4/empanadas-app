# Logica del Negocio - Empanadas App

## Descripcion General

Negocio familiar de venta ambulante de comida ecuatoriana: empanadas de verde, bolones y majado. El proceso diario consiste en preparar los productos por la manana y salir a venderlos por la tarde/noche en diferentes puntos de la calle.

Normalmente salen **3 vendedores**, cada uno con su propia carga de productos. Los vendedores pueden variar (a veces salen 2 o incluso 1), pero generalmente son las mismas 2-3 personas.

El administrador principal es **Mauricio Romero**, quien ademas de vender, gestiona las cuentas, inversiones y el cierre de cada dia y semana.

---

## Productos

Los productos se venden en **bandejas**. Los productos y precios pueden cambiar con el tiempo (se pueden agregar nuevos o modificar precios).

### Productos actuales

| Producto                            | Unidades por bandeja | Precio por bandeja | Notas                             |
| ----------------------------------- | -------------------- | ------------------ | --------------------------------- |
| Empanadas de verde (pollo)          | 5                    | $1.75              | Se cuentan junto con las de queso |
| Empanadas de verde (queso)          | 5                    | $1.75              | Se cuentan junto con las de pollo |
| Bolones mixtos (queso y chicharron) | 3                    | $1.75              | -                                 |
| Bolones mixtos (queso y chicharron) | 4                    | $2.25              | -                                 |
| Bolones mixtos (queso y chicharron) | 6                    | $3.50              | -                                 |
| Majado                              | 1 (bandeja)          | $1.50              | -                                 |

**Nota sobre empanadas:** Aunque hay de pollo y de queso, ambas tienen el mismo precio ($1.75 la bandeja de 5), por lo que para efectos de contabilidad se cuentan como un solo producto "Empanadas". Se podria opcionalmente registrar cuantas de cada sabor se llevaron, pero el calculo financiero es el mismo.

---

## Roles y Personas

### Administrador (Mauricio Romero)

- Crea y cierra jornadas de venta
- Gestiona productos (agregar, editar precios, desactivar)
- Gestiona vendedores
- Registra inversiones y compras semanales
- Define montos de alcancia y pagas de trabajadores
- Ve el consolidado de todos los vendedores
- Tambien sale a vender (tiene doble rol)

### Vendedores

- Registran los productos que llevan al inicio de la jornada
- Registran gastos, transferencias y descuentos durante la venta
- Registran los productos sobrantes al final de la venta
- Pueden ver toda la informacion pero NO pueden modificar datos de otros vendedores
- No pueden gestionar productos, inversiones ni cerrar el dia

### Ayudante(s)

- Persona(s) que ayudan en la preparacion pero no salen a vender
- Se les paga al final del dia (no siempre, depende del dia)
- No necesitan acceso al sistema

---

## Proceso Diario

### 1. Preparacion (manana)

- Se preparan todos los productos (empanadas, bolones, majado)
- No se registra nada en el sistema en esta fase

### 2. Asignacion de productos (antes de salir a vender)

- El administrador crea la jornada del dia
- Cada vendedor registra cuantas bandejas de cada producto lleva
- **Ejemplo:** Mauricio lleva 10 bandejas de empanadas, 2 bolones de 6, 4 bolones de 3, y 2 majados

### 3. Venta (tarde/noche)

- Horario flexible: salida entre 4-6 PM, regreso entre 7-10 PM
- Los horarios varian cada dia, no son fijos
- Durante la venta se pueden registrar:

#### Gastos / Egresos

- Gastos personales del vendedor durante la venta
- Ejemplos: refrigerio ($1.25), compra de alimentos para la casa, etc.
- Cada gasto tiene una descripcion y un monto

#### Transferencias bancarias

- Pagos que los clientes hacen por transferencia en lugar de efectivo
- Se registra el monto y una descripcion opcional
- Este dinero NO se recibe en efectivo, por eso se descuenta del efectivo a entregar

#### Descuentos / Rebajas

- Cuando se vende una bandeja a un precio menor al establecido
- Ejemplo: una bandeja de empanadas vendida a $1.50 en lugar de $1.75 = descuento de $0.25
- Se registra el monto del descuento

### 4. Cierre de venta del vendedor

- El vendedor registra cuantas bandejas le sobraron de cada producto
- El sistema calcula automaticamente:
  - **Productos vendidos** = productos iniciales - sobrantes
  - **Venta bruta** = productos vendidos x precio de cada producto
  - **Total gastos** del vendedor
  - **Total transferencias** recibidas
  - **Total descuentos** otorgados
  - **Efectivo a entregar** = Venta bruta - Gastos - Transferencias - Descuentos

### 5. Cierre del dia (admin)

- El administrador ve el consolidado de TODOS los vendedores:
  - Venta total del dia (suma de ventas de todos)
  - Total de gastos de todos
  - Total de transferencias de todos
  - Total de descuentos de todos
  - Efectivo total recaudado
- Define los siguientes montos:
  - **Alcancia:** Monto fijo a ahorrar (ej: $30). Se guarda para acumular saldo semanal
  - **Paga de trabajadores:** Se paga a 1 o mas personas (vendedor y/o ayudante)
- **Saldo del dia** = Efectivo total - Alcancia - Pagas
- Este saldo se suma al saldo acumulado de la semana

---

## Ciclo Semanal

La semana del negocio va de **viernes a jueves** (no de lunes a domingo).

### Saldo acumulado

- Cada dia, el saldo resultante despues de alcancia y pagas se acumula
- Este saldo acumulado sirve para cubrir las inversiones de la siguiente semana

### Viernes - Compras principales

- Se compran los insumos para trabajar la semana (verde, queso, pollo, chicharron, aceite, etc.)
- Se registra el total de la inversion
- Se descuenta del saldo acumulado
- **Ejemplo:** Saldo acumulado = $140, Compras = $120, Saldo restante = $20

### Martes - Compras adicionales

- Se compran insumos que no estaban disponibles el viernes o que se agotaron
- Mismo proceso: se registra y se descuenta del saldo

### Domingo - Gastos personales/familiares

- Compras para la casa, comida familiar, gastos personales
- Estos gastos NO son del negocio, pero se registran porque salen del mismo dinero
- Se descuentan del saldo acumulado

**Nota:** Estos dias no son fijos. Si el viernes no se puede comprar, se hace el sabado. Los gastos personales pueden ser cualquier dia. El sistema debe permitir registrar inversiones y gastos especiales cualquier dia.

---

## Resumen de Calculos

### Por vendedor (diario)

```
Venta bruta = SUM(cantidad_vendida * precio) para cada producto
Cantidad vendida = cantidad_inicial - cantidad_sobrante
Efectivo a entregar = Venta bruta - Gastos - Transferencias - Descuentos
```

### Consolidado del dia

```
Venta total = SUM(venta bruta de cada vendedor)
Total gastos = SUM(gastos de todos los vendedores)
Total transferencias = SUM(transferencias de todos)
Total descuentos = SUM(descuentos de todos)
Efectivo total = Venta total - Total gastos - Total transferencias - Total descuentos
Saldo del dia = Efectivo total - Alcancia - Pagas
```

### Semanal (viernes a jueves)

```
Saldo acumulado = SUM(saldo de cada dia) - Inversiones - Gastos personales
```

---

## Reglas de Negocio Importantes

1. **Productos con mismo precio se pueden agrupar:** Las empanadas de pollo y queso tienen el mismo precio, se cuentan juntas.
2. **Horarios flexibles:** No hay horarios fijos de inicio/fin de venta.
3. **Vendedores variables:** Normalmente 3, pero pueden ser 1, 2 o mas.
4. **Pagas variables:** Algunos dias se paga a 1 trabajador, otros a 2, otros a ninguno.
5. **Alcancia variable:** El monto de ahorro puede variar cada dia.
6. **Dias de compra flexibles:** Viernes y martes son los dias habituales pero puede cambiar.
7. **Gastos personales:** Se registran separados de los gastos del negocio.
8. **Transferencias no son efectivo:** Cuando un cliente paga por transferencia, ese dinero no esta en el efectivo fisico.
9. **Todo el historial se guarda:** Se puede consultar por semana o por mes.
