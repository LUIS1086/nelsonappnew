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
css/app.bundle.css      GENERADO: todas las hojas del index unidas (es lo único que enlaza index.html)
css/dashboard.bundle.css  GENERADO: hojas del dashboard unidas (lo único que enlaza dashboard.html)
css/dashboard.css       Estilos base del panel (fuente del bundle)
css/dashboard-premium.css  Capa premium del panel (fuente del bundle)
js/dashboard.js         Lógica del panel
js/libs/              html2canvas y qrcode locales (funcionan sin internet)
service-worker.js       Offline + actualización (CACHE_VERSION)
manifest.json           Manifiesto PWA
vercel.json             Cabeceras y caché
icons/                  Iconos de la app
css/01…27-*.css         Hojas fuente, en el orden de la cascada (la lista y el orden viven en tools/build-css.js)
docs/css-archivados/    Hojas que ya no se cargan, guardadas por si se quieren recuperar
css/tailwind.css        Tailwind compilado (generado; no editar a mano)
js/core/01…03-*.js      Base: errores globales, IndexedDB, PIN y biometría
js/modules/00…37-*.js   Módulos de la app (órdenes, inventario, caja, Drive, QR, etc.)
js/nelson-ia.js         Asistente Nelson IA
tools/build-css.js      Une y minifica las hojas en los 2 bundles (correr tras editar cualquier css/NN-*.css)
tools/verificar.js      Revisa que no falte nada antes de subir (incluye que los bundles estén al día)
tools/capturas.py       Capturas móvil/escritorio para comparar antes y después (necesita playwright)
tools/tailwind/         Configuración para recompilar css/tailwind.css
.well-known/            assetlinks.json (TWA / Android)
```

> **El orden importa.** Son scripts clásicos (no ES Modules) para conservar las funciones
> globales y los `onclick` inline. Se cargan en el orden en que aparecen en `index.html`.

## Flujo de trabajo con CSS

```bash
# 1. edita la hoja fuente (p. ej. css/27-correcciones.css)
node tools/build-css.js      # 2. regenera css/app.bundle.css y css/dashboard.bundle.css
node tools/verificar.js      # 3. revisa todo antes de subir
```

No edites los `*.bundle.css` a mano: se sobrescriben. Para comparar visualmente antes/después:
`python3 tools/capturas.py capturas/antes`, haz el cambio y `python3 tools/capturas.py capturas/despues`.

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

Luego corre `node tools/build-css.js` (Tailwind va dentro del bundle) y sube `css/tailwind.css` y los bundles junto con tus cambios. Las clases armadas con variables
(p. ej. `text-${color}-400`) no se detectan: agrégalas a `safelist` en `tools/tailwind/tailwind.config.js`.

## Cómo agregar un archivo nuevo

**Hoja CSS:** créala en `css/` con el siguiente número, agrega su nombre (sin `.css`) a la lista correspondiente de `tools/build-css.js` en la posición de cascada que quieras y corre `node tools/build-css.js`. No hace falta tocar el HTML ni el precache.

**Script JS:**
1. Crea el archivo en `js/modules/` con el siguiente número.
2. Agrega su `<script>` en `index.html`, en la posición correcta.
3. Agrégalo a `PRECACHE_URLS` en `service-worker.js`.

En ambos casos: sube la versión en `js/version.js` (los usuarios verán el aviso "Nueva versión disponible") y ejecuta `node tools/verificar.js`.

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

