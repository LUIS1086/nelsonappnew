# NelsonAppNew — Auditoría de rendimiento Etapa 5

## Objetivo
Obtener evidencia sobre los bloqueos al trabajar con 500–2.000 órdenes y muchas fotografías, sin escribir ni transformar datos de la aplicación.

## Cambios de esta etapa
- Se agregó `js/core/00-diagnostico-rendimiento.js`, desactivado por defecto y activado solo cuando la URL incluye `?perf=1`.
- Registra tareas largas del hilo principal, tiempos de recursos de imagen sin mostrar URLs, eventos de segundo plano/primer plano, memoria JS aproximada cuando el navegador la expone y errores globales resumidos.
- Incrementa la versión a `v3.6.0` para renovar la caché de prueba.
- El diagnóstico no guarda datos en IndexedDB, no transmite telemetría y no registra nombres, teléfonos, IDs de órdenes ni contenido/URL de imágenes.

## Prueba
1. Desplegar exclusivamente en una rama/Preview de Vercel.
2. Abrir la Preview con `?perf=1`.
3. Reproducir el bloqueo al abrir Órdenes, Caja, Inventario, buscar y abrir fotos; salir a otra app y volver.
4. En Chrome de escritorio, abrir DevTools > Console y copiar solo las líneas que empiezan por `[NelsonApp perf]`. Ocultar cualquier dato personal que aparezca en otros mensajes.
5. Si no se dispone de DevTools, anotar qué módulo se bloqueó y si el navegador se recuperó o hubo que recargar.

## Interpretación
- `tarea larga` con duración alta: trabajo de JavaScript/renderizado que bloquea la interfaz.
- `carga lenta de imágenes`: recursos de imagen con duración de al menos 250 ms; no informa la URL.
- `memoria JS aproximada`: dato opcional, disponible solo en algunos navegadores Chromium.
- `lectura órdenes` y `render inicial`: mensajes previos de la Etapa 4 que miden la lista de órdenes.

## Límites y seguridad
- La prueba real en el dispositivo y con el respaldo del usuario sigue pendiente.
- La instrumentación no demuestra por sí sola una causa raíz; las mediciones deben guiar la corrección siguiente.
- No modificar `main`, no importar datos en producción y no ejecutar migraciones sobre la base real.
