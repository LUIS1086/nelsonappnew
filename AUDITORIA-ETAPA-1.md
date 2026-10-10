# NelsonAppNew — Etapa 1: responsive y revisión estática

## Cambios aplicados
- Se añadió `css/17-responsive-premium-hardening.css`, que ya estaba enlazado desde `index.html` pero no venía incluido en el ZIP original.
- Se agregó el archivo nuevo al `PRECACHE_URLS` del service worker.
- Se incrementó la versión de caché de `nelsonapp-v3.4.3` a `nelsonapp-v3.4.4` para que los clientes reciban la actualización.
- Los estilos se añadieron como una capa separada: no se reemplazaron `index.html`, módulos JavaScript ni funciones de negocio.

## Verificación ejecutada
- `node tools/verificar.js`: correcto. Los 57 archivos CSS/JS referenciados, el precache y el manifiesto pasan la revisión estática.
- El verificador también comprueba sintaxis de los JavaScript referenciados.
- No se ejecutó una prueba real en Chrome/Firefox/Android ni un flujo OAuth/cámara: eso requiere abrir la aplicación en un navegador y validar permisos, dominios autorizados y configuración real.

## Qué probar al subirlo
1. Reemplaza los archivos del proyecto con el contenido de este ZIP o sube los cambios conservando la estructura de carpetas.
2. Haz deploy en Vercel/GitHub Pages según tu flujo habitual.
3. Cierra la PWA por completo y vuelve a abrirla; si sigue mostrando el diseño anterior, borra los datos/caché del sitio o desinstala y reinstala la PWA.
4. Comprueba anchuras de 320–390 px, tablet y escritorio.
5. Recorre inicio de sesión/PIN, navegación, creación/edición de órdenes, cámara, inventario, ventas/caja, respaldo/Google Drive, IA/Gemini y exportaciones.

## Importante
Este ZIP contiene el proyecto completo recibido con cambios acotados a responsive y actualización del caché. No afirma que los problemas previos de cámara u OAuth estén corregidos; quedan para la siguiente etapa de diagnóstico funcional con resultados observados en navegador.
