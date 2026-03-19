# WEBMAIN SASS Starter

> Base SCSS modular para proyectos front (WordPress, Angular, sitios estáticos).  
> Arquitectura 7-1, tokens de diseño, utilidades y helpers de debug.

[![Estado](https://img.shields.io/badge/status-en%20uso-4caf50)](#)
[![Sass](https://img.shields.io/badge/Sass-Dart%20Sass-cc6699.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Autor:** Claudio — WEBMAIN  
**Repo:** https://github.com/maxuber79/clean-project-sass

---

## 📦 Estructura

```
.
├─ abstracts/     # Variables, maps, mixins, funciones
├─ base/          # Reset/base, tipografía, helpers globales
├─ components/    # Botones, cards, modales, etc.
├─ helps/         # Debug RWD y utilidades de inspección
├─ layout/        # Grid, header, footer, contenedores
├─ pages/         # Estilos específicos por página/vista
├─ themes/        # Paletas temáticas (light/dark/brand)
├─ utilities/     # Clases utilitarias (.text--*, .bg--*, .fsx-*)
├─ vendors/       # CSS de terceros (normalize, plugins)
├─ main.scss      # Entry point (importa todo)
├─ main.css       # Build desarrollo
└─ main-dist.css  # Build producción (min)
```

> Convención: **7-1** (7 carpetas + 1 entrypoint). Prefijos sugeridos: `text--`, `bg--`, `border--`, `fsx-`, `debug-`.

---

## 🚀 Requisitos

- **Dart Sass** (recomendado) o **Prepros** si prefieres GUI.
- Node 18+ si usarás scripts `npm` (opcional).

### Instalación rápida con npm (opcional)
```bash
npm i -D sass
```

### Scripts sugeridos (`package.json`)
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

## 🔧 Utilidades

Colores:
```scss
// utilities/_colors.scss
@each $name, $value in $theme-colors {
  .text--#{$name}   { color: #{$value} !important; }
  .bg--#{$name}     { background-color: #{$value} !important; }
  .border--#{$name} { border-color: #{$value} !important; }
  .text--hover-#{$name}:hover { color: #{$value}; }
}
```

Tamaños:
```scss
// utilities/_font-sizes.scss
$font-sizes: (80: 5rem, 75: 4.688rem, 40: 2.5rem, 19: 1.188rem, 16: 1rem);
@each $k, $v in $font-sizes {
  .fsx-#{$k} { font-size: $v; line-height: 100%; }
}
```

---

## 🧪 Debug RWD

`helps/_debug.scss` incluye HUD responsivo (toggle `$debug-rwd-enabled`).

Uso:
```html
<section class="debug-rwd">Bloque a inspeccionar</section>
```

---

## 🏗️ Flujo

1. Ajusta tokens en `abstracts/` (colores, tipografías, spacing).
2. Activa/desactiva módulos en `main.scss`.
3. Compila:
   - Dev: `npm run dev` (o Prepros watch).
   - Prod: `npm run build`.
4. Integra en tu proyecto (WP, Angular o estático).

---

## 📄 `main.scss` (ejemplo de imports)

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
@use 'components/buttons';
@use 'helps/debug';
@use 'themes/light';
```

---

## 🐛 Troubleshooting

- **“Expected identifier” en utilidades de color**  
  Revisa llaves del mapa (`accent`, no `"accent:"`) y que el mapa exista **antes** del `@each`.

- **Prepros no compila**  
  Verifica rutas de entrada/salida y errores de sintaxis (falta `;` o `}`).

- **CSS muy grande**  
  Desactiva módulos no usados desde `main.scss`.

---

## 📝 Changelog

Ver `CHANGELOG.md`. Si usas releases y tags, agrega enlaces de comparación:

```
[Unreleased]: https://github.com/USUARIO/REPO/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/USUARIO/REPO/releases/tag/v1.0.0
```

---

## 📜 Licencia

MIT © Claudio — WEBMAIN
