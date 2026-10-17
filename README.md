# Nelson App Pro · Todo Repuestos Nelson

PWA de gestión para taller de reparación de electrodomésticos pequeños y venta de repuestos
(órdenes, inventario, ventas, gastos, clientes, pagos y reportes). Proyecto propio con fines
educativos y de venta.

**Stack:** JavaScript vanilla · Tailwind (compilado, sin CDN) · IndexedDB (`NelsonAppPro`) · Gemini (Nelson IA) ·
Google Drive (respaldo) · PWA/TWA (PWABuilder) · Vercel.

## Estructura

```
index.html              Solo estructura HTML (carga css/ y js/ en orden)
dashboard.html          Panel de indicadores (solo estructura)
css/dashboard.css       Estilos base del panel
css/dashboard-premium.css  Capa premium del panel (quita su <link> para volver al diseño anterior)
js/dashboard.js         Lógica del panel
js/libs/              html2canvas y qrcode locales (funcionan sin internet)
service-worker.js       Offline + actualización (CACHE_VERSION)
manifest.json           Manifiesto PWA
vercel.json             Cabeceras y caché
icons/                  Iconos de la app
css/01…16-*.css         Estilos propios, en el orden de la cascada
css/tailwind.css        Tailwind compilado (generado; no editar a mano)
js/core/01…03-*.js      Base: errores globales, IndexedDB, PIN y biometría
js/modules/00…37-*.js   Módulos de la app (órdenes, inventario, caja, Drive, QR, etc.)
js/nelson-ia.js         Asistente Nelson IA
tools/verificar.js      Revisa que no falte nada antes de subir
tools/tailwind/         Configuración para recompilar css/tailwind.css
.well-known/            assetlinks.json (TWA / Android)
```

> **El orden importa.** Son scripts clásicos (no ES Modules) para conservar las funciones
> globales y los `onclick` inline. Se cargan en el orden en que aparecen en `index.html`.

## Antes de subir cambios

```bash
node tools/verificar.js
```

## Tailwind (compilado)

`css/tailwind.css` se genera a partir de las clases que aparecen escritas en `index.html` y `js/**`.
**Si agregas o cambias clases de Tailwind, recompila:**

```bash
cd tools/tailwind
npm install        # solo la primera vez
npm run build
```

Luego sube el `css/tailwind.css` nuevo junto con tus cambios. Las clases armadas con variables
(p. ej. `text-${color}-400`) no se detectan: agrégalas a `safelist` en `tools/tailwind/tailwind.config.js`.

## Cómo agregar un archivo nuevo

1. Crea el archivo en `css/` o `js/modules/` con el siguiente número.
2. Agrega su `<link>` / `<script>` en `index.html`, en la posición correcta.
3. Agrégalo a `PRECACHE_URLS` en `service-worker.js`.
4. Sube `CACHE_VERSION` en `service-worker.js` (los usuarios verán el aviso "Nueva versión disponible").
5. Ejecuta `node tools/verificar.js`.

## Despliegue

Vercel (sitio estático, sin build). Para el APK: PWABuilder con la URL de Vercel.

## Seguridad

- **PIN:** PBKDF2-SHA256 (150.000 iteraciones) con sal aleatoria. Los PIN guardados con el formato antiguo se migran solos al primer desbloqueo.
- **Bloqueo por intentos:** 5 por defecto, persistente (recargar no lo salta) y progresivo: 30 s, 1, 2, 4… hasta 15 min.
- **CSP y Permissions-Policy:** definidas en `vercel.json`. Si añades un servicio externo, agrega su dominio a `connect-src` (o `script-src`/`img-src`) o el navegador lo bloqueará.
- **Llave de Gemini:** viaja en la cabecera `x-goog-api-key`, no en la URL. `tools/verificar.js` falla si vuelve a aparecer en la URL.
- **Texto libre en `innerHTML`:** usa siempre `escapeHtml(String(valor ?? ''))`.

## Sensación de app nativa

- `css/18-native-premium.css`: capa visual (cabecera compacta, barra inferior flotante, ventanas como hoja inferior, botones con respuesta al toque, campos legibles). Quita su `<link>` para volver al diseño anterior.
- `js/modules/38-native-feel.js`: vibración sutil (Android; se apaga con `localStorage.hapticsOff = '1'`), transición entre pestañas, barra inferior que se esconde con el teclado, botón flotante "Nueva recepción" (solo en Órdenes) y cerrar ventanas deslizando hacia abajo.
- Las librerías externas viven en `js/libs/` (en minúscula, para que Vercel las encuentre).

## Escritorio (≥768 px)

- `css/19-desktop-premium.css`: solo afecta a escritorio/tablet; el móvil queda igual. Quita su `<link>` para volver al diseño anterior.
- La barra superior ya no queda debajo del menú lateral (usa la variable `--sb-w`, el ancho del menú). Por debajo de 1440 px se ocultan sus 4 indicadores para que quepan los botones.
- Rejillas alineadas (Taller y Caja), accesos rápidos de Órdenes compactos y Datos en dos columnas con el menú en cuadrícula.
- Si cambias el ancho del menú lateral en `11-responsive-escritorio.css`, actualiza también `--sb-w` en el archivo 19.

## Librerías externas

Todas viven en `js/libs/` (jsPDF, autoTable, SheetJS, Chart.js, html2canvas, qrcode). **No cargues scripts desde un CDN**: la CSP de `vercel.json` los bloquea y la exportación a PDF/Excel dejaría de funcionar. `tools/verificar.js` avisa si alguien lo intenta.



## Preparación Supabase (seguimiento de reparaciones)

Se añadió una preparación aislada en `supabase/` para diseñar el seguimiento privado de reparaciones. No se activa en la app ni modifica IndexedDB. Lee `supabase/README.md` antes de desplegar la migración o la Edge Function.
