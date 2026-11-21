# v3.9.18 — Seguimiento del cliente más completo y revisión general
**seguimiento.html (la página que ve el cliente)**
- **Botón "Llamar al taller"** (además del de WhatsApp).
- **Garantía con fecha:** al entregar muestra "Garantía hasta el 12 de diciembre de 2026" (o "venció el…" si ya pasó).
- **Foto ampliable:** tocar la foto la abre completa; tocar de nuevo o Esc la cierra.
- **Funciona sin señal:** guarda en el teléfono del cliente la última información (sin fotos) y la muestra con el aviso "Sin conexión" si no puede conectarse al abrir.
- **Menos consumo:** cuando la reparación ya terminó, consulta cada 5 min en vez de cada 30 s.
- **Accesibilidad y detalles:** avisos de estado leídos por lectores de pantalla, pasos de la línea de tiempo marcados (paso actual), mensaje si el navegador no tiene JavaScript, icono de pestaña/pantalla de inicio, descripción y `color-scheme`, foco visible en botones.
- No se tocó la lógica de presupuesto (aprobar/rechazar) ni la conexión con Supabase.
- Nueva prueba `tools/humo-seguimiento.js` (se ejecuta dentro de `tools/verificar.js`): 5 estados, presupuesto aprobar/rechazar, sin señal con y sin copia, llamar, garantía y foto (35 comprobaciones).

**Revisión de index.html, CSS y JS (sin cambios necesarios, salvo el icono)**
- `index.html`: idioma, viewport (permite zoom), meta tags y formulario correctos; se agregó `rel="icon"` (antes el navegador pedía `/favicon.ico`).
- CSS: sintaxis válida en todas las hojas (los 8 avisos del validador son `env(safe-area-…)`, que es válido). ~9 % de las clases (111 de 1196) no aparecen escritas en `index.html` ni en los `.js`, sobre todo en `25-visual-refresh.css`; no se eliminaron porque algunas pueden armarse dinámicamente.
- JS: sin errores en las reglas de ESLint; 184 funciones ejecutadas con datos de prueba sin fallos.
