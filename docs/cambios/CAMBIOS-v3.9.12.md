# v3.9.12 — Logo del negocio
- Configuración > Datos del negocio: "Subir logo" ahora reduce la imagen a 512 px (liviana, buena para PDF) y conserva fondo transparente en PNG. Botón "Quitar" para borrarlo. La vista previa ya no recorta el logo.
- Cabecera de la app: el logo aparece junto al nombre del negocio.
- Comprobante de venta: logo en la vista previa, la imagen y el PDF (nombre largo se ajusta).
- La insignia "Completo" de Datos del negocio y el puntaje de Salud ahora cuentan el logo guardado.
- Archivos: js/modules/21-config-acciones-seguridad.js (getBizLogo, applyBrandLogo, previewLogo, removeBizLogo), 20-configuracion-modal.js, 39-ticket-venta.js, index.html (header y botón Quitar), css/40-logo.css (nuevo).
- Probado: subir logo, ver en cabecera, vender, descargar PDF e imagen con logo, quitar logo; sin errores JS.
