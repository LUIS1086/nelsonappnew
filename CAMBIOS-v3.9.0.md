# NelsonAppNew v3.9.0

## Nuevo
- **Marca editable**: Configuración → Datos del negocio ahora tiene "Lema" y "Línea superior del inicio"; el splash los usa (antes eran fijos).
- **Asistente "Configura tu negocio"**: en una instalación nueva (sin nombre de negocio) aparece antes del tour. Se puede omitir.
- **Archivar órdenes viejas** (Configuración → Almacenamiento): descarga un JSON de respaldo y luego borra las órdenes *entregadas* con +6/12/24 meses. No toca órdenes abiertas.
- **Build de CSS**: `node tools/build-css.js` junta las 28 hojas en `css/app.bundle.css` (el index carga 1 archivo en vez de 28). Los `css/NN-*.css` siguen siendo la fuente: edítalos y vuelve a correr el script.
- Splash adaptativo (v3.8.4) incluido.

## Documentos
`docs/RESPALDO-KEYSTORE-APK.md`, `docs/PLAN-SINCRONIZACION.md`, `docs/CHECKLIST-PRUEBAS-CELULAR.md`, `supabase/garantias-aviso.sql` y `n8n/avisos-garantias.workflow.json` (borradores).

## Validación hecha
`tools/verificar.js` OK; prueba automática en Chromium (móvil y escritorio): splash, PIN, bundle CSS, archivado (borra solo la entregada vieja) y asistente (guarda y se refleja en el splash). **Pendiente**: prueba en celular real.
