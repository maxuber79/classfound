# Classfund

App Angular de gestión de fondos de curso escolar,
orientada al mercado latinoamericano.

## Stack

- Angular (última versión, standalone components, signals)
- Supabase (DB PostgreSQL + Auth + Storage + RLS)
- Bootstrap 5
- SCSS con sistema de diseño propio (BEM + mixin `card-variant`)

## Hosting

- Vercel (frontend)
- Supabase (backend)
- Dominios: classfund.cl / classfund.app

## Tipografía

- Plus Jakarta Sans (fuente principal)

## Theming

- CSS custom properties
- Dark mode con `[data-theme="dark"]`

## Esquema de base de datos (Supabase)

### profiles

Vinculada a auth.users.id

- id: uuid (PK)
- full_name, first_name, last_name, phone, avatar_url: text
- email: text
- global_role: global_role_enum
- is_active: bool
- created_at, updated_at: timestamp

### schools

- id: uuid (PK)
- name, commune, region: text
- is_active: bool
- created_at, updated_at: timestamp

### courses

- id: uuid (PK)
- school_id: uuid (FK → schools)
- name, level, section: text
- school_year: int4
- is_active: bool
- created_at, updated_at: timestamp

### course_members

- id: uuid (PK)
- course_id: uuid (FK → courses)
- user_id: uuid (FK → profiles)
- role: course_role_enum
- is_active: bool
- created_at, updated_at: timestamp

### categories

- id: uuid (PK)
- name: text
- type: category_type_enum (income / expense)
- is_active: bool
- school_id: uuid nullable (FK → schools) ✅ implementado
- created_at, updated_at: timestamp

### transactions

- id: uuid (PK)
- course_id: uuid (FK → courses)
- category_id: uuid (FK → categories)
- type: transaction_type_enum
- amount: numeric
- description, notes: text
- transaction_date: date
- created_by, updated_by: uuid (FK → profiles)
- created_at, updated_at: timestamp

### receipts

- id: uuid (PK)
- transaction_id: uuid (FK → transactions)
- file_path, file_name: text
- mime_type: text
- file_size: int4
- uploaded_by: uuid (FK → profiles)
- created_at: timestamp

## Estructura de rutas

- /dashboard → protegido por authGuard
- /dashboard/admin/users → protegido por roleGuard
- /dashboard/profile
- /dashboard/schools → protegido por roleGuard
- /dashboard/courses → protegido por roleGuard
- /dashboard/categories → protegido por roleGuard
- /dashboard/transactions → modo global, protegido por roleGuard
- /dashboard/courses/:courseId/transactions → modo contextual

## Guards

- `authGuard` → protege todo el dashboard, verifica sesión activa
- `loginGuard` → redirige a /dashboard si ya está autenticado
- `roleGuard` → protege rutas admin, verifica global_role desde profiles

## Módulos y estado actual

### ✅ Autenticación

- Login, Register, Forgot/Reset password: funcional
- Dashboard protegido por authGuard
- Roles implementados en frontend ✅

### ✅ AuthService (roles)

- `_profile` signal carga global_role desde tabla profiles ✅
- `isAdmin` computed: true si global_role es admin o super_admin ✅
- `isSuperAdmin` computed: true si global_role es super_admin ✅
- `loadProfile(userId)` se llama automáticamente en onAuthStateChange ✅

### ✅ Usuarios

- Módulo admin funcional en dashboard/admin/users
- Protegido por roleGuard ✅

### ✅ Perfil

- Vista y edición del perfil propio: funcional
- Accesible para todos los roles ✅

### ✅ Colegios

- CRUD funcional
- Protegido por roleGuard ✅

### ✅ Cursos

- CRUD completo funcional
- Filtros, paginación, modal crear/editar/ver
- Activar/inactivar, eliminar
- Navegación a transacciones contextuales: funcional
- Protegido por roleGuard ✅

### ✅ Transacciones (módulo más avanzado)

**Modo Global** → `/dashboard/transactions`

- Lista todas las transacciones del sistema
- Columna Curso visible
- Select de cursos en modal
- Header genérico
- Widgets globales (versión preliminar)
- Protegido por roleGuard ✅

**Modo Contextual** → `/dashboard/courses/:courseId/transactions`

- Filtra por course_id
- Header dinámico: nombre curso · colegio · año
- Modal con input readonly del curso
- Columna Curso oculta
- Empty state contextual
- Botón volver a cursos usa isAdmin() signal real ✅
- Widgets contextuales funcionales como primera versión
- Carga categorías globales + las del colegio en modo contextual ✅

**Service:** getTransactions(), getTransactionsByCourse(),
createTransaction(), updateTransaction(), deleteTransaction()

### ✅ Categorías

- CRUD funcional como catálogo global
- Filtradas por tipo (income/expense) en modal de transacciones
- school_id nullable implementado en BD ✅
- getCategoriesBySchool() implementado en service ✅
- Transacciones carga globales + las del colegio en modo contextual ✅
- Protegido por roleGuard ✅
- Administración de categorías por colegio desde categories-page: pendiente

### ✅ Dashboard / Sidebar

- Menú dinámico filtrado por rol con computed() ✅
- Admin/super_admin → ve todo el menú
- Usuario contextual → ve solo Inicio y Mi perfil
- roleGuard bloquea acceso directo por URL a rutas admin ✅

### ⏳ Comprobantes (receipts)

- Tabla en BD: lista
- Frontend: pendiente

### ⏳ Reportes

- Conceptual solamente, no implementado

## Fases pendientes (orden recomendado)

**Fase 1** → Categorías globales + por colegio ✅ Completada

- ✅ school_id nullable agregado a categories
- ✅ getCategoriesBySchool() en service
- ✅ Transacciones carga categorías según contexto
- ⏳ Pendiente menor: UI en categories-page para crear categorías por colegio

**Fase 2** → Roles reales en frontend ✅ Completada

- ✅ AuthService carga global_role desde profiles
- ✅ isAdmin y isSuperAdmin como computed signals
- ✅ roleGuard creado y aplicado a rutas admin
- ✅ Menú sidebar filtrado por rol con computed()
- ✅ Flag temporal isAdmin = true eliminado de transactions.ts

**Fase 3** → Widgets y dashboard admin global definitivos

**Fase 4** → Comprobantes (receipts)

- Módulo visual, subida de archivos, vínculo con transacción

**Fase 5** → Reportes y analítica

## Convenciones de código

- Todas las funciones documentadas con JSDoc
- Variable global DEBUG para habilitar/deshabilitar console.log
  - DEBUG=true en desarrollo
  - DEBUG=false en main/producción
- console.log con trazabilidad en cada función

## Forma de trabajo

- Antes de codear, siempre presentar un resumen
  claro y simple de lo que se va a hacer
- No avanzar a otra tarea hasta que la actual
  esté terminada, sin errores y con commit guardado
- Primero TypeScript, luego HTML
- Avanzar paso a paso validando cada etapa

## Autor

Claudio (WEBMAIN)
