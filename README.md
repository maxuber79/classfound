# Classfund / Tesoreria Cursos

Aplicacion web para administrar fondos de cursos escolares: colegios, cursos, usuarios, categorias, transacciones, comprobantes y reportes.

El proyecto esta orientado al mercado chileno/latinoamericano y usa Angular para el frontend y Supabase como backend.

## Stack

- Angular 20
- Standalone components
- Angular signals y computed
- Supabase Auth
- Supabase PostgreSQL + RLS
- Supabase Storage
- Supabase Edge Functions
- Bootstrap 5
- Bootstrap Icons
- SCSS

## Estado Actual

- Rama principal de trabajo local: `dev`.
- Build de produccion validado con `npx ng build`.
- Autenticacion, dashboard, usuarios, colegios, cursos, categorias y transacciones estan funcionales.
- Comprobantes tiene modelo/servicio en avance.
- Reportes existe como modulo base pendiente de analitica real.

Ultimos checkpoints relevantes:

- `e334d2d checkpoint: guardar avance actual`
- `9cccf5c fix: asegurar funciones admin y build`

## Requisitos

- Node.js compatible con Angular 20
- npm
- Angular CLI
- Proyecto Supabase configurado
- Supabase CLI, si se van a desplegar Edge Functions

## Instalacion

```bash
npm install
```

## Comandos

```bash
# Servidor local
npm start

# Build produccion
npx ng build

# Build desarrollo
npx ng build --configuration development

# Tests
npm test
```

Luego abrir:

```text
http://localhost:4200
```

Nota en Windows: si `npm run build -- --configuration development` se interpreta mal, usar directamente `npx ng build --configuration development`.

## Build

El build de produccion compila correctamente.

Warnings conocidos:

- Bundle inicial aproximado: `1.09 MB`.
- `login.scss` supera el budget recomendado de estilos de componente.
- `transactions.scss` supera levemente el budget recomendado de estilos de componente.

Estos warnings no bloquean el build. La optimizacion de SCSS queda como tarea pendiente.

## Variables de Entorno Frontend

Archivo:

```text
src/environments/environment.ts
```

Formato actual:

```ts
export const environment = {
  production: false,
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',
    key: 'TU_SUPABASE_PUBLISHABLE_O_ANON_KEY'
  }
};
```

Regla importante:

Nunca poner `service_role` ni JWT administrativos en Angular. El frontend solo debe usar publishable/anon key.

## Seguridad Supabase

Las operaciones administrativas pasan por Edge Functions.

La `SERVICE_ROLE_KEY` debe existir solo como secret/variable del entorno Supabase, no en el repo ni en `src/environments`.

Accion pendiente importante:

- Rotar en Supabase la `service_role` que estuvo expuesta anteriormente.

## Supabase Edge Functions

Las funciones se versionan en:

```text
supabase/functions
```

Funciones actuales:

```text
supabase/functions/create-user-admin
supabase/functions/delete-user-admin
```

### create-user-admin

Responsabilidades:

- Crear usuario en Supabase Auth.
- Crear/actualizar registro en `profiles`.
- Crear membresia en `course_members` si corresponde.
- Permitir a admins crear usuarios administrativos.
- Permitir registro publico solo para `global_role = user`.

Variables requeridas en Supabase:

```text
PROJECT_URL
SERVICE_ROLE_KEY
```

### delete-user-admin

Responsabilidades:

- Validar que el caller autenticado sea `admin` o `super_admin` activo.
- Evitar que un admin se elimine a si mismo.
- Eliminar en cascada:
  - `course_members`
  - `profiles`
  - `auth.users`

### Deploy Functions

```bash
supabase functions deploy create-user-admin
supabase functions deploy delete-user-admin
```

Configurar secrets:

```bash
supabase secrets set PROJECT_URL="https://TU-PROYECTO.supabase.co"
supabase secrets set SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
```

## Rutas

```text
/login
/register
/forgot-password
/reset-password

/dashboard
/dashboard/home
/dashboard/admin/users
/dashboard/profile
/dashboard/schools
/dashboard/courses
/dashboard/categories
/dashboard/transactions
/dashboard/courses/:courseId/transactions
/dashboard/receipts
/dashboard/reports
```

Protecciones:

- `/dashboard` usa `authGuard`.
- Rutas administrativas usan `roleGuard`.
- `roleGuard` espera que termine la carga del perfil antes de decidir.

## Modulos

### Autenticacion

- Login.
- Registro tipo wizard.
- Forgot password.
- Reset password.
- Cambio de password desde perfil.

### Dashboard

- Layout principal.
- Home con widgets por rol.
- Sidebar/menu dinamico segun perfil y membresia.

### Usuarios Admin

- Listado paginado.
- Filtros.
- Crear usuario mediante `create-user-admin`.
- Editar datos y rol.
- Asignar usuario a colegio/curso.
- Bloquear roles unicos ya ocupados por curso.
- Eliminar usuario mediante `delete-user-admin`.

### Colegios

- CRUD.
- Activar/inactivar.
- Usado tambien en el flujo de registro.

### Cursos

- CRUD.
- Filtros y paginacion.
- Modal crear/editar/ver.
- Navegacion a transacciones contextuales.

### Categorias

- Categorias globales.
- Categorias por colegio.
- Acceso contextual para usuarios de curso.
- Admin crea categorias globales.

### Transacciones

Modo global:

```text
/dashboard/transactions
```

Modo contextual:

```text
/dashboard/courses/:courseId/transactions
```

Incluye:

- Widgets de saldo, ingresos, egresos y movimientos.
- Filtros.
- Soporte de comprobantes asociado a transacciones en avance.

### Comprobantes

Archivos principales:

```text
src/app/features/receipts/models/receipt.interface.ts
src/app/features/receipts/services/receipts.service.ts
```

Estado:

- Modelo creado.
- Servicio creado.
- Falta completar la UI y flujo final de gestion.

### Reportes

Estado:

- Ruta y pagina base creadas.
- Analitica real pendiente.

## Estructura Principal

```text
src/app
  auth
    guards
    pages
    services
  core
    services
  features
    admin/users
    categories
    courses
    dashboard
    profile
    receipts
    reports
    schools
    transactions
  shared
    components
    models
src/assets
  data
  icons
  scss
supabase
  config.toml
  functions
    create-user-admin
    delete-user-admin
```

## Base de Datos Esperada

Tablas principales:

- `profiles`
- `schools`
- `courses`
- `course_members`
- `categories`
- `transactions`
- `receipts`

Enums esperados:

- `global_role_enum`: `super_admin`, `admin`, `user`
- `course_role_enum`: `presidente`, `tesorero`, `secretario`, `apoderado`
- `category_type_enum`: `income`, `expense`
- `transaction_type_enum`: `income`, `expense`

## Convenciones

- Componentes standalone.
- Servicios por feature.
- Signals/computed donde ya existe ese patron.
- SCSS por componente y SCSS global en `src/assets/scss`.
- Usar Bootstrap Icons desde `node_modules/bootstrap-icons`.
- No agregar secretos al frontend.
- Revisar `git status` antes de modificar archivos.
- Separar commits por tipo de cambio.

## Pendientes Recomendados

1. Rotar la `service_role` en Supabase.
2. Desplegar `create-user-admin` y `delete-user-admin`.
3. Probar flujo real de registro publico.
4. Probar crear/borrar usuario desde panel admin.
5. Completar UI de comprobantes.
6. Completar reportes y analitica.
7. Reducir warnings de SCSS/component styles.
8. Apagar o centralizar logs `DEBUG = true` antes de produccion.

## Autor

Claudio (WEBMAIN)

- Chile
- Frontend / Angular
- https://webmain.cl
- https://github.com/maxuber79
