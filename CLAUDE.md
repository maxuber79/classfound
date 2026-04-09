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
- `is_course_member(p_course_id uuid)` → verifica membresía activa, SECURITY DEFINER

### Políticas RLS activas

- `transactions_insert_tesorero_or_super_admin` → INSERT
- `transactions_update_tesorero_or_super_admin` → UPDATE
- `receipts_insert_tesorero_or_super_admin` → INSERT
- `categories_insert_course_member` → INSERT
- `categories_update_course_member` → UPDATE
- `categories_delete_course_member` → DELETE

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
- /dashboard/categories → sin roleGuard, acceso por rol en componente
- /dashboard/transactions → modo global, protegido por roleGuard
- /dashboard/courses/:courseId/transactions → modo contextual
- /dashboard/receipts → pendiente Fase 4
- /dashboard/reports → pendiente Fase 5

## Guards

- `authGuard` → protege todo el dashboard, verifica sesión activa
- `loginGuard` → redirige a /dashboard si ya está autenticado
- `roleGuard` → protege rutas admin, verifica global_role desde profiles

## Módulos y estado actual

### ✅ Autenticación

- Login, Register, Forgot/Reset password: funcional
- Dashboard protegido por authGuard
- Roles implementados en frontend ✅
- ⏳ Register pendiente: reemplazar por wizard Bootstrap de 3 pasos

### ✅ AuthService (roles)

- `_profile` signal carga global_role desde tabla profiles ✅
- `isAdmin` computed: true si global_role es admin o super_admin ✅
- `isSuperAdmin` computed: true si global_role es super_admin ✅
- `isCourseUser` computed: true si tiene membresía activa en course_members ✅
- `courseProfile` signal: carga course_members + courses + schools anidado ✅
- `loadProfile(userId)` se llama automáticamente en onAuthStateChange ✅
- `loadCourseProfile(userId)` se llama si global_role = user ✅

### ✅ Usuarios

- Módulo admin funcional en dashboard/admin/users
- Protegido por roleGuard ✅
- Tabla con columna Colegio/Curso ✅
- Modal crear: selects colegio → curso → rol (solo si global_role = user) ✅
- Modal editar: mismos selects con datos precargados ✅
- getOccupiedRoles() bloquea roles únicos ya asignados en el curso ✅
- super_admin no ve sección de asignación de curso ✅

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
- Widgets: balance global, ingresos, egresos, total transacciones
- Protegido por roleGuard ✅

**Modo Contextual** → `/dashboard/courses/:courseId/transactions`

- Filtra por course_id
- Header dinámico: nombre curso · colegio · año
- Widgets contextuales: balance, ingresos, egresos, movimientos
- Carga categorías globales + las del colegio ✅

### ✅ Categorías

- CRUD funcional como catálogo global
- Sin roleGuard → acceso controlado por rol en componente ✅
- Header dinámico: colegio + curso para usuario contextual ✅
- Usuario contextual: ve globales + las de su colegio (activas e inactivas) ✅
- Usuario contextual: puede crear, editar, desactivar y eliminar categorías de su colegio ✅
- Admin: siempre crea categorías globales (school_id = null) ✅
- RLS: categories_insert/update/delete_course_member implementadas ✅

### ✅ Dashboard / Sidebar

- Menú dinámico filtrado por rol con computed() ✅
- Admin/super_admin → ve todo el menú
- Usuario contextual → ve Inicio, Categorías, Transacciones, Comprobantes, Reportes, Mi perfil
- Transacciones contextuales apuntan a /courses/:courseId/transactions ✅

### ✅ Dashboard Home (widgets)

- Admin → 4 widgets globales: colegios, cursos, usuarios, transacciones
- Usuario contextual → 4 widgets del curso: ingresos, egresos, saldo, movimientos
- Skeleton loader mientras cargan ✅
- effect() reactivo al courseProfile ✅

### ⏳ Comprobantes (receipts)

- Tabla en BD: lista
- Componente dummy creado ✅
- Frontend: pendiente Fase 4

### ⏳ Reportes

- Componente dummy creado ✅
- Pendiente Fase 5

## Fases pendientes (orden recomendado)

**Fase 1** → Categorías globales + por colegio ✅ Completada
**Fase 2** → Roles reales en frontend ✅ Completada
**Fase 3** → Widgets y dashboard definitivos ✅ Completada
**Fase 3.5** → Permisos y acceso por rol ✅ Completada
**Fase 3.6** → Gestión de usuarios con asignación de curso ✅ Completada

**Fase 3.7** → Wizard de registro ⏳ EN CURSO

- El registro actual es un formulario simple → reemplazar por wizard Bootstrap de 3 pasos
- Paso 1: Datos personales (nombre, apellido, teléfono, email, contraseña)
- Paso 2: Selección de colegio → curso (select encadenado)
- Paso 3: Selección de rol en el curso (presidente, tesorero, secretario, apoderado)
- Claudio está construyendo el HTML/SCSS del wizard → pendiente integrar con Angular
- Al completar: crear usuario en auth.users + profiles + course_members
- Misma Edge Function `create-user-admin` que usa el admin panel

**Fase 3.7** → Wizard de registro ✅ Completada

- Wizard Bootstrap de 4 pasos integrado con Angular signals
- Paso 1: datos personales con validación reactiva (FormGroup)
- Paso 2: selects encadenados colegio → curso desde Supabase
- Paso 3: resumen computed + checkbox de confirmación
- Paso 4: éxito con login automático y redirección al dashboard
- getActiveSchools() agregado en SchoolsService
- getActiveCoursesBySchool() agregado en CourseService
- Política RLS pública para schools y courses activos (is_active = true)
- Edge Function create-user-admin con JWT verification desactivado

**Fase 3.8** → Eliminar usuario desde panel admin ✅ Completada

- Nueva Edge Function delete-user-admin con borrado en cascada
  course_members → profiles → auth.users
- Agrega deleteUser() en AdminUsersService via Edge Function
- Agrega deleteUser() en UsersPage con confirmación window.confirm
- Botón eliminar en tabla de usuarios junto a acciones existentes
- JWT verification desactivado en delete-user-admin (igual que create-user-admin)

**Fase 3.9** → Mejoras wizard de registro ✅ Completada

- Paso 2 permite alternar entre seleccionar o crear colegio/curso
- Nuevos FormGroups: newSchoolForm y newCourseForm con signals createNewSchool/createNewCourse
- submitWizard crea colegio/curso en Supabase antes de invocar Edge Function
- summary computed actualizado para mostrar datos de colegio/curso nuevo
- Políticas RLS INSERT públicas para schools y courses activos
- Campo comuna usa select desde JSON comunas-chile.json via LocationService
- JSON de 50 colegios RM descartado — flujo de creación cubre el caso de uso

**Fase 3.10** → Cambio de contraseña en perfil ✅ Completada

- Sección independiente debajo del formulario de perfil existente
- Nuevo passwordForm con validación y confirmación de contraseña
- Método changePassword() usa AuthService.updatePassword()
- Signals: savingPassword, passwordSuccess, passwordError
- Toggle visibilidad en ambos campos de contraseña

**Fase 4** → Comprobantes (receipts) ⏳ Pendiente
**Fase 5** → Reportes y analítica ⏳ Pendiente

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

Cl@udio (WEBM@IN)
