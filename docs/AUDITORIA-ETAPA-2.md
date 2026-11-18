# NelsonAppNew — Etapa 2: auditoría funcional inicial

## Estado informado por el usuario
- Inicio y navegación: funciona.
- Cámara: funciona.
- Google OAuth: funciona.
- Módulos principales: funcionan.

Estos resultados son pruebas manuales informadas por el usuario; no se presentan como pruebas automatizadas ejecutadas por este paquete.

## Hallazgo confirmado y corrección
- `index.html` enlazaba `css/17-responsive-premium-hardening.css`, pero el archivo faltaba en el ZIP original.
- Se incorporó la hoja de estilos faltante sin reemplazar estilos existentes ni modificar módulos funcionales.
- Se agregó la hoja al `PRECACHE_URLS` del service worker.
- Se actualizó la caché de `nelsonapp-v3.4.3` a `nelsonapp-v3.4.4` para que los clientes puedan detectar la versión nueva.

## Alcance de la auditoría
- Se ejecutó `node tools/verificar.js` para validar referencias CSS/JS, sintaxis de JavaScript referenciado, precaché e iconos del manifiesto.
- Se revisaron referencias locales de `index.html` y `dashboard.html`.
- No se modificó lógica de órdenes, cámara, OAuth, inventario, ventas, caja, Drive ni Gemini porque el usuario informó que esos flujos funcionan y no se observó un fallo reproducible que justificara cambios de lógica.

## Verificación pendiente
Esta revisión estática no sustituye pruebas de navegador ni una prueba de regresión con datos reales. Antes de la siguiente versión, probar creación/edición/eliminación de órdenes, cambios de inventario, venta y movimiento de caja, backup/restauración, Drive, IA, exportación y actualización/offline de la PWA.

## Cómo ejecutar la revisión
Desde la raíz del proyecto:

```bash
node tools/verificar.js
```

No se deben subir claves API ni credenciales a GitHub.
