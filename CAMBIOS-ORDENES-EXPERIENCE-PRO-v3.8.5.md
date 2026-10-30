# NelsonAppNew v3.8.5 — Órdenes Experience Pro

## Alcance
- Renovación visual aditiva del módulo Órdenes.
- Búsqueda y filtros con jerarquía visual mejorada.
- Tarjetas de órdenes con acabado premium, mejor contraste y adaptación responsive en dos columnas para pantallas amplias.
- Ajustes para tema oscuro y claro, estados de foco y reducción de movimiento.

## Integridad funcional
No se modificaron los módulos JavaScript de órdenes, sus funciones, eventos, estados, filtros, búsqueda, fotografías, datos, almacenamiento ni exportaciones. Se conservaron los IDs existentes y el HTML funcional; los cambios se limitan a una hoja CSS nueva, su inclusión en `index.html`, precache del Service Worker y versión.

## Validación ejecutada
- Sintaxis de todos los archivos JavaScript con `node --check`.
- Comprobación de IDs duplicados en `index.html`.
- Verificación de referencia CSS y entrada en precache.
- Integridad del ZIP.

No se declara prueba visual real en navegador ni despliegue en Vercel: requieren abrir la rama de pruebas en el dispositivo.
