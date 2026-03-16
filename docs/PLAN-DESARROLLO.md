# Plan de Desarrollo - Empanadas App

Organizacion del desarrollo en fases incrementales. Cada fase produce funcionalidad usable.

---

## Resumen de Fases

| Fase | Descripcion                               | Prioridad | Dependencias |
| ---- | ----------------------------------------- | --------- | ------------ |
| 1    | Setup del proyecto e infraestructura      | Alta      | Ninguna      |
| 2    | Autenticacion (login con PIN)             | Alta      | Fase 1       |
| 3    | Gestion de productos y vendedores (admin) | Alta      | Fase 2       |
| 4    | Jornada diaria - Flujo del vendedor       | Alta      | Fase 3       |
| 5    | Cierre del dia - Consolidado (admin)      | Alta      | Fase 4       |
| 6    | Gestion semanal e inversiones             | Alta      | Fase 5       |
| 7    | Historial y reportes                      | Media     | Fase 6       |
| 8    | PWA e instalacion en telefono             | Media     | Fase 4       |
| 9    | Mejoras de UX y pulido                    | Baja      | Fase 7       |

---

## Fase 1: Setup del proyecto e infraestructura

**Objetivo:** Tener el proyecto configurado, la base de datos creada y el deploy funcionando.

### Tareas

- [ ] Crear proyecto Next.js con TypeScript y Tailwind CSS
  - `pnpm create next-app empanadas-app --typescript --tailwind --app --src-dir`
  - Configurar pnpm como package manager
- [ ] Configurar TypeScript estricto
- [ ] Configurar Prettier (sin semicolons, single quotes)
- [ ] Configurar ESLint
- [ ] Crear proyecto en Supabase (free tier)
  - Crear cuenta si no existe
  - Crear proyecto "empanadas-app"
  - Obtener URL y API keys
- [ ] Configurar variables de entorno
  - `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `.env.example` como referencia
- [ ] Instalar dependencias de Supabase
  - `@supabase/supabase-js`
  - `@supabase/ssr`
- [ ] Crear clientes de Supabase (browser y server)
- [ ] Ejecutar migracion inicial en Supabase
  - Crear todas las tablas definidas en MODELO-DATOS.md
  - Crear indices, funciones y triggers
  - Configurar RLS
  - Ejecutar seed (productos iniciales, usuario admin)
- [ ] Crear repositorio en GitHub
- [ ] Conectar con Vercel y hacer primer deploy
- [ ] Verificar que el deploy funciona

### Entregable

- App Next.js vacia desplegada en Vercel
- Base de datos creada en Supabase con esquema completo
- Deploy automatico funcionando

---

## Fase 2: Autenticacion (login con PIN)

**Objetivo:** Los vendedores pueden entrar al sistema con su nombre y PIN.

### Tareas

- [ ] Crear pagina de login (`/login`)
  - Selector de nombre (dropdown o lista de botones)
  - Input de PIN (4 digitos, tipo password)
  - Boton de entrar
  - Manejo de errores (PIN incorrecto)
- [ ] Implementar logica de autenticacion
  - Traducir nombre + PIN a email + password para Supabase Auth
  - Crear sesion con cookies
  - Redirigir a dashboard despues del login
- [ ] Crear middleware de proteccion de rutas
  - Rutas publicas: solo `/login`
  - Rutas protegidas: todo lo demas
  - Redirect a `/login` si no hay sesion
- [ ] Crear layout protegido con header y navegacion
  - Mostrar nombre del vendedor
  - Boton de cerrar sesion
  - Navegacion basica (dashboard, jornada, etc.)
- [ ] Crear pagina de dashboard basica (`/dashboard`)
  - Mensaje de bienvenida
  - Fecha actual
  - Links de acceso rapido

### Entregable

- Login funcional con PIN
- Rutas protegidas
- Dashboard basico con navegacion

---

## Fase 3: Gestion de productos y vendedores (admin)

**Objetivo:** El admin puede gestionar el catalogo de productos y los vendedores.

### Tareas

- [ ] Pagina de productos (`/admin/productos`)
  - Listar todos los productos (activos e inactivos)
  - Formulario para agregar producto (nombre, unidades, precio)
  - Editar producto existente (inline o modal)
  - Activar/desactivar producto
  - Validaciones (precio > 0, unidades > 0)
- [ ] Pagina de vendedores (`/admin/vendedores`)
  - Listar vendedores activos e inactivos
  - Formulario para agregar vendedor (nombre, PIN, rol)
  - Editar vendedor (cambiar nombre, PIN, rol)
  - Activar/desactivar vendedor
  - Validaciones (PIN de 4 digitos, nombre unico)
- [ ] Proteger rutas de admin
  - Solo usuarios con rol "admin" pueden acceder a `/admin/*`
  - Redirigir a dashboard si no es admin
- [ ] Crear componentes UI reutilizables
  - Button, Input, Card, Modal, Table, Badge
  - Estilos consistentes con Tailwind

### Entregable

- CRUD completo de productos
- CRUD completo de vendedores
- Componentes UI base listos

---

## Fase 4: Jornada diaria - Flujo del vendedor

**Objetivo:** Los vendedores pueden registrar su venta diaria completa.

### Tareas

- [ ] Crear/abrir jornada del dia (admin)
  - Boton en dashboard para crear jornada
  - Verificar que no exista jornada para hoy
  - Asociar a la semana correspondiente (crear semana si no existe)
- [ ] Asignacion de productos (`/jornada/asignar`)
  - Listar productos activos con campo de cantidad
  - El vendedor ingresa cuantas bandejas lleva de cada producto
  - Guardar asignaciones
  - Mostrar valor potencial total
  - Poder editar la asignacion antes de salir
- [ ] Registro de movimientos (`/jornada/movimientos`)
  - Tabs o secciones para: Gastos, Transferencias, Descuentos
  - Formulario rapido para cada tipo (descripcion + monto)
  - Lista de movimientos registrados con opcion de eliminar
  - Totales parciales de cada tipo
- [ ] Cierre de venta (`/jornada/cerrar`)
  - Listar productos asignados con campo para sobrantes
  - Validar que sobrantes <= cantidad inicial
  - Calcular y mostrar resumen:
    - Productos vendidos y montos
    - Total venta bruta
    - Total gastos, transferencias, descuentos
    - Efectivo a entregar
  - Confirmar cierre

### Entregable

- Flujo completo del vendedor funcional
- Desde asignar productos hasta ver resumen final

---

## Fase 5: Cierre del dia - Consolidado (admin)

**Objetivo:** El admin puede ver el consolidado de todos los vendedores y cerrar el dia.

### Tareas

- [ ] Pagina de resumen del dia (`/jornada/resumen`)
  - Tabla con todos los vendedores y sus totales
  - Detalle expandible por vendedor
  - Totales generales (venta, gastos, transferencias, descuentos)
  - Efectivo total recaudado
- [ ] Cierre del dia (admin)
  - Campo para monto de alcancia
  - Seccion para registrar pagas:
    - Agregar paga (nombre + monto)
    - Eliminar paga
  - Calculo final:
    - Efectivo total - Alcancia - Pagas = Saldo del dia
  - Boton de confirmar cierre
  - La jornada cambia a estado "cerrada"
- [ ] Mostrar saldo acumulado de la semana
  - Saldo del dia se suma al acumulado
  - Mostrar el saldo actualizado

### Entregable

- Vista consolidada de todos los vendedores
- Cierre del dia con alcancia y pagas
- Saldo diario y semanal visible

---

## Fase 6: Gestion semanal e inversiones

**Objetivo:** El admin puede gestionar el ciclo semanal completo.

### Tareas

- [ ] Pagina de semana actual (`/semana`)
  - Resumen de la semana (viernes a jueves)
  - Tabla con saldos de cada dia
  - Saldo acumulado
  - Lista de inversiones y gastos personales
- [ ] Gestion de semanas
  - Crear nueva semana (automatica o manual)
  - Arrastrar saldo de la semana anterior
  - Cerrar semana
- [ ] Registro de inversiones (`/semana/inversiones`)
  - Formulario: fecha, descripcion, monto, tipo (inversion/gasto personal)
  - Lista de inversiones de la semana
  - Impacto en el saldo (antes/despues)
  - Editar/eliminar inversion
- [ ] Dashboard actualizado
  - Mostrar saldo actual de la semana
  - Acceso rapido a registrar inversion
  - Estado de la jornada del dia

### Entregable

- Ciclo semanal completo funcionando
- Inversiones y gastos personales
- Saldo acumulado correcto

---

## Fase 7: Historial y reportes

**Objetivo:** Consultar datos historicos por semana y por mes.

### Tareas

- [ ] Pagina de historial (`/historial`)
  - Lista de semanas pasadas con resumen rapido
  - Filtro por mes
- [ ] Detalle de semana pasada (`/historial/semana/[id]`)
  - Mismo formato que la vista de semana actual
  - Solo lectura
- [ ] Resumen mensual (`/historial/mes/[year]/[month]`)
  - Agregar datos de todas las semanas del mes
  - Totales: ventas, gastos, transferencias, descuentos, alcancia, pagas, inversiones
  - Saldo neto del mes
- [ ] Estadisticas basicas
  - Producto mas vendido
  - Dia de mas venta
  - Promedio de venta diaria
  - Tendencia de ventas (sube/baja respecto a semana anterior)

### Entregable

- Consulta de cualquier semana pasada
- Reportes mensuales
- Estadisticas basicas

---

## Fase 8: PWA e instalacion en telefono

**Objetivo:** La app se puede instalar en el telefono como una app nativa.

### Tareas

- [ ] Crear `manifest.json`
  - Nombre: "Empanadas App"
  - Iconos en diferentes tamanos (192x192, 512x512)
  - Color de tema
  - Display: standalone
- [ ] Crear Service Worker
  - Cache de assets estaticos (HTML, CSS, JS)
  - Estrategia: Network First (intentar red, si falla usar cache)
  - No cache de datos (siempre necesita internet para datos)
- [ ] Configurar meta tags para PWA
  - `<meta name="theme-color">`
  - `<link rel="manifest">`
  - `<meta name="apple-mobile-web-app-capable">`
- [ ] Crear iconos de la app
  - Icono simple y reconocible
  - Diferentes tamanos para Android e iOS
- [ ] Probar instalacion
  - Android: Chrome -> "Agregar a pantalla de inicio"
  - iOS: Safari -> Compartir -> "Agregar a pantalla de inicio"

### Entregable

- App instalable en telefono
- Icono en pantalla de inicio
- Abre en pantalla completa

---

## Fase 9: Mejoras de UX y pulido

**Objetivo:** Mejorar la experiencia de usuario y pulir detalles.

### Tareas

- [ ] Feedback visual
  - Loading states en botones y formularios
  - Toast/notificaciones de exito/error
  - Animaciones sutiles
- [ ] Accesibilidad
  - Labels en formularios
  - Contraste adecuado
  - Tamano de botones tactiles (min 44px)
- [ ] Responsive final
  - Verificar en diferentes tamanos de pantalla
  - Optimizar para telefonos pequenos
- [ ] Confirmaciones
  - Confirmar antes de eliminar
  - Confirmar antes de cerrar jornada/semana
  - Prevenir doble envio de formularios
- [ ] Manejo de errores
  - Paginas de error personalizadas
  - Manejo de errores de red
  - Reintentar operaciones fallidas
- [ ] Dark mode (opcional)
  - Tema oscuro para vender de noche

### Entregable

- App pulida y lista para uso diario
- Buena experiencia en telefono

---

## Orden Recomendado de Implementacion

```
Fase 1 (Setup)
    |
    v
Fase 2 (Auth)
    |
    v
Fase 3 (Productos/Vendedores)
    |
    v
Fase 4 (Jornada vendedor)  ←  Este es el nucleo del sistema
    |
    v
Fase 5 (Cierre dia)
    |
    v
Fase 6 (Semana/Inversiones)
    |
    v
Fase 7 (Historial)     Fase 8 (PWA)   ← Estas pueden ir en paralelo
    |                       |
    v                       v
         Fase 9 (Pulido)
```

**MVP (Producto Minimo Viable):** Fases 1-5 dan un sistema usable para registrar ventas diarias.

**Sistema completo:** Fases 1-8 cubren toda la funcionalidad descrita.

---

## Estimacion de Tiempo

Estas son estimaciones aproximadas asumiendo desarrollo por una persona:

| Fase                         | Estimacion      |
| ---------------------------- | --------------- |
| Fase 1: Setup                | 2-3 horas       |
| Fase 2: Auth                 | 3-4 horas       |
| Fase 3: Productos/Vendedores | 3-4 horas       |
| Fase 4: Jornada vendedor     | 6-8 horas       |
| Fase 5: Cierre dia           | 4-5 horas       |
| Fase 6: Semana/Inversiones   | 4-5 horas       |
| Fase 7: Historial            | 4-5 horas       |
| Fase 8: PWA                  | 2-3 horas       |
| Fase 9: Pulido               | 3-4 horas       |
| **Total estimado**           | **31-41 horas** |

**Nota:** Estas estimaciones son orientativas. El desarrollo real puede variar segun la complejidad de la UI, bugs encontrados, y ajustes de logica de negocio.
