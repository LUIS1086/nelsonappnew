# NelsonAppNew — Auditoría estática y hardening responsive v2.0

## Cambios incluidos
- Se conectaron desde `index.html` las hojas `12-extras-1.css`, `13-extras-2.css`, `14-configuracion-command-center.css` y `15-nelson-ia.css`, que ya existían y estaban en la precaché del service worker, pero no se cargaban en la página principal.
- Se conserva el orden de las hojas de estilo y se mantiene la capa responsive premium `17-responsive-premium-hardening.css`.
- Se actualizó la versión visible de la app a `v3.4.6` y la versión de caché del service worker a `nelsonapp-v3.4.6` para forzar la renovación de recursos estáticos.
- Se conserva el zoom del navegador para mejorar accesibilidad móvil.

## Validaciones ejecutadas
- `node tools/verificar.js`: debe confirmar referencias locales, sintaxis de scripts enlazados, precaché e iconos.
- `node --check` sobre todos los JavaScript del proyecto.
- Integridad del ZIP con `unzip -t`.

## Alcance y limitaciones
Esta es una auditoría estática. No equivale a probar la app dentro de Chrome, Firefox, Safari/iPhone o un APK real. OAuth de Google, permisos de cámara, persistencia de IndexedDB, copias/restauraciones de Drive, Gemini, ventas y órdenes requieren pruebas funcionales manuales antes de publicar.
