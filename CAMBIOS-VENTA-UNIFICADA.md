# Nelson App Pro · v3.5.5 — Venta unificada, botones con descripción, fotos tardías y versión única

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

## 3. Tarjeta de orden: botones con nombre y descripción (v3.5.3)
Antes eran 6 iconos sueltos (📝 📋 🔗 🧾 💬 🗑️). Ahora son 8 botones con icono, nombre y qué hacen:

| Botón | Qué hace |
|---|---|
| 💬 WhatsApp · *Avisar al cliente* | Elige un mensaje listo (recepción, presupuesto, listo, cobro…) |
| 📞 Llamar · *Marcar número* | **Nuevo.** Llamada directa; si no hay teléfono avisa «Sin teléfono» |
| 🔗 Seguimiento · *Enlace y QR* | Enlace/QR para que el cliente vea el estado |
| 🧾 Imprimir · *Recibo o factura* | Genera el recibo para imprimir o compartir |
| 📝 Notas · *Solo internas* | Notas del taller; el cliente no las ve |
| 📋 Duplicar · *Misma persona* | Nueva orden con los datos del cliente |
| 👤 Cliente · *Ficha y deuda* | **Nuevo.** Abre la ficha: órdenes, pagos y deuda |
| 🗑️ Eliminar · *Borrar orden* | Pide confirmación, como antes |

Archivos: `js/modules/10-ordenes-lista-estados-whatsapp.js` y `css/08-ordenes-avisar-listos.css`.

## 4. Fotos de recepción después de registrar la orden (v3.5.4)
**Problema:** si al registrar al cliente se olvidaba la foto, el botón «📸 0 recep.» solo mostraba
«Esta orden no tiene fotos» y no había forma de tomarla después.

**Ahora:**
- Con 0 fotos el botón de la tarjeta dice **«📸 Sin foto · tomar»** (resaltado en naranja).
- Al tocarlo se abre el visor con el mensaje «aún no tiene fotos de recepción» y el botón **«📸 TOMAR FOTO AHORA»**.
- Se abre la cámara, se toma la foto y vuelve al visor para verla; si faltan, **«📸 AGREGAR FOTO (n/3)»**.
- Con 3 fotos el botón queda deshabilitado («MÁXIMO 3 FOTOS»); para cambiar una, se borra y se toma otra.
- El contador de la tarjeta se actualiza al cerrar el visor.

Archivos: `js/modules/11-fotos-gastos.js`, `08-ordenes-formulario-camara.js`, `10-ordenes-lista-estados-whatsapp.js`.

## 5. La versión se quedaba en v3.4.3 (v3.5.5)
**Causa:** la versión estaba escrita en tres sitios: `APP_VERSION` (pantalla de inicio, créditos y
configuración), `CACHE_VERSION` del service worker y un texto fijo en el dashboard. Al subir
versiones solo se cambiaba el del service worker, así que la pantalla seguía diciendo v3.4.3.

**Ahora hay UN solo lugar: `js/version.js`.** Para publicar una versión nueva se cambia solo esa línea:

```js
self.APP_VERSION = 'v3.5.5';
```

La leen la app, el dashboard y el service worker (con `importScripts`), que arma de ahí el nombre de
su caché (`nelsonapp-v3.5.5`). Si `version.js` fallara, el service worker igual se instala con un nombre de respaldo.

- **Service worker:** al activarse borra solo las cachés `nelsonapp-*` que no son las actuales
  (antes comparaba por prefijo del nombre). Se agregó `js/version.js` al precache.
- **Configuración → 🔄 Buscar actualizaciones** ahora sí busca: consulta al service worker y responde
  «Estás al día ✅ (App y Service worker)», «Se descargó una versión nueva → recargar», o, si la
  caché es de otra versión que la pantalla, ofrece **limpiar la caché y recargar** (no borra órdenes,
  clientes ni fotos: esos datos viven en IndexedDB).
- **`node tools/verificar.js`** ahora falla si: la versión no está en `version.js`, el service worker
  no la importa, `index.html`/`dashboard.html` no cargan `version.js`, los textos de versión del
  HTML no coinciden, o alguien vuelve a escribir una versión fija en otro archivo.

Archivos: `js/version.js` (nuevo), `service-worker.js`, `js/core/01-base-globales.js`, `js/dashboard.js`,
`js/modules/20-configuracion-modal.js`, `index.html`, `dashboard.html`, `tools/verificar.js`.

### Cómo publicar para que el celular se actualice
1. Sube el contenido de la carpeta `nelsonappnew-main` a la raíz del repositorio de Vercel (no la carpeta misma).
2. Espera a que Vercel termine el despliegue.
3. Abre la app: aparece «🚀 Nueva versión disponible» → **Actualizar**. Si no aparece, Configuración → Buscar actualizaciones.

### Archivos tocados
`index.html`, `css/21-ticket-venta.css`, `js/modules/05-cartera-clientes.js`,
`13-ventas-precios-caja.js` (se eliminó la venta rápida: `processSale`, tarjeta de precio),
`16-panel-escritorio.js`, `39-ticket-venta.js`, `js/core/01-base-globales.js`
(se quitó `customSalePrice`) y `service-worker.js` (CACHE_VERSION v3.5.2, para que salga el aviso
de «nueva versión disponible»).

`updateVentaSelect()` se conserva como función puente porque inventario, importación y anulación la llaman.
