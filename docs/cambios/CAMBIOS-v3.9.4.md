# v3.9.4 — Tarjeta de orden profesional
- js/modules/10-ordenes-lista-estados-whatsapp.js: acciones reorganizadas. Fila principal (WhatsApp · Llamar · Imprimir) y "Más acciones" plegable (Seguimiento · Notas · Duplicar · Cliente · Eliminar). Mismos handlers (sendWA, printInvoice, openOrderChat, delOrder...).
- Íconos de línea SVG en lugar de emojis en las acciones; sin emojis en estado, fechas, chips ni saldo.
- Nuevo css/32-orden-tarjeta.css (agregado a tools/build-css.js): sin brillos ni colores por botón, total en tono de texto, barra de pago fina, estado como etiqueta plana con punto.
- Probado: crear 3 órdenes, abrir "Más acciones" y abrir Notas; sin errores JS. verificar.js en orden.
- Incluye v3.9.3 (formulario de recepción por secciones).
