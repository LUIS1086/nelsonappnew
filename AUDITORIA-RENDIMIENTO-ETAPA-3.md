# NelsonAppNew — Auditoría de rendimiento Etapa 3

## Diagnóstico priorizado

El listado de órdenes llamaba `getAll('orders')`, que usa IndexedDB `getAll()` y además mantiene una caché en memoria de los objetos completos durante 3 segundos. Si las órdenes contienen muchas fotografías (por ejemplo, data URLs/base64), esto puede copiar y retener un volumen grande de datos en RAM. El renderizado por lotes previo seguía creando automáticamente tarjetas para todas las órdenes; por tanto, al final añadía cientos o miles de elementos al DOM.

## Cambios de esta etapa

- Nuevo `getOrderListSummaries()` basado en cursor de IndexedDB: conserva solo los campos usados por las tarjetas y los conteos de fotos; no mantiene las imágenes completas en la lista. Los datos originales no se escriben ni se transforman en la base de datos.
- La lista muestra 12 tarjetas al inicio y agrega 8 por clic con “Cargar más órdenes”, evitando llenar automáticamente el DOM con miles de tarjetas.
- La consulta detallada de las fotos debe seguir realizándose al abrir los modales de fotos, usando los métodos existentes.
- Versión de caché actualizada a v3.5.8.

## Límites y pruebas pendientes

- El cursor de IndexedDB aún tiene que leer cada registro, así que no elimina todo el coste de deserializar datos grandes; reduce sobre todo la retención simultánea y la creación masiva de DOM.
- No se ejecutó una prueba de navegador con el respaldo real de 500–2.000 órdenes.
- Probar búsqueda, filtros, editar orden, fotos de recepción/entrega, comparación, imprimir, WhatsApp y eliminación en una rama aislada.
- No importar el respaldo de producción sobre datos de producción durante la validación.
