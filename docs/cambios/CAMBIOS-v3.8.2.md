# v3.8.2 — capa CSS ordenada + guía PDF profesional

Base: el zip `nelsonappnew-main` (v3.8.0). Verificado con Chromium a 390×844 y 1280×900 (22 pantallas).

## Defectos que había y ya no están
- **Iconos gigantes y negros** (menú lateral, botón Dashboard, etiquetas del formulario). `js/modules/42-ios-iconos.js`
  inyecta SVG con las clases `.ios-ic`, `.ios-tile` e `.ios-ic-inline`, pero ninguna hoja las definía. → nueva `css/26-iconos-svg.css`.
- **Panel de hoy** y tarjetas de Caja sin estilo: `css/25-visual-refresh.css` existía pero no estaba enlazada. → ahora va en el bundle.
- **Micrófono encima del texto** de los campos del formulario. → `css/27-correcciones.css`.
- **Guía imprimible (PDF)** con letras raras: eran emojis y flechas que la fuente del PDF no dibuja. Rediseñada en 2 hojas A4.

## Cómo está ahora la capa CSS
- `index.html` enlaza **1** archivo (`css/app.bundle.css`) en vez de 24; `dashboard.html`, `css/dashboard.bundle.css` en vez de 3.
- Los bundles se generan con `node tools/build-css.js` (mismo orden de cascada, sin comentarios ni espacios: 280 KB → 205 KB).
  **Tras editar cualquier `css/NN-*.css`, corre ese comando.** `node tools/verificar.js` avisa si se te olvida.
- Comprobado píxel a píxel: el bundle se ve idéntico a las hojas sueltas.
- El precache del service worker lista solo los 2 bundles.

## Accesibilidad y legibilidad (medido con auditoría automática en Chromium)
- Gris de etiquetas del index (`--nn-faint`) de 3.1:1 a ~5:1; insignia "IA" con texto oscuro (antes 2.5:1).
- Dashboard: grises, naranja y verde del modo claro y oscuro subidos a ≥ 4.5:1; botón "Nueva orden" con texto oscuro en modo oscuro.
- Áreas táctiles más grandes (↻ del Panel de hoy, chips de Nelson IA, 7d/30d/90d en pantallas táctiles).
- 3 campos de fecha sin nombre accesible → ahora con `aria-label`/`for`.
- Anillo de foco visible al navegar con teclado.
- Queda a propósito: texto blanco sobre el naranja de marca del botón "Registrar entrada" (2.8:1), porque el acento lo elige el usuario en Apariencia; se le añadió una sombra suave.
- `seguimiento.html` (página del cliente) ya cumplía: 0 problemas.

## Herramientas nuevas
- `tools/build-css.js` y `tools/capturas.py` (ver README).

## Limpieza
- `css/23-premium-polish.css` y `css/dashboard-refresh.css` no se cargaban en ninguna página → movidos a `docs/css-archivados/`.
  (`dashboard-refresh.css` está hecha para otro marcado del dashboard y hacía desaparecer el reloj; por eso no se enlaza.)
- Borrado `jspdf.umd.min.js` de la raíz: duplicado sin uso (la app usa `js/libs/jspdf.umd.min.js`).

## Pendiente (no se tocó a propósito)
- ~930 `!important` y ~565 `style=""` en `index.html`: son la causa de que las hojas se pisen entre sí. Quitarlos exige mover
  los estilos en línea a clases, pantalla por pantalla.
