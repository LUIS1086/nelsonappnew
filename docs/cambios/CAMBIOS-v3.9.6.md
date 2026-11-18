# v3.9.6 — Destino de no reparables + Resumen plegable
- Al marcar una orden como "no reparable" se abre una hoja: "Se lo lleva el cliente" / "Lo deja para desechar" (o Cancelar: el estado no cambia). Se guarda en la orden (destinoNR) y queda en el chat interno.
- La tarjeta muestra el destino con un botón para cerrarlo ("Marcar entregado" / "Marcar desechado") y luego queda como "Devuelto al cliente · fecha" o "Desechado · fecha".
- Si se sale de "no reparable", se borran esos datos. Valor y saldo en 0 y el aviso del adelanto siguen igual.
- Resumen de hoy: ahora es plegable. Cerrado es una barra con "N en taller" y "Al día / N pendientes". Se abre con un toque y recuerda tu elección. Nueva fila: "No reparables por resolver".
- Archivos: js/modules/10-ordenes-lista-estados-whatsapp.js, js/modules/16-panel-escritorio.js, js/core/02-dialogos-db.js (campos nuevos en el resumen de lista), index.html, css/33-resumen.css, css/34-no-reparable.css (nuevo).
- Probado: hoja, elegir destino, cancelar, insignia en tarjeta, resumen cerrado/abierto; sin errores JS. verificar.js en orden.
