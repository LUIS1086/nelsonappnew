# NelsonAppNew — Auditoría etapa 2

Fecha: 25 de octubre de 2026

## Cambios incluidos en esta copia

- Garantías/WhatsApp: el código registra el intento en `garantiaAvisoWAIntento` y no marca `garantiaAvisoWA` como enviado al abrir el enlace.
- WhatsApp móvil: se abre una pestaña vacía de forma síncrona durante el clic del usuario y luego se navega a `wa.me`, reduciendo el riesgo de bloqueo del popup después de operaciones asíncronas.
- El registro de `_waJump` queda protegido si `sessionStorage` no está disponible.

## Pruebas ejecutadas

- `node tools/verificar.js`: OK (72 archivos CSS/JS, precaché y manifiesto según el verificador del proyecto).
- `node --check`: OK en 45 archivos JavaScript no minificados.
- `index.html`: 556 IDs revisados, sin duplicados; 47 referencias a scripts, sin archivos locales faltantes.
- Dependencias locales jsPDF, AutoTable y SheetJS: presentes.
- XLSX: prueba de escritura y lectura con comas, comillas y saltos de línea: OK.
- CSV: prueba de escapado de comillas, comas y saltos de línea: OK.

## Pendiente / límites

- No se completó una prueba de extremo a extremo del PDF en navegador; jsPDF y AutoTable están presentes, pero la descarga real sigue pendiente de validación en un navegador compatible.
- No se ejecutaron pruebas integrales de órdenes, ventas, inventario, cámara, OAuth ni Supabase contra el despliegue.
- No se probó la restauración de respaldos; hacerlo requiere una base aislada y datos ficticios.
- No se modificó el repositorio remoto, `main` ni datos reales.

Esta copia es para revisión y pruebas. Antes de sustituir una versión en uso, se recomienda desplegar en una rama de pruebas y validar manualmente los flujos pendientes.
