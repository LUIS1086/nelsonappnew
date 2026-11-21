# v3.9.16 — Presentación, confianza y calidad del proyecto
**Presentación al cliente**
- Los enlaces de WhatsApp usan un solo formato de número (`_waNumber`): quita espacios, guiones y "+", y agrega 57 solo si hace falta. Antes el presupuesto (módulo 17) y el botón de proveedores (módulo 30) podían generar un enlace roto si el teléfono tenía espacios o ya traía el indicativo; los avisos de listos (módulo 18) podían duplicar el 57.
- El mensaje de presupuesto toma el nombre del negocio de la configuración (antes tenía "TODO REPUESTOS NELSON" fijo).

**Confianza**
- Registro de errores local: los últimos 30 errores se guardan en este teléfono (`appErrorLog`) y "Salud de la app" muestra una fila nueva "Errores recientes" (últimas 24 h, con el último mensaje). El aviso al usuario sigue igual (máximo una vez por minuto).

**Código y proyecto**
- Nueva prueba de humo `tools/humo.js`: abre la app completa en un navegador simulado, desbloquea con el PIN, crea una orden, recorre las pestañas, abre el dashboard y comprueba los helpers nuevos. Falla si aparece cualquier error; con el `dashboard.js` roto de v3.9.12 falla. Se ejecuta dentro de `tools/verificar.js`.
- `tools/lint/package.json` ahora instala ESLint + jsdom + fake-indexeddb (una vez: `cd tools/lint && npm install`; requiere Node 22+). El flujo de GitHub usa Node 22.
- No se quitó ni cambió ninguna función existente.
