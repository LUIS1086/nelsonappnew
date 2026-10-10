# NelsonAppNew — Responsive Premium Hardening v1.0

## Cambios incluidos
- Nueva capa CSS aditiva `css/17-responsive-premium-hardening.css` para endurecer la adaptación a móvil, tablet y escritorio.
- Conserva las hojas de estilo, módulos JavaScript y estructura funcional existentes.
- Mejora el comportamiento de inputs y áreas táctiles en móvil; previene desbordamientos horizontales comunes.
- Añade estados de foco visibles para navegación con teclado y respeta `prefers-reduced-motion`.
- Permite ampliar con zoom del navegador: se eliminó la restricción `maximum-scale=1.0, user-scalable=no` del viewport.
- Actualiza la versión de caché del service worker a `nelsonapp-v3.4.5` e incluye el nuevo CSS en el precache.

## Validaciones ejecutadas
- `node tools/verificar.js`: correcto (57 archivos CSS/JS, precache y manifest).
- `node --check service-worker.js`: correcto.

## Nota
Esta es una mejora conservadora de presentación y accesibilidad. La cámara, OAuth de Google, Drive, Gemini y demás flujos no se reescribieron en esta entrega; requieren pruebas manuales en navegadores y dispositivos reales para certificar su comportamiento.
