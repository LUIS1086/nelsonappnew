# NelsonAppNew v3.6.2 — fluidez al salir y volver a la app

Base: `main` (v3.5.5) + mejoras de la rama de auditoría (v3.6.1) + correcciones nuevas.

## Traído de la rama (v3.6.1)
- Listado de Órdenes con cursor (`getOrderListSummaries`): no retiene fotos en memoria; 12 tarjetas iniciales y botón "Cargar más órdenes".
- `content-visibility:auto` en tarjetas de órdenes.
- Service worker: la navegación HTML usa la copia guardada si la red tarda más de 3,5 s.
- Diagnóstico opcional `?perf=1` (`js/core/00-diagnostico-rendimiento.js`), sin datos personales.

## Nuevo en v3.6.2
1. **`getOrdersLite()`**: lee las órdenes SIN fotos (cursor + caché de 3 s). Ahora lo usan `updateTotal`, `updateMetaBar`, `updateDesktopStats`, `checkOverdueOrders` y `checkAndNotifyOverdue`. Antes cada vuelta a la app leía todas las órdenes con sus fotos en base64.
2. **IndexedDB se reabre sola**: `db.onclose` / `onversionchange` limpian la conexión; `getAll`, `getOrdersLite`, `put` y `del` reintentan una vez si la conexión estaba cerrada (antes `getAll` devolvía `[]` en silencio).
3. **Al volver al primer plano**: se quitó el `display:none` + reflow de `33-…js` (el repintado de `11-fotos-gastos.js` ya cubre el fix de pantalla negra); el repintado no se ejecuta dos veces en 1 s; `updateTotal` espera 700 ms; `pollRespuestas` 2,5 s y el respaldo Supabase 6 s.

## Qué probar (en rama/Preview, no en producción)
- Salir a WhatsApp y volver: la pantalla no debe quedar negra y los totales de Caja deben actualizarse.
- Órdenes: buscar, filtrar, abrir fotos, comparar antes/después.
- Caja/ventas, meta mensual, badges del menú y avisos de órdenes vencidas.
- Con `?perf=1` revisar `[NelsonApp perf]` en la consola.

## Pendiente (no incluido)
- ~55 llamadas `getAll('orders')` restantes (reportes, exportar, chat, etc.): son acciones puntuales, no temporizadores.
- Separar las fotos de las órdenes en otra store (requiere migración con prueba previa).
