# NelsonAppNew — Auditoría técnica ampliada

Fecha: 2026-10-21  
Base: `nelsonappnew-main.zip` del usuario y paquete de auditoría base.

## Resultado de las comprobaciones estáticas

- `node tools/verificar.js`: correcto; 73 referencias CSS/JS revisadas, referencias de precaché y manifiesto comprobados.
- `node --check` sobre los 51 archivos JavaScript de `js/` (incluyendo los módulos propios; no se modificaron bibliotecas minificadas): sin errores de sintaxis.
- `index.html`, `dashboard.html` y `seguimiento.html`: no se detectaron identificadores duplicados ni referencias locales `src`/`href` ausentes en el análisis estático.
- Las tres páginas principales aparecen en el precaché del service worker.
- Los iconos definidos en el manifiesto existen.
- No se detectaron claves de API con los patrones evidentes comprobados. Esto no inspecciona el historial Git ni sustituye una auditoría de credenciales.

## Cambio técnico acotado

- Se corrigió el orden de inicialización de la función `err` en `tools/verificar.js`. Antes, el verificador podía lanzar un `ReferenceError` si detectaba una página sin precaché, porque la comprobación se ejecutaba antes de inicializar la función. Con el orden corregido, puede informar correctamente el error en lugar de fallar el propio verificador.
- Se conserva la corrección previa: `seguimiento.html` incluido en `PRECACHE_URLS` y versión de caché `nelsonapp-v3.5.1`.
- No se cambió la lógica de negocio ni se eliminaron módulos.

## Hallazgos prioritarios para las siguientes etapas

### Prioridad alta — antes de vender

1. **No es todavía multiempresa segura.** La aplicación usa `localStorage`/almacenamiento del navegador para preferencias y varios datos. La separación visual de negocios no proporciona aislamiento. La modalidad compartida necesita autenticación de servidor, identificación del negocio en cada registro y políticas de autorización comprobadas en backend (por ejemplo, RLS de Supabase revisado y probado).
2. **Marca PWA estática.** `manifest.json` mantiene nombre corto, nombre completo, colores e iconos fijos. Un ajuste del nombre en la pantalla no cambia necesariamente el nombre e icono instalados. Para instalaciones independientes se deberá generar/configurar manifiesto e iconos por cliente y definir una estrategia de actualización.
3. **CSP dependiente de scripts inline.** `vercel.json` permite `unsafe-inline` para scripts/estilos y el HTML contiene muchos manejadores inline. Endurecer la política de golpe puede romper botones y formularios; conviene migrarlos gradualmente y probar cada etapa.

### Prioridad media — pruebas de regresión

4. **Exportaciones y persistencia necesitan pruebas reales.** La sintaxis correcta no confirma que el navegador descargue PDF/XLSX/CSV, ni que los datos y rangos sean correctos. Debe probarse con registros ficticios, incluyendo rangos mensuales e históricos.
5. **Integraciones requieren entorno real.** Cámara, Google OAuth/Drive, Gemini, Supabase, permisos y actualización de PWA no pueden certificarse con `node --check`.
6. **Rendimiento y accesibilidad no medidos.** Faltan mediciones de carga, respuesta de transiciones, contraste, teclado y uso de memoria en móviles.

## Matriz de pruebas manuales pendiente

- [ ] Crear, editar, cambiar estado y cancelar una orden de prueba.
- [ ] Crear/editar cliente y comprobar que sus datos persisten tras recargar.
- [ ] Entrada/salida de inventario y venta de prueba; verificar cantidades y totales.
- [ ] Registrar ingreso/gasto y comprobar caja y reportes.
- [ ] Exportar PDF, XLSX y CSV para datos de prueba y para un rango sin datos.
- [ ] Crear y restaurar una copia de seguridad en un entorno de prueba.
- [ ] Probar cámara y permisos en el navegador/dispositivo de destino.
- [ ] Probar Google OAuth/Drive, Gemini y seguimiento/Supabase con sus credenciales autorizadas.
- [ ] Instalar/actualizar PWA, abrirla offline y comprobar que la nueva versión se aplica.

## Límite de esta entrega

Es una revisión estática ampliada más una corrección del verificador y de la disponibilidad offline. No se afirma que se hayan completado pruebas funcionales de navegador, ni se ha publicado ningún cambio en GitHub. No utilizar datos reales para las pruebas de regresión; realizar primero una copia de seguridad.
