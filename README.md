# Nelson App Pro · Todo Repuestos Nelson

PWA de gestión para taller de reparación de electrodomésticos pequeños y venta de repuestos
(órdenes, inventario, ventas, gastos, clientes, pagos y reportes). Proyecto propio con fines
educativos y de venta.

**Stack:** JavaScript vanilla · Tailwind (compilado, sin CDN) · IndexedDB (`NelsonAppPro`) · Gemini (Nelson IA) ·
Google Drive (respaldo) · PWA/TWA (PWABuilder) · Vercel.

## Estructura

```
index.html              Solo estructura HTML (carga css/ y js/ en orden)
dashboard.html          Panel de indicadores
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

## Dashboard responsive

`dashboard.html` se adapta a teléfonos, iPhone, tablets y escritorio. La navegación ya no oculta ni redirige el dashboard en pantallas pequeñas; las tarjetas, gráficos, barras de navegación y modales se reorganizan mediante CSS responsive.

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


## Acabado premium del dashboard

- Se refinaron superficies, sombras, estados activos y jerarquía visual del dashboard.
- Se añadieron estados de foco visibles para teclado y ajustes de interacción táctil.
- Se mejoró el aspecto de tarjetas y paneles tanto en tema oscuro como claro.
- Se mantiene intacta la lógica de negocio y la navegación existente; los cambios son principalmente de presentación.
- Se incrementó la versión de caché de la PWA a `nelsonapp-v3.4.4` para que los dispositivos descarguen los recursos actualizados.
