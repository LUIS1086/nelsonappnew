# v3.9.3 — Formulario de recepción por secciones
- index.html (#view-taller): formulario reorganizado en 5 secciones numeradas: Cliente · Equipo · Seguimiento (plegable) · Pago · Notas internas (plegable).
- Seguimiento y Notas empiezan cerrados: el formulario pasa de muy largo a lo esencial. Sus campos siguen en la página y se guardan igual.
- Etiquetas en minúscula, sin emojis; ícono SVG en el teléfono; Valor y Adelanto lado a lado; botón principal limpio.
- Nuevo css/31-recepcion.css (agregado a tools/build-css.js). Ningún id, campo ni evento cambió.
- Probado: guardar una orden real (campos se limpian y garantía vuelve a 30), sin errores JS. verificar.js en orden.
- Para volver atrás: restaurar index.html original y quitar '31-recepcion' de tools/build-css.js.
