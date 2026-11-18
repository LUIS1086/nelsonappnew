# v3.9.14 — Orden del proyecto y chequeo anti-fallos
- **Archivos:** los 25 `CAMBIOS-*.md` pasan a `docs/cambios/`; auditorías, informes y guías a `docs/`; el PDF del README a `docs/README-Todo-Repuestos-Nelson.pdf`. La raíz queda solo con lo que la app necesita.
- **CSS:** se eliminaron de `css/` `23-premium-polish.css` y `dashboard-refresh.css` (ya estaban archivadas en `docs/css-archivados/` y no entraban en los bundles). `24-ios-dash.css` se renombra `dashboard-ios.css` (había dos hojas `24-`); bundles regenerados.
- **Nuevo chequeo `tools/verificar.js`:**
  1. Los `onclick/oninput/onchange` del HTML deben llamar a funciones que existan.
  2. `tools/lint-globales.js` (ESLint `no-undef`) detecta funciones/variables usadas pero no definidas. Con el `dashboard.js` roto de v3.9.12 marca 37 errores. Requiere `cd tools/lint && npm install` una vez; si no está instalado, se omite con un aviso.
- README actualizado (estructura real, flujo de publicación).
