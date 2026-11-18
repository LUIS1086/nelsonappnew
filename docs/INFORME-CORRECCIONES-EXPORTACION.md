# NelsonAppNew — correcciones de exportación

## Cambios aplicados
- Se normalizó `js/ libs/` a `js/libs/`, que es la ruta usada por `index.html`, los módulos y el service worker. Se conservaron los seis archivos de bibliotecas.
- Se incrementó la versión de caché del service worker de `nelsonapp-v3.7.1` a `nelsonapp-v3.7.2` para que el navegador solicite una caché nueva.
- Exportación de órdenes: ahora toma la descripción desde `det` (campo real de las órdenes), manteniendo `fal` como compatibilidad con registros antiguos.
- Exportación de órdenes: reconoce `fechaEstimada` y conserva `deadline` como compatibilidad.
- Exportación de ventas y gastos: ordena por timestamp original, antes de formatear las fechas para presentación, evitando el parseo ambiguo de fechas `dd/mm/yyyy`.
- Exportación Excel: el cargador dinámico comprueba que SheetJS haya quedado disponible y ofrece un mensaje de error más útil.
- El indicador de carga de exportación ya no provoca un error secundario si el elemento no existe en el DOM.

## Validaciones ejecutadas
- `node tools/verificar.js`: correcto, 65 referencias CSS/JS, precache y manifest verificados.
- `node --check` sobre 47 archivos JavaScript: sin errores de sintaxis.
- Confirmación de existencia de las seis bibliotecas dentro de `js/libs/`.

## Pendiente de validación manual
No se puede certificar desde una revisión estática que el navegador del usuario haya guardado un archivo. Después de desplegar, probar en el dispositivo PDF, XLSX y CSV con rangos mensual e histórico. Si la PWA estaba instalada, cerrarla completamente y abrirla de nuevo para que tome la nueva caché.

## Alcance
No se cambiaron las funciones de cámara, Google OAuth ni el flujo principal de órdenes. No se publicó nada en GitHub ni se modificó la rama remota.
