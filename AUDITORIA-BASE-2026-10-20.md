# NelsonAppNew — Auditoría técnica base

Fecha: 2026-10-20  
Paquete revisado: `nelsonappnew-main.zip` aportado en la conversación.

## Resultado ejecutivo

La revisión estática de esta copia no encontró errores de sintaxis en los archivos JavaScript propios, referencias locales ausentes en `index.html`, `dashboard.html` y `seguimiento.html`, ni identificadores HTML duplicados en esas tres páginas. El verificador del proyecto también pasó.

Esto **no certifica** todos los flujos en navegador real: OAuth, cámara, exportaciones, permisos, almacenamiento, Drive, Gemini y Supabase necesitan pruebas funcionales en el entorno desplegado con las credenciales y permisos correspondientes.

## Corrección aplicada

- Se incorporó `seguimiento.html` al precaché del service worker para que la página de seguimiento también esté disponible cuando la PWA ya haya instalado sus recursos y se encuentre sin conexión.
- Se incrementó `CACHE_VERSION` de `nelsonapp-v3.5.0` a `nelsonapp-v3.5.1`, para que los dispositivos creen una caché nueva al actualizar.
- No se alteró la lógica de órdenes, ventas, inventario, caja, cámara, autenticación, Drive ni Gemini.

## Comprobaciones realizadas

- `node tools/verificar.js`: correcto.
- `node --check` sobre los JavaScript propios de `js/` (excluyendo bibliotecas minificadas): correcto.
- Análisis de `index.html`, `dashboard.html` y `seguimiento.html`: sin IDs duplicados ni referencias locales ausentes detectadas.
- `manifest.json`: JSON válido y archivos de iconos presentes según el verificador.
- Búsqueda de patrones evidentes de claves API en archivos propios: no se encontraron claves literales con el patrón revisado. Esto no sustituye una revisión de secretos en historial Git ni de credenciales guardadas por el usuario.

## Hallazgos y riesgos que requieren la siguiente fase

1. **Marca fija en la instalación PWA.** `manifest.json` todavía tiene el nombre `Nelson App Pro · Taller & Repuestos`, `short_name` `NelsonApp`, colores e iconos estáticos. Cambiar solo el nombre comercial dentro de la interfaz no cambiará por sí solo el nombre/icono instalado en todos los dispositivos. Para marca blanca hay que definir cómo generar manifiesto e iconos por cliente.
2. **Datos locales y multiempresa.** El código usa almacenamiento del navegador en varios flujos. No debe considerarse aislamiento multiempresa seguro solo por separar nombres o pantallas. Antes de ofrecer una plataforma compartida se necesita autenticación del servidor, autorización por negocio y políticas de acceso a datos (por ejemplo, RLS bien configurado en Supabase).
3. **Política CSP.** `vercel.json` permite `'unsafe-inline'` en scripts y estilos. Es compatible con el diseño actual basado en scripts inline, pero reduce la protección frente a ciertas inyecciones. Una mejora debe hacerse gradualmente para no romper los `onclick` ni los estilos existentes.
4. **Pruebas de regresión aún pendientes.** Se deben ejecutar con datos de prueba: crear/editar/cancelar orden; inventario y venta; entradas/salidas/cierre de caja; importación y exportación CSV/XLSX/PDF; copia y restauración; cámara; OAuth/Drive; Gemini; seguimiento/Supabase; permisos y actualización/offline de la PWA.
5. **Rendimiento y accesibilidad.** La comprobación estática no mide Core Web Vitals, fluidez de transiciones, contraste real, navegación por teclado ni consumo de memoria en el teléfono. Se necesita una prueba de navegador y dispositivo.

## Estrategia comercial recomendada

- **Etapa A — instalación independiente:** configuración de marca por cliente, datos separados, exportación/backup y un proceso de actualización controlado.
- **Etapa B — plataforma multiempresa:** cuentas, roles, tenant ID y reglas de acceso verificadas en servidor; nunca confiar en una restricción únicamente visual o en un PIN guardado en `localStorage`.
- El panel privado de propietario se implementará después de completar las pruebas funcionales prioritarias. La autorización deberá validarse fuera del cliente si controla licencias, usuarios o datos de otros negocios.

## Límite de esta entrega

Esta entrega es una auditoría estática y una corrección acotada de disponibilidad offline. No se afirma que se hayan completado pruebas de navegador real ni se han publicado cambios al repositorio remoto.
