# v3.8.5 — proveedores y órdenes de compra (traídos de tu rama `3.9.0`)

Solo se trajeron los cambios de proveedores / órdenes de compra / inventario. Nada más de esa rama.

## Orden de compra (`js/modules/25-meta-graficas-compras.js`, `27-whatsapp-cola-proveedores.js`, bloque del modal en `index.html`)
- Lista **todos** los productos del inventario (antes solo los de bajo mínimo); los de bajo mínimo salen primero y marcados.
- Casillas para elegir qué productos pedir, contador "N productos seleccionados" y **buscador** por producto, código o proveedor.
- Proveedor obligatorio con tarjeta de contacto (ciudad, tiempo de entrega, enlace de WhatsApp) y botón **+ Gestionar proveedores**.
- El mensaje de WhatsApp/copiar solo incluye los productos seleccionados; avisa si no hay ninguno o el proveedor no tiene WhatsApp.
- "Pedir por WhatsApp" por producto también funciona con el contacto guardado en el producto.

## Inventario (`js/modules/12-inventario.js`, formulario del producto en `index.html`)
- Campo nuevo **WhatsApp / contacto del proveedor** en el formulario del producto (se guarda como `supplierPhone`).
- El buscador del inventario también encuentra por ese contacto.
- Cada fila muestra el proveedor y su contacto, con botón **💬 Pedir por WhatsApp**.
- (Adaptación mía) El listado conserva su diseño actual; se evitó que el precio se parta en varias líneas.

## Soporte
- `css/27-correcciones.css`: 6 utilidades Tailwind que usa el nuevo modal y no estaban compiladas (no hizo falta recompilar Tailwind).
- Versión: v3.8.5 (número propio de este paquete; tu rama usa v3.9.9).

## No incluido (siguen en tu rama `3.9.0`)
Listas y formularios "profesionales" (css 26/27/28 de esa rama), splash, asistente de negocio, archivar órdenes, configuración premium, dashboard nuevo, flujo n8n.
