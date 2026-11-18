# v3.9.5 — Resumen de hoy + títulos de Caja
- Taller abre con "Resumen de hoy": En taller · Listos · Por cobrar (monto y nº de órdenes) · Vencidos. Cada indicador es tocable.
- Debajo, solo los pendientes que existen (equipos listos por avisar, entregas vencidas, repuestos bajo mínimo), cada uno con su acción de siempre; si no hay, "Sin pendientes urgentes".
- js/modules/16-panel-escritorio.js: _refreshDailyPanel conserva firma e ids; cambia el render. index.html: marcado del panel. Nuevo css/33-resumen.css.
- Caja: títulos de bloque en minúscula, sin emojis ni colores por bloque.
- Incluye v3.9.3 (recepción) y v3.9.4 (tarjeta de orden). Probado: guardar orden, resumen con pendientes, modo claro; sin errores JS. verificar.js en orden.
