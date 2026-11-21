# v3.9.19 — Corregir ventas + enlaces de seguimiento que no se caigan
**Corregir una venta ya registrada (nuevo, `js/modules/46-editar-venta.js` + `css/41-editar-venta.css`)**
- Botón **✏️** en cada venta del historial de la caja y botón **«Corregir»** en el comprobante (también justo después de registrar la venta).
- Se puede cambiar **cantidad, precio por unidad, quitar un producto** y los datos del cliente (nombre, teléfono, documento, método de pago, observaciones). Muestra el total nuevo y qué pasará con el inventario antes de guardar.
- El **inventario se ajusta por la diferencia** (sale más o vuelve) y queda un movimiento «Corrección de venta» por cada cambio. Si falta stock, no deja guardar.
- **Todo o nada:** si algo falla al guardar, la venta y el inventario vuelven a como estaban.
- Cada corrección queda anotada en la línea (`ediciones`, últimas 5) con los valores anteriores. Si la venta es de antes del último cierre de caja, avisa que no cambia la caja actual.
- Si se quitan todos los productos, pide confirmación y equivale a anular la venta. «Anular» sigue funcionando igual.
- Los adelantos y cobros de entrega no se editan aquí (se corrigen desde la orden).
- `tools/humo.js` prueba todo: abrir el editor (desde historial y comprobante), cambiar cantidad/precio/cliente, quitar línea, stock insuficiente y reversa cuando falla un guardado a la mitad.

**Seguimiento del cliente**
- El mensaje de **presupuesto** por WhatsApp ahora incluye el enlace de seguimiento (desde ahí el cliente aprueba o rechaza). Respeta la opción «enlace automático»; si no está configurado, el mensaje queda igual.

**Que Supabase no se pause**
- `.github/workflows/mantener-supabase.yml` + `tools/ping-supabase.js`: lunes y jueves hace una consulta inofensiva a Supabase para que el plan gratis no se pause por inactividad (se pausaría a los 7 días y los enlaces de seguimiento dejarían de funcionar). Si Supabase responde con error, GitHub avisa por correo. También se puede lanzar a mano desde la pestaña Actions.
