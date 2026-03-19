# WEBMAIN SCSS Starter

> Base **SCSS modular y escalable** para proyectos front-end (WordPress, Angular, sitios estáticos).  
> Arquitectura 7-1, tokens de diseño, utilidades y helpers de debug.  

[![Estado](https://img.shields.io/badge/status-en%20uso-4caf50)](#)
[![Sass](https://img.shields.io/badge/Sass-Dart%20Sass-cc6699.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Autor:** Claudio — WEBMAIN  
**Repo:** [github.com/maxuber79/clean-project-sass](https://github.com/maxuber79/clean-project-sass)

---

## 📦 Estructura

```
.
├─ abstracts/     # Variables, maps, mixins, funciones
├─ base/          # Reset/base, tipografía, helpers globales
├─ components/    # Botones, badges, cards, etc. (.wm-*)
├─ helps/         # Debug RWD y utilidades de inspección
├─ layout/        # Grid, header, footer, contenedores
├─ pages/         # Estilos por página o vista
├─ themes/        # Paletas temáticas (light/dark/brand)
├─ utilities/     # Clases utilitarias (.text--*, .bg--*, .fsx-*)
├─ vendors/       # CSS de terceros (normalize, plugins)
├─ main.scss      # Entry point (importa todo)
├─ main.css       # Build desarrollo
└─ main-dist.css  # Build producción (min)
```

> Convención: **7-1**.  
> Prefijo oficial del sistema: **`wm-`** (ej: `.wm-btn--filled-primary`, `.wm-badge--outline-success`).

---

## 🚀 Requisitos

- **Dart Sass** (recomendado) o **Prepros** si prefieres GUI.  
- **Node 18+** si usarás scripts `npm`.

### Instalación rápida
```bash
npm i -D sass
```

### Scripts (`package.json`)
```json
{
  "scripts": {
    "dev": "sass --watch main.scss:main.css --style=expanded",
    "build": "sass main.scss:main-dist.css --style=compressed --no-source-map"
  }
}
```

> Con **Prepros**, apunta `main.scss → main.css` (dev) y `main-dist.css` (prod).

---

## 🧩 Tokens (abstracts)

Define o sobreescribe tu paleta en `abstracts/_colors.scss`:

```scss
$primary: #0d6efd;
$secondary: #6c757d;
$accent: #ef476f;
$success: #198754;
$danger:  #dc3545;
$warning: #ffc107;
$info:    #0dcaf0;
$white:   #ffffff;
$getstarted: #222222;

$theme-colors: (
  primary:   $primary,
  secondary: $secondary,
  accent:    $accent,
  success:   $success,
  danger:    $danger,
  warning:   $warning,
  info:      $info,
  white:     $white,
  getstarted:$getstarted
) !default;
```

---

## 🔘 Componentes base

### Buttons (`components/_button.scss`)
```scss
.wm-btn--filled-primary { background: $primary; color: $white; }
.wm-btn--outline-accent { border-color: $accent; color: $accent; }

body.dark-mode .wm-btn--filled-primary {
  background: lighten($primary, 10%);
}
```

### Badges (`components/_badge.scss`)
```scss
.wm-badge--filled-success  { background: $success; color: $white; }
.wm-badge--outline-danger  { border: 1px solid $danger; color: $danger; }
```

### Cards (`components/_card.scss`)
```scss
.wm-card--filled-primary { background: $primary; color: $white; }
.wm-card--outline-info   { border: 1px solid $info; }
```

> Todos los componentes soportan **modo oscuro** mediante `body.dark-mode`.

---

## 🧪 Utilidades y helpers

### Colores
```scss
@each $name, $value in $theme-colors {
  .text--#{$name}   { color: #{$value} !important; }
  .bg--#{$name}     { background-color: #{$value} !important; }
  .border--#{$name} { border-color: #{$value} !important; }
}
```

### Tipografías y tamaños
```scss
$font-sizes: (80: 5rem, 40: 2.5rem, 19: 1.188rem);
@each $k, $v in $font-sizes {
  .fsx-#{$k} { font-size: $v; line-height: 100%; }
}
```

### Debug RWD
```scss
// helps/_debug.scss
$debug-rwd-enabled: true;
.debug-rwd { outline: 1px dashed #ff5c00; }
```

---

## 🧱 Flujo de trabajo

1. Ajusta tokens y mapas en `abstracts/`.
2. Activa módulos en `main.scss`.
3. Compila con `npm run dev` o Prepros.
4. Usa `.wm-*` para evitar conflictos con frameworks externos.
5. Integra en WordPress, Angular o sitio estático.

---

## 🧰 Import central (`main.scss`)

```scss
/* main.scss */
@use 'vendors/normalize';
@use 'abstracts/colors';
@use 'abstracts/mixins';
@use 'base/reset';
@use 'base/typography';
@use 'utilities/font-sizes';
@use 'utilities/colors';
@use 'layout/grid';
@use 'components/button';
@use 'components/badge';
@use 'components/card';
@use 'helps/debug';
@use 'themes/light';
```

---

## 🧠 Troubleshooting

- **Conflicto con Bootstrap:**  
  Usa clases `wm-` para aislar tu sistema (`.wm-btn--filled-*` en vez de `.btn`).

- **Error en `@each`**  
  Verifica que `$theme-colors` esté declarado antes del loop.

- **No compila en Prepros**  
  Revisa rutas y que no falten llaves o `;`.

---

## 📝 Changelog

Ver [`CHANGELOG.md`](CHANGELOG.md).  
Usa tags y releases para versionar (`v1.0.0`, `v1.1.0`, etc.).

---

## 📜 Licencia

MIT © Claudio — WEBMAIN
