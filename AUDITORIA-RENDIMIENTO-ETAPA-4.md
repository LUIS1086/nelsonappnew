# NelsonAppNew — Auditoría de rendimiento Etapa 4

## Cambios
- Corregida la limpieza del botón “Cargar más órdenes”: se elimina al comenzar cada renderizado, también cuando una búsqueda/filtro devuelve cero resultados.
- Añadido diagnóstico opcional sin datos personales. Abre la URL de prueba con `?perf=1` y revisa la consola: `lectura órdenes` y `render inicial` informan duración en ms y cantidades, nunca nombres, teléfonos, órdenes ni fotos.
- Versión incrementada a v3.5.9 para renovar la caché de la app de prueba.

## Cómo usar el diagnóstico
1. Publica este ZIP únicamente en una rama de pruebas, no en `main`.
2. Abre la URL de prueba con `?perf=1`.
3. Reproduce el bloqueo al abrir Órdenes, Caja, Inventario y fotos.
4. En Chrome de escritorio, abre DevTools > Console y registra los mensajes `[NelsonApp perf]`. Si solo puedes probar en el celular, informa el módulo y el tiempo aproximado hasta el bloqueo.

## Límites y seguridad
- El diagnóstico mide el listado de órdenes; todavía no mide consultas de Caja/Inventario ni decodificado de imágenes.
- El cursor de IndexedDB sigue deserializando cada registro completo; el resumen reduce la retención acumulada de imágenes y el DOM, pero no elimina el coste de leer registros con base64. Separar fotos de los registros requiere una migración y pruebas específicas; no se hace aquí.
- No se ejecutaron pruebas de navegador con la copia real. No se modifica `main` ni se importan/escriben datos reales.
