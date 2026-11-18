# v3.9.11 — Revisión completa del modo claro
Se hizo una auditoría automática de contraste (texto vs fondo) abriendo 4 pantallas y 43 modales en modo claro y oscuro, a 360 px.
Nuevo css/39-modo-claro.css con las correcciones (solo color; no cambia funciones):
- Salud de la App: la cabecera verde quedaba blanca con texto blanco (invisible).
- Botones con degradado verde/turquesa que quedaban en blanco con texto blanco (Registrar pago, pestaña Caja actual en Movimientos).
- Botones violeta/índigo/turquesa con texto oscuro sobre fondo de color (QR, Guardar plantilla, etc.).
- Subtítulos y etiquetas en gris o color pastel muy claro (Garantías, Exportar, Estadísticas, Repuestos usados, Plan de pagos, Configuración).
- Visores de fotos: botón ✕ y textos legibles.
- Configuración: botones Guardar / Aplicar / Subir logo / Restablecer.
- Rojos de Órdenes y Caja con mejor contraste en claro; "Guardar gasto" legible.
- Botones principales: fallback de naranja un poco más oscuro (#ea580c).
Quedan, a propósito: texto blanco sobre el naranja de marca (contraste 2,8:1, es tu color de botón) y botones deshabilitados en gris.
