# Nelson App Pro · v3.5.2 — Venta unificada y botones de cartera con descripción

No hay cambios de base de datos (IndexedDB sigue en la versión 15). Las ventas anteriores
(rápidas o con ticket) se siguen viendo, anulando y reabriendo igual que antes.

## 1. Tarjetas de cartera: cada botón dice qué hace
Antes: «Historial» y «WhatsApp» sueltos. Ahora cada botón lleva título + descripción corta:

| Botón | Qué hace |
|---|---|
| 📜 Ver historial · *Órdenes y pagos* | Abre la ficha del cliente |
| 💵 Registrar abono · *Descuenta de la deuda* | Abre la ficha con el cursor en «Registrar pago» (nuevo) |
| 💬 Cobrar por WhatsApp · *Recordatorio del saldo* | Abre WhatsApp con el mensaje de cobro ya escrito |
| 📞 Llamar · *Marcar el número* | Llamada directa (nuevo) |
| 📵 Sin teléfono · *Agrégalo en una orden…* | Aviso cuando el cliente no tiene número |

Además: el WhatsApp de cobro ahora antepone el indicativo 57 (antes `wa.me` recibía el número
sin país) y usa el nombre del negocio de `businessConfig.name`. En la ficha del cliente los
botones «WhatsApp» y «Llamar» también muestran su descripción.

## 2. Ventas: un solo módulo, completo
Antes había dos formularios en Caja: «Nueva venta» (rápida) y «Venta con factura / ticket».
Ahora hay **una sola tarjeta «Nueva venta»** que abre el formulario completo, con lo mejor de ambos:

- Selector de producto **con buscador** (por nombre o código) y aviso de stock bajo/agotado.
- **Varios productos** en el mismo ticket (carrito).
- **Rebaja o recargo de precio solo para esa venta**: descuentos rápidos (-5 a -25 %), redondeo y
  ajuste fino; el inventario no cambia. Se ve la rebaja en la línea del carrito y queda guardada
  (`precioOriginal`, `precioModificado`) y en el movimiento de stock.
- **Cliente opcional**: vacío = «Cliente de mostrador». Si escribes un nombre sugiere clientes
  existentes y completa su teléfono.
- Método de pago, observaciones y ticket por WhatsApp · compartir · PDF · imagen · imprimir.
- El botón «Nueva venta» de la barra superior (escritorio) abre este mismo formulario.

### Archivos tocados
`index.html`, `css/21-ticket-venta.css`, `js/modules/05-cartera-clientes.js`,
`13-ventas-precios-caja.js` (se eliminó la venta rápida: `processSale`, tarjeta de precio),
`16-panel-escritorio.js`, `39-ticket-venta.js`, `js/core/01-base-globales.js`
(se quitó `customSalePrice`) y `service-worker.js` (CACHE_VERSION v3.5.2, para que salga el aviso
de «nueva versión disponible»).

`updateVentaSelect()` se conserva como función puente porque inventario, importación y anulación la llaman.
