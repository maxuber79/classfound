# Changelog
Todos los cambios notables a este proyecto se documentarán aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y este proyecto adhiere a [SemVer](https://semver.org/lang/es/).

---

## [1.1.0] - 2025-10-10
### Added
- Prefijo global `wm-` para evitar conflictos con frameworks externos (Bootstrap, etc.).
- Nuevas versiones de componentes base:
  - `wm-badge--filled-*` y `wm-badge--outline-*`
  - `wm-btn--filled-*` y `wm-btn--outline-*`
  - `wm-card--filled-*` y `wm-card--outline-*`
- Soporte para **modo oscuro (`body.dark-mode`)** en todos los componentes.
- Documentación ampliada en `README.md` con ejemplos y estructura Webmain v2.

### Changed
- Refactor completo del código SCSS de componentes para cumplir con convención **BEM + namespace Webmain**.
- Separación lógica de mixins y mapas en `abstracts/`.
- Estilos más consistentes entre `filled` y `outline`.

### Fixed
- Eliminados conflictos de nombres con clases de Bootstrap (`.btn`, `.badge`, `.card`).
- Corrección de sombras y colores en modo oscuro.

---

## [1.0.0] - 2025-10-08
### Added
- Primera versión estable del starter SCSS.
- Arquitectura 7-1 y estructura modular de carpetas.
- Tokens de color y utilidades `.text--*`, `.bg--*`, `.border--*`.
- Sistema de tamaños `.fsx-*`.
- Debug RWD (`.debug-rwd`) con badge de rango.

---

## [Unreleased]
### Added
- Espacio reservado para próximos cambios (v1.2.0).

[Unreleased]: https://github.com/USUARIO/REPO/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/USUARIO/REPO/releases/tag/v1.1.0
[1.0.0]: https://github.com/USUARIO/REPO/releases/tag/v1.0.0
