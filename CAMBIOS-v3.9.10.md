# v3.9.10 — Inventario y Cartera profesionales
**Inventario** (js/modules/12-inventario.js, index.html, css/38-inventario-cartera.css)
- Tarjeta nueva: el nombre del producto se ve completo (antes se cortaba "ACOPL…"), precio grande, costo y margen, barra de stock, estado "Agotado" / "Stock bajo".
- Cantidad con botones − y + más grandes; acciones (historial, editar, eliminar) con íconos de línea.
- Cabecera con botones "Reporte" y "Nuevo", chips de categoría sin emojis, resumen sin emojis.
**Cartera** (js/modules/05-cartera-clientes.js)
- Total por cobrar destacado; cada cliente con deuda, monto, barra relativa y botón principal "Registrar abono"; WhatsApp, Llamar e Historial como íconos.
- Estado vacío limpio.
**Modo claro y oscuro** revisados en ambas pantallas. Mismos ids y funciones (modQty, editStockItem, deleteStockItem, openClientPayment, etc.).
Probado: sumar stock, filtrar, abrir el abono del cliente, venta completa, recepción, no reparable; sin errores JS. Incluye v3.9.3 a v3.9.9.
