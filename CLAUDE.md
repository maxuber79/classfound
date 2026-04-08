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

### Enums

- `global_role_enum`: `super_admin`, `user`
- `course_role_enum`: `presidente`, `tesorero`, `secretario`, `apoderado`
- `category_type_enum`: `income`, `expense`
- `transaction_type_enum`: `income`, `expense`

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
- role: course_role_enum → valores: presidente, tesorero, secretario, apoderado
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

### Funciones RLS

- `is_super_admin()` → verifica global_role = super_admin
- `has_course_role(p_course_id uuid, p_role course_role_enum)` → verifica rol activo en course_members

### Políticas RLS activas

- `transactions_insert_tesorero_or_super_admin` → INSERT
- `transactions_update_tesorero_or_super_admin` → UPDATE
- `receipts_insert_tesorero_or_super_admin` → INSERT

## Estructura del proyecto Angular

src/app/
│ app.config.ts
│ app.html
│ app.routes.ts
│ app.scss
│ app.ts
│
├───auth/
│ ├───guards/
│ │ auth.guard.ts
│ │ login.guard.ts
│ │ role.guard.ts
│ ├───pages/
│ │ ├───forgot-password/
│ │ ├───login/
│ │ ├───register/
│ │ └───reset-password/
│ └───services/
│ auth.service.ts
│
├───core/
│ └───services/
│ location.service.ts
│ supabase.service.ts
│ toast.service.ts
│
├───features/
│ ├───admin/users/
│ │ ├───models/
│ │ ├───pages/users-page/
│ │ └───services/admin-users.service.ts
│ │
│ ├───categories/
│ │ ├───models/category.interface.ts
│ │ ├───pages/categories-page/
│ │ └───services/categories.service.ts
│ │
│ ├───courses/
│ │ ├───models/course.interface.ts
│ │ ├───pages/course-page/
│ │ └───services/course.service.ts
│ │
│ ├───dashboard/
│ │ ├───components/
│ │ ├───pages/
│ │ │ ├───dashboard/ ← layout principal
│ │ │ └───dashboard-home/ ← widgets y home ← FASE 3 aquí
│ │ └───services/
│ │ profile.service.ts
│ │ dashboard.service.ts ← CREAR en Fase 3
│ │
│ ├───members/ ← vacío, uso futuro
│ │
│ ├───profile/
│ │ ├───models/profile.interface.ts
│ │ ├───pages/profile-page/
│ │ └───services/profile.service.ts
│ │
│ ├───schools/
│ │ ├───models/school.interface.ts
│ │ ├───pages/schools/
│ │ └───services/school.service.ts
│ │
│ └───transactions/
│ ├───models/
│ │ cursos.interface.ts
│ │ transaction.interface.ts
│ ├───pages/transactions/
│ └───services/transactions.service.ts
│
├───layout/
│ ├───navbar/
│ ├───shell/
│ └───sidebar/
│
└───shared/
├───components/toast/
├───models/
│ course-member.interface.ts ← agregar CourseRole enum
│ course.interface.ts
│ profile.interface.ts
│ school.interface.ts
└───utils/

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
- Protegido por authGuard (sin roleGuard) ✅
- Header dinámico: colegio + curso para usuario contextual ✅
- Usuario contextual: ve globales + las de su colegio (activas e inactivas) ✅
- Usuario contextual: puede crear, editar, desactivar y eliminar categorías de su colegio ✅
- Admin: siempre crea categorías globales (school_id = null) ✅
- RLS: categories_insert/update/delete_course_member implementadas ✅

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

**Fase 2** → Roles reales en frontend ✅ Completada

**Fase 3** → Widgets y dashboard definitivos ✅ Completada

- ✅ course_role_enum migrado: presidente, tesorero, secretario, apoderado
- ✅ Políticas RLS y función has_course_role recreadas
- ✅ is_course_member() corregida con SECURITY DEFINER
- ✅ DashboardService con getAdminStats() y getCourseStats()
- ✅ AuthService: courseProfile signal + isCourseUser computed
- ✅ Dashboard-home: widgets admin vs contextual con effect()
- ✅ UI: cards con card-variant mixin, Bootstrap Icons, skeleton loader

**Fase 3.5** → Permisos y acceso por rol ✅ Completada

- ✅ course_role_enum: presidente, tesorero, secretario, apoderado
- ✅ Rutas receipts y reports creadas (componentes dummy)
- ✅ roleGuard removido de categories → acceso para usuario contextual
- ✅ Sidebar dinámico: usuario contextual ve Categorías, Transacciones, Comprobantes, Reportes
- ✅ Transacciones contextuales: usuario va directo a su curso
- ✅ CourseMember interface: agrega courses + schools anidado
- ✅ AuthService: loadCourseProfile carga school_id del curso
- ✅ Categorías modo contextual: header dinámico colegio + curso
- ✅ Categorías modo contextual: CRUD solo en categorías del colegio
- ✅ RLS: categories_insert/update/delete_course_member
- ✅ Admin siempre crea categorías globales

**Fase 4** → Comprobantes (receipts) ⏳ Pendiente

**Fase 5** → Reportes y analítica ⏳ Pendiente

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
