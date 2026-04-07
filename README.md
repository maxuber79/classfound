<div align="center">

<!-- Reemplazar por isotipo real cuando esté listo -->
<img src="https://placehold.co/100x100/4f46e5/ffffff?text=CF&font=montserrat" width="100" height="100" alt="Classfund Logo"/>

# 📚 Classfund

### Sistema de administración de fondos de curso escolar

[![Angular](https://img.shields.io/badge/Angular-Latest-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%7C%20Auth%20%7C%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-8511FA?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-181717?logo=github)](https://maxuber79.github.io/classfund/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

💡 Plataforma web para gestión de ingresos y egresos de cursos escolares,  
con vistas globales para administradores y vistas contextuales por curso.  
Orientada al mercado latinoamericano, comenzando por Chile 🇨🇱

🔗 **Próximamente en producción:**  
👉 [classfund.cl](https://classfund.cl) · [classfund.app](https://classfund.app)

</div>

---

## 🧱 Tecnologías principales

| Módulo                       | Descripción                                          |
| ---------------------------- | ---------------------------------------------------- |
| **Angular** (última versión) | Framework principal, standalone components + signals |
| **Supabase**                 | PostgreSQL + Auth + Storage + RLS                    |
| **Bootstrap 5**              | Estilos responsivos y componentes UI                 |
| **SCSS propio**              | Sistema de diseño BEM + mixin `card-variant`         |
| **GitHub Pages**             | Hosting frontend (staging / pruebas)                 |
| **webmain.cl**               | Hosting frontend (producción futura)                 |

---

## 🎨 Diseño y theming

- Tipografía: **Plus Jakarta Sans**
- Theming vía **CSS custom properties**
- Dark mode con `[data-theme="dark"]`

---

## 🚀 Deploy

### GitHub Pages (staging)

```bash
# Build para GitHub Pages
ng build --configuration=production --base-href /classfund/

# Push y el workflow hace el resto
git push origin main
```

### Producción futura

- Frontend → [webmain.cl](https://webmain.cl) / [classfund.cl](https://classfund.cl)
- Backend → Supabase Cloud

---

## ⚒️ Scripts útiles

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
ng serve

# Build producción
ng build --configuration=production

# Generar componente
ng generate component nombre-componente
```

Luego abre [http://localhost:4200](http://localhost:4200)

---

## 📂 Estructura del proyecto

```
src/
 ├── app/
 │   ├── admin/              # Módulo usuarios (admin global)
 │   ├── auth/               # Login, register, forgot/reset password
 │   ├── categories/         # Módulo categorías
 │   ├── courses/            # Módulo cursos
 │   ├── dashboard/          # Layout y shell del dashboard
 │   ├── profile/            # Perfil del usuario autenticado
 │   ├── schools/            # Módulo colegios
 │   ├── transactions/       # Módulo transacciones (global + contextual)
 │   ├── shared/             # Componentes y pipes reutilizables
 │   └── app.routes.ts       # Rutas principales
 ├── environments/           # Variables de entorno
 └── index.html
```

---

## 🗺 Estructura de rutas

```
/login
/register
/forgot-password
/reset-password

/dashboard                                        ← protegido por authGuard
  /dashboard/admin/users
  /dashboard/profile
  /dashboard/schools
  /dashboard/courses
  /dashboard/categories
  /dashboard/transactions                         ← modo global
  /dashboard/courses/:courseId/transactions       ← modo contextual
```

---

## 🗄 Base de datos (Supabase)

### `profiles` — vinculada a `auth.users.id`

| Campo                            | Tipo             |
| -------------------------------- | ---------------- |
| id                               | uuid PK          |
| full_name, first_name, last_name | text             |
| email, phone, avatar_url         | text             |
| global_role                      | global_role_enum |
| is_active                        | bool             |
| created_at, updated_at           | timestamp        |

### `schools`

| Campo                  | Tipo      |
| ---------------------- | --------- |
| id                     | uuid PK   |
| name, commune, region  | text      |
| is_active              | bool      |
| created_at, updated_at | timestamp |

### `courses`

| Campo                  | Tipo              |
| ---------------------- | ----------------- |
| id                     | uuid PK           |
| school_id              | uuid FK → schools |
| name, level, section   | text              |
| school_year            | int4              |
| is_active              | bool              |
| created_at, updated_at | timestamp         |

### `course_members`

| Campo                  | Tipo               |
| ---------------------- | ------------------ |
| id                     | uuid PK            |
| course_id              | uuid FK → courses  |
| user_id                | uuid FK → profiles |
| role                   | course_role_enum   |
| is_active              | bool               |
| created_at, updated_at | timestamp          |

### `categories`

| Campo                  | Tipo                                  |
| ---------------------- | ------------------------------------- |
| id                     | uuid PK                               |
| name                   | text                                  |
| type                   | category_type_enum (income / expense) |
| is_active              | bool                                  |
| created_at, updated_at | timestamp                             |

> ⚠️ Pendiente: `school_id` nullable para categorías por colegio

### `transactions`

| Campo                  | Tipo                  |
| ---------------------- | --------------------- |
| id                     | uuid PK               |
| course_id              | uuid FK → courses     |
| category_id            | uuid FK → categories  |
| type                   | transaction_type_enum |
| amount                 | numeric               |
| description, notes     | text                  |
| transaction_date       | date                  |
| created_by, updated_by | uuid FK → profiles    |
| created_at, updated_at | timestamp             |

### `receipts`

| Campo                | Tipo                   |
| -------------------- | ---------------------- |
| id                   | uuid PK                |
| transaction_id       | uuid FK → transactions |
| file_path, file_name | text                   |
| mime_type            | text                   |
| file_size            | int4                   |
| uploaded_by          | uuid FK → profiles     |
| created_at           | timestamp              |

---

## 🔐 Variables de entorno

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: "TU_SUPABASE_URL",
  supabaseKey: "TU_SUPABASE_ANON_KEY",
};
```

---

## 📦 Módulos y estado actual

| Módulo                                        | Estado       |
| --------------------------------------------- | ------------ |
| Autenticación (login, register, forgot/reset) | ✅ Funcional |
| Usuarios (admin)                              | ✅ Funcional |
| Perfil                                        | ✅ Funcional |
| Colegios                                      | ✅ Funcional |
| Cursos (CRUD + navegación a transacciones)    | ✅ Funcional |
| Transacciones global                          | ✅ Funcional |
| Transacciones contextual por curso            | ✅ Funcional |
| Categorías (global)                           | ✅ Funcional |
| Categorías por colegio                        | ⏳ Pendiente |
| Roles reales en frontend                      | ⏳ Pendiente |
| Comprobantes (receipts)                       | ⏳ Pendiente |
| Reportes y analítica                          | ⏳ Pendiente |

---

## 🗺 Fases pendientes

| Fase       | Descripción                                                    |
| ---------- | -------------------------------------------------------------- |
| **Fase 1** | Categorías por colegio (`school_id` nullable en `categories`)  |
| **Fase 2** | Roles reales en frontend (`global_role`, guards, menú por rol) |
| **Fase 3** | Widgets y dashboard admin global definitivos                   |
| **Fase 4** | Comprobantes: módulo visual + subida de archivos               |
| **Fase 5** | Reportes y analítica                                           |

---

## 🧠 Convenciones de código

- **JSDoc** en todas las funciones y métodos
- **Variable global `DEBUG`** para controlar `console.log`

```ts
const DEBUG = true; // false en producción

function ejemplo() {
  if (DEBUG) console.log("[NombreComponente][ejemplo] iniciando...");
  // lógica
}
```

- SCSS con metodología **BEM** y mixin `card-variant`
- Componentes **standalone** con **signals** y **computed()**
- Un servicio por módulo

---

## ✍️ Forma de trabajo

1. Antes de codear → presentar resumen claro de lo que se va a hacer
2. No avanzar hasta que la tarea esté **terminada, sin errores y con commit guardado**
3. Primero **TypeScript**, luego **HTML**
4. Avanzar **paso a paso** validando cada etapa

---

## 🧑‍💻 Autor

**Claudio (WEBMAIN)**  
📍 Chile  
💼 Desarrollador Frontend  
🌐 [webmain.cl](https://webmain.cl)  
🐙 [github.com/maxuber79](https://github.com/maxuber79)

---

<div align="center">
  <br>
  <img src="https://angular.io/assets/images/logos/angular/angular.svg" width="70" alt="Angular">
  &nbsp;&nbsp;&nbsp;
  <img src="https://supabase.com/favicon/favicon-196x196.png" width="70" alt="Supabase">
  &nbsp;&nbsp;&nbsp;
  <img src="https://getbootstrap.com/docs/5.3/assets/brand/bootstrap-logo-shadow.png" width="70" alt="Bootstrap">
  <br><br>
  <b>✨ Classfund — Hecho con Angular, Supabase y mucha cafeína ☕</b>
</div>

```
tesoreria-cursos-app
├─ .angular
├─ .editorconfig
├─ angular.json
├─ CLAUDE.md
├─ package-lock.json
├─ package.json
├─ public
│  └─ favicon.ico
├─ README.md
├─ src
│  ├─ app
│  │  ├─ app.config.ts
│  │  ├─ app.html
│  │  ├─ app.routes.ts
│  │  ├─ app.scss
│  │  ├─ app.spec.ts
│  │  ├─ app.ts
│  │  ├─ auth
│  │  │  ├─ guards
│  │  │  │  ├─ auth.guard.ts
│  │  │  │  ├─ login.guard.ts
│  │  │  │  └─ role.guard.ts
│  │  │  ├─ models
│  │  │  ├─ pages
│  │  │  │  ├─ forgot-password
│  │  │  │  │  ├─ forgot-password.html
│  │  │  │  │  ├─ forgot-password.scss
│  │  │  │  │  └─ forgot-password.ts
│  │  │  │  ├─ login
│  │  │  │  │  ├─ login.html
│  │  │  │  │  ├─ login.scss
│  │  │  │  │  └─ login.ts
│  │  │  │  ├─ register
│  │  │  │  │  ├─ register.html
│  │  │  │  │  ├─ register.scss
│  │  │  │  │  └─ register.ts
│  │  │  │  └─ reset-password
│  │  │  │     ├─ reset-password.html
│  │  │  │     ├─ reset-password.scss
│  │  │  │     └─ reset-password.ts
│  │  │  └─ services
│  │  │     └─ auth.service.ts
│  │  ├─ core
│  │  │  └─ services
│  │  │     ├─ location.service.ts
│  │  │     ├─ supabase.service.ts
│  │  │     └─ toast.service.ts
│  │  ├─ features
│  │  │  ├─ admin
│  │  │  │  └─ users
│  │  │  │     ├─ components
│  │  │  │     ├─ models
│  │  │  │     │  ├─ admin-user.interface.ts
│  │  │  │     │  └─ create-admin-user-payload.interface.ts
│  │  │  │     ├─ pages
│  │  │  │     │  └─ users-page
│  │  │  │     │     ├─ users-page.html
│  │  │  │     │     ├─ users-page.scss
│  │  │  │     │     └─ users-page.ts
│  │  │  │     └─ services
│  │  │  │        └─ admin-users.service.ts
│  │  │  ├─ categories
│  │  │  │  ├─ components
│  │  │  │  ├─ models
│  │  │  │  │  └─ category.interface.ts
│  │  │  │  ├─ pages
│  │  │  │  │  └─ categories-page
│  │  │  │  │     ├─ categories-page.html
│  │  │  │  │     ├─ categories-page.scss
│  │  │  │  │     └─ categories-page.ts
│  │  │  │  └─ services
│  │  │  │     └─ categories.service.ts
│  │  │  ├─ courses
│  │  │  │  ├─ models
│  │  │  │  │  └─ course.interface.ts
│  │  │  │  ├─ pages
│  │  │  │  │  └─ course-page
│  │  │  │  │     ├─ course.html
│  │  │  │  │     ├─ course.scss
│  │  │  │  │     └─ course.ts
│  │  │  │  └─ services
│  │  │  │     └─ course.service.ts
│  │  │  ├─ dashboard
│  │  │  │  ├─ components
│  │  │  │  ├─ pages
│  │  │  │  │  ├─ dashboard
│  │  │  │  │  │  ├─ dashboard.html
│  │  │  │  │  │  ├─ dashboard.scss
│  │  │  │  │  │  └─ dashboard.ts
│  │  │  │  │  └─ dashboard-home
│  │  │  │  │     ├─ dashboard-home.html
│  │  │  │  │     ├─ dashboard-home.scss
│  │  │  │  │     └─ dashboard-home.ts
│  │  │  │  └─ services
│  │  │  │     └─ profile.service.ts
│  │  │  ├─ members
│  │  │  │  ├─ components
│  │  │  │  ├─ models
│  │  │  │  ├─ pages
│  │  │  │  └─ services
│  │  │  ├─ profile
│  │  │  │  ├─ models
│  │  │  │  │  └─ profile.interface.ts
│  │  │  │  ├─ pages
│  │  │  │  │  └─ profile-page
│  │  │  │  │     ├─ profile-page.html
│  │  │  │  │     ├─ profile-page.scss
│  │  │  │  │     └─ profile-page.ts
│  │  │  │  └─ services
│  │  │  │     └─ profile.service.ts
│  │  │  ├─ schools
│  │  │  │  ├─ components
│  │  │  │  ├─ models
│  │  │  │  │  └─ school.interface.ts
│  │  │  │  ├─ pages
│  │  │  │  │  └─ schools
│  │  │  │  │     ├─ schools.html
│  │  │  │  │     ├─ schools.scss
│  │  │  │  │     └─ schools.ts
│  │  │  │  └─ services
│  │  │  │     └─ school.service.ts
│  │  │  └─ transactions
│  │  │     ├─ components
│  │  │     ├─ models
│  │  │     │  ├─ cursos.interface.ts
│  │  │     │  └─ transaction.interface.ts
│  │  │     ├─ pages
│  │  │     │  └─ transactions
│  │  │     │     ├─ transactions.html
│  │  │     │     ├─ transactions.scss
│  │  │     │     └─ transactions.ts
│  │  │     └─ services
│  │  │        └─ transactions.service.ts
│  │  ├─ layout
│  │  │  ├─ navbar
│  │  │  ├─ shell
│  │  │  └─ sidebar
│  │  └─ shared
│  │     ├─ components
│  │     │  └─ toast
│  │     │     ├─ toast.html
│  │     │     ├─ toast.scss
│  │     │     └─ toast.ts
│  │     ├─ models
│  │     │  ├─ course-member.interface.ts
│  │     │  ├─ course.interface.ts
│  │     │  ├─ profile.interface.ts
│  │     │  └─ school.interface.ts
│  │     └─ utils
│  ├─ assets
│  │  ├─ data
│  │  │  └─ comunas-chile.json
│  │  ├─ fonts
│  │  ├─ icons
│  │  │  ├─ Ahorro.svg
│  │  │  ├─ Boleta.svg
│  │  │  ├─ Configuración.svg
│  │  │  ├─ Curso.svg
│  │  │  ├─ Dashboard.svg
│  │  │  ├─ Notificaciones.svg
│  │  │  ├─ Transacciones.svg
│  │  │  ├─ Usuarios.svg
│  │  │  └─ Wallet.svg
│  │  ├─ images
│  │  └─ scss
│  │     ├─ abstracts
│  │     │  ├─ _color.scss
│  │     │  ├─ _functions.scss
│  │     │  ├─ _index.scss
│  │     │  ├─ _mixins.scss
│  │     │  ├─ _placeholders.scss
│  │     │  └─ _variables.scss
│  │     ├─ bakup
│  │     │  ├─ CHANGELOG.md
│  │     │  └─ README.md
│  │     ├─ base
│  │     │  ├─ _font-google.scss
│  │     │  ├─ _global.scss
│  │     │  ├─ _icons.scss
│  │     │  ├─ _index.scss
│  │     │  ├─ _reset.scss
│  │     │  └─ _typography.scss
│  │     ├─ CHANGELOG.md
│  │     ├─ components
│  │     │  ├─ _badge.scss
│  │     │  ├─ _button.scss
│  │     │  ├─ _callout.scss
│  │     │  ├─ _card.scss
│  │     │  ├─ _form.scss
│  │     │  ├─ _index.scss
│  │     │  └─ _tables.scss
│  │     ├─ editorconfig
│  │     ├─ gitignore
│  │     ├─ helps
│  │     │  ├─ _debug.scss
│  │     │  ├─ _help.scss
│  │     │  ├─ _helps_querys.scss
│  │     │  ├─ _index.scss
│  │     │  └─ _whith.scss
│  │     ├─ layout
│  │     │  ├─ _footer.scss
│  │     │  ├─ _header.scss
│  │     │  └─ _index.scss
│  │     ├─ LICENSE
│  │     ├─ main-dist.css
│  │     ├─ main-respaldo.scss
│  │     ├─ main.css
│  │     ├─ main.scss
│  │     ├─ package.json
│  │     ├─ pages
│  │     │  ├─ _about.scss
│  │     │  ├─ _home.scss
│  │     │  └─ _index.scss
│  │     ├─ prepros.config
│  │     ├─ README.md
│  │     ├─ themes
│  │     │  └─ _index.scss
│  │     ├─ utilities
│  │     │  ├─ _bgx-color.scss
│  │     │  ├─ _index.scss
│  │     │  └─ _stretch-card.scss
│  │     └─ vendors
│  │        └─ _index.scss
│  ├─ environments
│  │  └─ environment.ts
│  ├─ index.html
│  ├─ main.ts
│  └─ styles.scss
├─ supabase
│  ├─ .temp
│  │  ├─ cli-latest
│  │  ├─ gotrue-version
│  │  ├─ pooler-url
│  │  ├─ postgres-version
│  │  ├─ project-ref
│  │  ├─ rest-version
│  │  ├─ storage-migration
│  │  └─ storage-version
│  ├─ config.toml
│  └─ functions
│     └─ create-user-admin
│        ├─ .npmrc
│        ├─ deno.json
│        └─ index.ts
├─ tsconfig.app.json
├─ tsconfig.json
└─ tsconfig.spec.json

```