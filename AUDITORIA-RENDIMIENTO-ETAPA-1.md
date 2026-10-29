# Auditoría de rendimiento — Etapa 1

## Alcance y restricciones
- Basada en el ZIP de NelsonAppNew recibido el 27-10-2026.
- Cambios aislados para probar; no se publicó nada en GitHub/Vercel y no se modificaron datos reales.
- No se cambió la lógica comercial de órdenes, inventario, caja ni clientes.

## Hallazgo prioritario confirmado por inspección estática
El service worker usaba `fetch(req)` sin límite de espera para navegaciones HTML. En una conexión móvil intermitente, una petición puede quedarse pendiente sin llegar a `catch`; en ese caso, la app no utiliza su copia en caché y la navegación parece congelada. Esto encaja con la demora al volver a abrir una página, aunque no demuestra que sea la única causa de todos los bloqueos.

## Corrección aplicada
- La navegación HTML espera como máximo 3,5 segundos antes de intentar responder con la página guardada en caché.
- Conserva la búsqueda de rutas `cleanUrls` (`/ruta` y `/ruta.html`) y el respaldo a `index.html`.
- Si la red responde antes, se utiliza la respuesta de red y se guarda una copia.
- Se incrementó la versión a `v3.5.6` para que el service worker genere una caché nueva.

## Riesgos adicionales a investigar
1. `index.html` carga de forma síncrona una larga cadena de módulos JS; el arranque realiza operaciones IndexedDB y renderizado antes de terminar.
2. `js/modules/38-native-feel.js` registra un `MutationObserver` sobre `document.body` para todos los cambios de clase del subárbol. Si hay muchas mutaciones, puede añadir trabajo de CPU.
3. Hay temporizadores recurrentes en varios módulos. La mayoría comprueba visibilidad, pero conviene verificar que no se inicialicen más de una vez al reanudar.
4. Fuentes y recursos de terceros pueden aumentar el tiempo de renderizado cuando la conexión es débil.

## Verificación realizada
- Se revisó el bloque original del service worker y se confirmó que las navegaciones no tenían timeout.
- La corrección no toca bases de datos ni funciones comerciales.
- Pendiente: ejecutar pruebas en navegador móvil real, con conexión estable y lenta, probar regresar desde otra pestaña y comprobar órdenes, caja, inventario, exportación y autenticación. La validación estática no garantiza que el bloqueo quede totalmente resuelto.

## Prueba recomendada
Desplegar este ZIP únicamente en la rama de pruebas. Una vez publicado, abrir la app, navegar entre módulos, cambiar a otra pestaña durante 10–20 segundos y volver; repetir con red lenta. Verificar en configuración que se sirve `v3.5.6`. No borrar los datos del navegador ni las bases de datos como parte de esta prueba.
