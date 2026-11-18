# v3.9.15 — Fluidez al abrir la app
- La pantalla de bienvenida (splash) antes esperaba 1800 ms fijos antes de mostrar el PIN; ahora 1100 ms (`SPLASH_MS` en `js/modules/21-config-acciones-seguridad.js`; poner 1800 para volver al valor anterior). No se quitó ni cambió ninguna función.
- Revisión sin cambios necesarios: los 6 archivos de `js/libs/` se usan; los iconos PNG ya están optimizados; el CSS en línea de `index.html` (facturas) no está duplicado en el bundle; las caches y el service worker están bien configurados.
