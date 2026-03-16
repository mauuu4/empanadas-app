# Arquitectura Tecnica - Empanadas App

---

## Stack Tecnologico

| Componente             | Tecnologia            | Version   | Justificacion                                 |
| ---------------------- | --------------------- | --------- | --------------------------------------------- |
| **Framework**          | Next.js (App Router)  | 15.x      | SSR, API routes, React Server Components, PWA |
| **Lenguaje**           | TypeScript            | 5.x       | Tipado estricto, menos errores                |
| **Estilos**            | Tailwind CSS          | 4.x       | Desarrollo rapido, responsive, mobile-first   |
| **Base de datos**      | PostgreSQL (Supabase) | 15.x      | Relacional, SQL, RLS, gratis                  |
| **Autenticacion**      | Supabase Auth         | -         | Integrada con la DB, sesiones, RLS            |
| **Hosting**            | Vercel                | Free tier | Deploy automatico, CDN, dominio gratis        |
| **Control de version** | Git + GitHub          | -         | Versionado, deploy automatico a Vercel        |

### Limites del Free Tier

**Vercel (Free):**

- Ancho de banda: 100 GB/mes (mas que suficiente)
- Builds: 6000 minutos/mes
- Serverless functions: 100 GB-horas/mes
- Sin limite de deploys

**Supabase (Free):**

- Base de datos: 500 MB
- Almacenamiento: 1 GB
- Ancho de banda: 2 GB
- 50,000 filas activas mensuales
- Auth: usuarios ilimitados
- Proyecto se pausa despues de 1 semana de inactividad (se reactiva al acceder)

**Nota sobre pausa de Supabase:** En el free tier, si no hay actividad por 7 dias, el proyecto se pausa. Como el negocio es diario, esto no deberia ser un problema. Si algun dia se pausa, se reactiva automaticamente al acceder (tarda unos segundos).

---

## Arquitectura General

```
[Navegador (telefono/PC)]
        |
        | HTTPS
        v
[Next.js en Vercel]
   |           |
   | SSR/RSC   | API Routes
   |           |
   v           v
[Supabase]
   |
   ├── PostgreSQL (datos)
   ├── Auth (autenticacion)
   └── Realtime (opcional, futuro)
```

### Flujo de datos

1. El usuario abre la app en el navegador
2. Next.js sirve la pagina (SSR para carga rapida)
3. La autenticacion se maneja con Supabase Auth (PIN -> sesion)
4. Las operaciones de datos van directamente de Next.js a Supabase
5. Se usa el cliente de Supabase tanto en servidor (SSR) como en cliente (interacciones)

---

## Autenticacion con PIN

Supabase Auth usa email/password nativamente. Para implementar login con PIN:

### Estrategia

1. Cada vendedor tiene un "email interno" generado automaticamente:
   - Formato: `{nombre_normalizado}@empanadas.local`
   - Ejemplo: `mauricio@empanadas.local`
2. El PIN de 4 digitos se usa como password
3. En la UI, el usuario solo ve su nombre y el campo de PIN
4. Internamente se traduce a email + password para Supabase Auth

### Flujo de login

```
Usuario selecciona: "Mauricio"
Usuario ingresa PIN: "1234"
                |
                v
App traduce a:
  email: "mauricio@empanadas.local"
  password: "1234"
                |
                v
Supabase Auth:
  signInWithPassword({ email, password })
                |
                v
Sesion creada -> cookie -> acceso al sistema
```

### Seguridad

- El PIN es de 4 digitos (suficiente para un negocio familiar)
- Solo el admin puede crear/cambiar PINs
- Las sesiones expiran despues de 24 horas de inactividad
- RLS en Supabase asegura que cada vendedor solo modifique sus propios datos

---

## PWA (Progressive Web App)

La app se configura como PWA para que los vendedores puedan "instalarla" en su telefono.

### Beneficios

- Icono en la pantalla de inicio (como una app nativa)
- Se abre en pantalla completa (sin barra del navegador)
- Splash screen al abrir
- Carga mas rapido despues de la primera vez

### Implementacion

- `manifest.json` con nombre, iconos, colores del tema
- Service Worker basico para cache de assets estaticos
- Se usa `next-pwa` o configuracion manual del service worker
- No se implementa modo offline completo (requiere internet para operar)

### Instalacion

- En Android: Chrome muestra "Agregar a pantalla de inicio"
- En iOS: Safari -> Compartir -> "Agregar a pantalla de inicio"

---

## Estructura del Proyecto

```
empanadas-app/
├── .env.local                    # Variables de entorno (Supabase keys)
├── .env.example                  # Ejemplo de variables (sin secretos)
├── .gitignore
├── next.config.ts                # Configuracion de Next.js
├── tailwind.config.ts            # Configuracion de Tailwind (si necesario)
├── tsconfig.json                 # Configuracion de TypeScript
├── package.json
├── pnpm-lock.yaml
│
├── docs/                         # Documentacion del negocio
│   ├── NEGOCIO.md
│   ├── MODELO-DATOS.md
│   ├── FLUJOS.md
│   ├── ARQUITECTURA.md
│   └── PLAN-DESARROLLO.md
│
├── supabase/
│   ├── migrations/               # Archivos SQL de migracion
│   │   └── 001_initial.sql       # Esquema inicial completo
│   └── seed.sql                  # Datos iniciales (productos, admin)
│
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icons/                    # Iconos de la app (diferentes tamanos)
│   └── sw.js                     # Service Worker
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Layout raiz (HTML, providers)
│   │   ├── page.tsx              # Pagina de inicio (redirect a login o dashboard)
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx          # Pantalla de login (seleccionar nombre + PIN)
│   │   │
│   │   ├── (app)/                # Grupo de rutas protegidas (requiere auth)
│   │   │   ├── layout.tsx        # Layout con navegacion, verificacion de sesion
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      # Vista principal: jornada del dia, accesos rapidos
│   │   │   │
│   │   │   ├── jornada/
│   │   │   │   ├── page.tsx      # Detalle de la jornada actual
│   │   │   │   ├── asignar/
│   │   │   │   │   └── page.tsx  # Asignar productos al vendedor
│   │   │   │   ├── movimientos/
│   │   │   │   │   └── page.tsx  # Registrar gastos, transferencias, descuentos
│   │   │   │   ├── cerrar/
│   │   │   │   │   └── page.tsx  # Cerrar venta (registrar sobrantes)
│   │   │   │   └── resumen/
│   │   │   │       └── page.tsx  # Resumen consolidado del dia (admin)
│   │   │   │
│   │   │   ├── semana/
│   │   │   │   ├── page.tsx      # Vista de la semana actual
│   │   │   │   └── inversiones/
│   │   │   │       └── page.tsx  # Registrar inversiones y gastos personales
│   │   │   │
│   │   │   ├── historial/
│   │   │   │   ├── page.tsx      # Lista de semanas/meses
│   │   │   │   ├── semana/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Detalle de una semana pasada
│   │   │   │   └── mes/
│   │   │   │       └── [year]/
│   │   │   │           └── [month]/
│   │   │   │               └── page.tsx  # Resumen mensual
│   │   │   │
│   │   │   └── admin/            # Solo accesible por admin
│   │   │       ├── productos/
│   │   │       │   └── page.tsx  # CRUD de productos
│   │   │       └── vendedores/
│   │   │           └── page.tsx  # CRUD de vendedores
│   │   │
│   │   └── api/                  # API routes (si se necesitan)
│   │       └── auth/
│   │           └── route.ts      # Manejo de autenticacion
│   │
│   ├── components/
│   │   ├── ui/                   # Componentes base reutilizables
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Table.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/               # Componentes de layout
│   │   │   ├── Navbar.tsx        # Navegacion inferior (mobile) o lateral (desktop)
│   │   │   ├── Header.tsx        # Encabezado con nombre del vendedor
│   │   │   └── PageTitle.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx     # Formulario de login
│   │   │   └── PinInput.tsx      # Input de PIN (4 digitos)
│   │   │
│   │   ├── jornada/
│   │   │   ├── ProductoAsignar.tsx    # Fila de producto para asignar
│   │   │   ├── MovimientoForm.tsx     # Formulario de gasto/transferencia/descuento
│   │   │   ├── MovimientoList.tsx     # Lista de movimientos del dia
│   │   │   ├── SobranteForm.tsx       # Formulario de sobrantes
│   │   │   ├── ResumenVendedor.tsx    # Resumen individual
│   │   │   └── ConsolidadoDia.tsx     # Tabla consolidada de todos los vendedores
│   │   │
│   │   ├── semana/
│   │   │   ├── ResumenSemanal.tsx     # Tabla resumen de la semana
│   │   │   ├── InversionForm.tsx      # Formulario de inversion
│   │   │   └── SaldoCard.tsx          # Card con saldo acumulado
│   │   │
│   │   └── historial/
│   │       ├── SemanaCard.tsx         # Card resumen de una semana
│   │       └── MesResumen.tsx         # Resumen mensual
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Cliente de Supabase para el navegador
│   │   │   ├── server.ts         # Cliente de Supabase para el servidor (SSR)
│   │   │   └── middleware.ts     # Middleware para refrescar sesion
│   │   ├── utils.ts              # Funciones utilitarias
│   │   └── constants.ts          # Constantes de la app
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Hook de autenticacion
│   │   ├── useJornada.ts         # Hook para operaciones de jornada
│   │   └── useSemana.ts          # Hook para operaciones de semana
│   │
│   └── types/
│       ├── index.ts              # Tipos principales (exporta todo)
│       ├── database.ts           # Tipos generados por Supabase
│       └── app.ts                # Tipos especificos de la app
│
└── middleware.ts                  # Next.js middleware (proteccion de rutas)
```

---

## Patrones de Codigo

### Componentes

- Componentes de React funcionales con TypeScript
- Props tipadas con interfaces
- Componentes del servidor (RSC) por defecto, `'use client'` solo cuando necesario
- Mobile-first design con Tailwind

### Acceso a datos

- **Servidor (RSC/API routes):** Supabase server client con cookies
- **Cliente (interacciones):** Supabase browser client
- Queries directas con el SDK de Supabase (no ORM adicional)

### Manejo de estado

- React Server Components para la mayoria de la UI
- `useState` / `useReducer` para estado local de formularios
- No se necesita estado global complejo (Context si es necesario)
- Revalidacion de datos con `revalidatePath()` de Next.js

### Formateo y estilo

- Prettier con las mismas reglas del proyecto lauemprende:
  - Sin semicolons
  - Single quotes
  - 2 espacios de indentacion
- ESLint con reglas de Next.js + TypeScript

---

## Consideraciones de Rendimiento

1. **SSR:** Las paginas se renderizan en el servidor para carga rapida
2. **Cache:** Los datos estaticos (productos, vendedores) se cachean
3. **Imagenes:** No hay imagenes pesadas, la app es principalmente datos y formularios
4. **Bundle size:** Minimo, no hay librerias pesadas de UI
5. **Mobile-first:** Optimizado para conexiones lentas

---

## Seguridad

1. **Autenticacion:** Supabase Auth maneja sesiones seguras con JWT
2. **Autorizacion:** RLS en PostgreSQL asegura acceso a nivel de fila
3. **Middleware:** Next.js middleware protege las rutas que requieren autenticacion
4. **Variables de entorno:** Las keys de Supabase se manejan con `.env.local`
5. **HTTPS:** Vercel provee HTTPS automaticamente

---

## Deploy y CI/CD

```
git push a main
      |
      v
Vercel detecta el push
      |
      v
Build: pnpm install && pnpm build
      |
      v
Deploy automatico a produccion
      |
      v
URL: empanadas-app.vercel.app (o dominio personalizado)
```

- No se necesitan pasos adicionales de CI (no hay tests configurados)
- Preview deploys automaticos para pull requests
- Rollback instantaneo desde el dashboard de Vercel
