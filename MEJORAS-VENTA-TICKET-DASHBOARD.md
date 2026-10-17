# Mejoras: venta con comprobante y acceso al dashboard

## Cambios incluidos
- Nueva tarjeta de acción en Caja & Inventario: **Venta con factura / ticket**.
- Formulario para elegir producto con stock, cantidad, precio unitario, cliente, documento/NIT opcional, teléfono, método de pago y observaciones.
- Al registrar, descuenta existencias, guarda el movimiento de venta y genera un comprobante imprimible con opción de guardar como PDF.
- Validación de cantidad y stock disponible, más escape de texto en los datos que aparecen en el comprobante.
- Acceso destacado **Dashboard** en la barra superior del index (ya existente, se conserva) y nuevos accesos **Venta + ticket** desde el Command Center para llegar a Caja & Stock.

## Importante sobre facturación
El comprobante generado es un recibo comercial imprimible. No es una factura electrónica validada por la DIAN ni reemplaza un sistema de facturación electrónica autorizado. Para emitir factura electrónica legal en Colombia hay que integrar un proveedor tecnológico o el sistema de facturación DIAN y completar los datos tributarios aplicables.

## Prueba recomendada
1. Haz una copia de seguridad de los datos desde la función de respaldo de la app.
2. En Caja & Inventario, elige **Venta con factura / ticket**.
3. Selecciona un producto con stock, confirma cantidad y precio y llena el nombre del cliente.
4. Registra la venta, verifica el ticket y confirma que el stock disminuyó en la cantidad correcta.
5. Verifica la venta en el historial y abre el Dashboard desde el botón superior.

---

## Actualización v3.7.7 · Ticket con WhatsApp, PDF e imagen
- Al registrar una venta con ticket ya no se abre una ventana emergente: aparece el modal **Venta registrada** con la vista previa del ticket y estas acciones:
  - 💬 **Enviar por WhatsApp**: mensaje con el detalle al número del cliente (se antepone 57 si hace falta). Si la venta no tenía teléfono, se escribe ahí y se guarda en la venta.
  - 📤 **Compartir**: imagen del ticket por el menú de compartir del celular (elige el chat). Si el dispositivo no lo permite, se descarga.
  - 📄 **PDF** (rollo de 80 mm), 🖼️ **Imagen** (PNG) y 🖨️ **Imprimir** (sin ventana emergente).
- En el historial de la caja (Movimientos) cada venta tiene un botón 🧾 para reabrir su ticket y reenviarlo después.
- Correcciones: el stock se lee fresco al registrar (antes podía pisar ventas hechas con el modal abierto), el botón se bloquea contra doble toque y, si falla el guardado de la venta, el stock descontado se devuelve.
- Archivos nuevos: `js/modules/39-ticket-venta.js` (reemplaza el script en línea del index) y `css/21-ticket-venta.css`. Service worker en v3.7.7.
- Nota: un enlace `wa.me` solo puede llevar texto; la imagen/PDF no se adjuntan solos, por eso existe «Compartir».
