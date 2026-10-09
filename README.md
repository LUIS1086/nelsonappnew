# Nelson App Pro · Todo Repuestos Nelson

PWA de gestión para taller de reparación de electrodomésticos pequeños y venta de repuestos
(órdenes, inventario, ventas, gastos, clientes, pagos y reportes). Proyecto propio con fines
educativos y de venta.

**Stack:** JavaScript vanilla · Tailwind (CDN) · IndexedDB (`NelsonAppPro`) · Gemini (Nelson IA) ·
Google Drive (respaldo) · PWA/TWA (PWABuilder) · Vercel.

## Estructura

```
index.html              Solo estructura HTML (carga css/ y js/ en orden)
dashboard.html          Panel de indicadores
service-worker.js       Offline + actualización (CACHE_VERSION)
manifest.json           Manifiesto PWA
vercel.json             Cabeceras y caché
icons/                  Iconos de la app
css/01…16-*.css         Estilos, en el orden de la cascada
js/core/01…03-*.js      Base: errores globales, IndexedDB, PIN y biometría
js/modules/00…37-*.js   Módulos de la app (órdenes, inventario, caja, Drive, QR, etc.)
js/nelson-ia.js         Asistente Nelson IA
tools/verificar.js      Revisa que no falte nada antes de subir
.well-known/            assetlinks.json (TWA / Android)
```

> **El orden importa.** Son scripts clásicos (no ES Modules) para conservar las funciones
> globales y los `onclick` inline. Se cargan en el orden en que aparecen en `index.html`.

## Antes de subir cambios

```bash
node tools/verificar.js
```

## Cómo agregar un archivo nuevo

1. Crea el archivo en `css/` o `js/modules/` con el siguiente número.
2. Agrega su `<link>` / `<script>` en `index.html`, en la posición correcta.
3. Agrégalo a `PRECACHE_URLS` en `service-worker.js`.
4. Sube `CACHE_VERSION` en `service-worker.js` (los usuarios verán el aviso "Nueva versión disponible").
5. Ejecuta `node tools/verificar.js`.

## Despliegue

Vercel (sitio estático, sin build). Para el APK: PWABuilder con la URL de Vercel.
