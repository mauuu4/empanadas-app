# Flujos de Usuario - Empanadas App

Este documento describe los flujos paso a paso de cada tipo de usuario en el sistema.

---

## 1. Autenticacion

### Login (todos los usuarios)

```
1. Abrir la app en el navegador (telefono o PC)
2. Seleccionar su nombre de una lista de vendedores activos
3. Ingresar su PIN de 4 digitos
4. Si el PIN es correcto -> entrar al sistema
5. Si el PIN es incorrecto -> mostrar error, reintentar
```

**Notas:**

- No se usa email, los vendedores solo necesitan recordar un PIN
- El administrador (Mauricio) puede cambiar los PINs de cualquier vendedor
- La sesion se mantiene activa por un tiempo razonable (ej: 24 horas)
- Al ser PWA, el usuario puede agregar la app a su pantalla de inicio

---

## 2. Flujos del Vendedor

### 2.1 Inicio de jornada - Registrar productos

**Cuando:** Antes de salir a vender (4-6 PM)
**Precondicion:** El admin ya creo la jornada del dia

```
1. Entrar al sistema
2. Ver la jornada abierta del dia
3. Para cada producto que lleva:
   a. Seleccionar el producto de la lista
   b. Ingresar la cantidad de bandejas
4. Confirmar la asignacion
5. Ver resumen de lo que lleva:
   - Lista de productos con cantidades
   - Valor total potencial (si vende todo)
```

**Ejemplo de pantalla:**

```
--- Mi carga de hoy ---
Empanadas de verde:     10 bandejas  ($17.50)
Bolones mixtos (6 uds):  2 bandejas  ($7.00)
Bolones mixtos (3 uds):  4 bandejas  ($7.00)
Majado:                   2 bandejas  ($3.00)
                          ----------
Total potencial:                      $34.50
```

---

### 2.2 Durante la venta - Registrar movimientos

**Cuando:** Mientras esta vendiendo en la calle

#### Registrar un gasto

```
1. Tocar boton "Registrar gasto"
2. Escribir descripcion (ej: "Refrigerio")
3. Ingresar monto (ej: $1.25)
4. Confirmar
5. El gasto aparece en la lista de movimientos del dia
```

#### Registrar una transferencia

```
1. Tocar boton "Registrar transferencia"
2. Ingresar monto (ej: $5.00)
3. Descripcion opcional (ej: "Pago cliente Maria")
4. Confirmar
```

#### Registrar un descuento

```
1. Tocar boton "Registrar descuento"
2. Ingresar monto del descuento (ej: $0.25)
3. Descripcion opcional (ej: "Empanadas a $1.50")
4. Confirmar
```

**Vista durante la venta:**

```
--- Movimientos de hoy ---

Gastos:
  - Refrigerio: $1.25
  - Agua: $0.50
  Total gastos: $1.75

Transferencias:
  - Pago cliente Maria: $5.00
  Total transferencias: $5.00

Descuentos:
  - Empanadas a $1.50: $0.25
  Total descuentos: $0.25
```

---

### 2.3 Cierre de venta - Registrar sobrantes

**Cuando:** Al regresar de vender (7-10 PM)

```
1. Tocar boton "Cerrar mi venta"
2. Para cada producto asignado:
   a. Ver el producto y cantidad inicial
   b. Ingresar cantidad sobrante (0 si vendio todo)
3. Confirmar sobrantes
4. Ver resumen final automatico:

--- Resumen de venta - Mauricio ---
Producto               Llevo  Sobro  Vendio  Total
Empanadas de verde      10     2      8      $14.00
Bolones mixtos (6)       2     0      2      $7.00
Bolones mixtos (3)       4     1      3      $5.25
Majado                   2     0      2      $3.00
                                      ---    ------
                                      15     $29.25

Venta bruta:                          $29.25
(-) Gastos:                           -$1.75
(-) Transferencias:                   -$5.00
(-) Descuentos:                       -$0.25
                                      ------
Efectivo a entregar:                  $22.25
```

---

### 2.4 Ver datos de otros vendedores (solo lectura)

```
1. Navegar a "Resumen del dia"
2. Ver la lista de todos los vendedores con sus totales
3. Tocar en un vendedor para ver su detalle
4. NO puede editar datos de otros vendedores
```

---

## 3. Flujos del Administrador

### 3.1 Crear jornada del dia

**Cuando:** Antes de que los vendedores salgan

```
1. Entrar al sistema como admin
2. Tocar "Nueva jornada" (o se crea automaticamente si no hay una para hoy)
3. La jornada se crea con estado "abierta"
4. Los vendedores ya pueden registrar sus productos
```

---

### 3.2 Cerrar el dia

**Cuando:** Despues de que todos los vendedores cerraron su venta

```
1. Ir a "Resumen del dia"
2. Verificar que todos los vendedores registraron sus sobrantes
3. Ver el consolidado:

--- Consolidado del dia - 15/03/2026 ---

Vendedor      Venta    Gastos   Transf.  Desc.    Efectivo
Mauricio     $29.25    $1.75    $5.00    $0.25    $22.25
Laura        $25.50    $0.00    $3.00    $0.00    $22.50
Carlos       $26.00    $2.00    $0.00    $0.50    $23.50
             ------    -----    -----    -----    ------
TOTAL        $80.75    $3.75    $8.00    $0.75    $68.25

4. Definir monto de alcancia:
   - Ingresar monto (ej: $30.00)

5. Registrar pagas de trabajadores:
   - Agregar paga: "Carlos" - $2.00
   - (Opcional) Agregar otra paga: "Ana (ayudante)" - $3.00

6. Ver calculo final:

Efectivo total:          $68.25
(-) Alcancia:            -$30.00
(-) Pagas:               -$5.00
                         -------
Saldo del dia:           $33.25

Saldo acumulado semana:  $33.25 (si es el primer dia)
                    o:   $XX.XX + $33.25 = $YY.YY (si ya hay dias anteriores)

7. Confirmar cierre del dia
8. La jornada cambia a estado "cerrada"
```

---

### 3.3 Gestion semanal

#### Iniciar nueva semana

```
1. El sistema detecta que es viernes (o el admin la crea manualmente)
2. Se crea una nueva semana con:
   - fecha_inicio: viernes actual
   - fecha_fin: jueves siguiente
   - saldo_inicial: saldo_final de la semana anterior (o 0 si es la primera)
```

#### Registrar inversion (compras de insumos)

```
1. Ir a "Inversiones"
2. Tocar "Nueva inversion"
3. Ingresar:
   - Fecha (por defecto hoy)
   - Descripcion (ej: "Compra de verde, queso, pollo, aceite")
   - Monto total (ej: $120.00)
   - Tipo: "Inversion" (para el negocio)
4. Confirmar
5. Ver el impacto en el saldo:

Saldo antes:            $140.00
(-) Inversion:          -$120.00
                        --------
Saldo despues:          $20.00
```

#### Registrar gasto personal/familiar

```
1. Ir a "Inversiones"
2. Tocar "Nuevo gasto"
3. Ingresar:
   - Fecha
   - Descripcion (ej: "Compras del hogar")
   - Monto (ej: $15.00)
   - Tipo: "Gasto personal"
4. Confirmar
```

#### Ver resumen semanal

```
--- Semana 14/03/2026 - 20/03/2026 ---

Saldo inicial (semana anterior):     $20.00

Dia        Venta    Gastos   Alcanc.  Pagas   Saldo
Viernes    $80.75   $3.75    $30.00   $5.00   $33.25 (*)
Sabado     $75.00   $2.00    $30.00   $2.00   $41.00
Domingo    $60.00   $5.00    $25.00   $2.00   $28.00
Lunes      $82.00   $1.00    $30.00   $2.00   $49.00
Martes     $78.00   $3.00    $30.00   $2.00   $43.00
Miercoles  $70.00   $2.50    $25.00   $2.00   $40.50
Jueves     $65.00   $1.00    $25.00   $2.00   $37.00

Total ventas:                        $510.75
Total gastos vendedores:             $18.25
Total transferencias:                $XX.XX
Total descuentos:                    $XX.XX
Total alcancia:                      $195.00
Total pagas:                         $17.00

Saldo acumulado dias:                $271.75
(-) Inversiones:                     -$120.00
(-) Gastos personales:               -$15.00
                                     --------
Saldo final semana:                  $156.75

(*) Los valores de transferencias y descuentos estan incluidos
    en el calculo del saldo de cada dia
```

---

### 3.4 Gestion de productos

```
1. Ir a "Productos"
2. Ver lista de productos actuales con precios
3. Opciones:
   a. Agregar producto nuevo
   b. Editar nombre/precio/unidades de un producto existente
   c. Desactivar un producto (no se elimina, se oculta)
   d. Reactivar un producto desactivado
```

---

### 3.5 Gestion de vendedores

```
1. Ir a "Vendedores"
2. Ver lista de vendedores activos
3. Opciones:
   a. Agregar nuevo vendedor (nombre + PIN)
   b. Editar nombre o cambiar PIN
   c. Cambiar rol (admin/vendedor)
   d. Desactivar vendedor (no se elimina)
```

---

## 4. Flujos del Historial

### Ver historial por semana

```
1. Ir a "Historial"
2. Seleccionar una semana de la lista
3. Ver el resumen semanal completo (igual que seccion 3.3)
4. Tocar en un dia para ver el detalle de esa jornada
5. Tocar en un vendedor para ver su detalle individual
```

### Ver historial por mes

```
1. Ir a "Historial"
2. Seleccionar vista "Por mes"
3. Seleccionar mes y ano
4. Ver resumen mensual:
   - Total ventas del mes
   - Total gastos del mes
   - Total transferencias
   - Total descuentos
   - Total alcancia
   - Total pagas
   - Total inversiones
   - Total gastos personales
   - Saldo neto del mes
```

---

## 5. Casos Especiales

### Dia sin ventas

- Si un dia no se sale a vender, simplemente no se crea jornada
- El saldo semanal no se ve afectado

### Vendedor que no sale un dia

- Los demas vendedores registran normalmente
- El vendedor ausente no tiene asignaciones ese dia

### Modificar datos despues de cerrar

- Solo el admin puede reabrir una jornada cerrada para hacer correcciones
- Se debe tener cuidado ya que afecta los saldos acumulados

### Primer uso del sistema

- El admin crea los vendedores y sus PINs
- Los productos ya vienen precargados (seed)
- Se crea la primera semana manualmente
