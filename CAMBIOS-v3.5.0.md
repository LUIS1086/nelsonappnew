# Nelson App Pro · Correcciones v3.5.0

Paquete de correcciones sobre la versión publicada (v3.4.3). Sustituye los archivos
manteniendo la misma estructura de carpetas. No hay cambios de base de datos:
IndexedDB sigue en la versión 15 y los respaldos anteriores se pueden importar.

---

## 1. PIN de 5 y 6 dígitos (crítico)

**Antes:** el teclado verificaba automáticamente al llegar a 4 dígitos. Si el PIN era de
5 o 6, fallaba, borraba lo escrito y gastaba un intento: era imposible entrar.

**Ahora:**
- Se guarda la longitud del PIN (`appPinLen`) al crearlo o cambiarlo.
- El teclado verifica al llegar a esa longitud exacta (4, 5 o 6).
- Los puntos crecen de 4 a 6 según se escribe.
- El botón OK se habilita solo con la longitud correcta.

> Si ya tenías un PIN de 5-6 dígitos y quedaste bloqueado con la versión anterior,
> esta actualización no puede adivinar la longitud (el hash no la guarda). Cambia el PIN
> desde Configuración después de entrar con huella, o reinstala y crea uno nuevo.

## 2. Caja única y coherente (crítico)

**Antes:** la app y el dashboard calculaban distinto. El dashboard sumaba *todas* las
ventas (incluidos adelantos y cobros de entrega) además del valor de la orden entregada:
contaba doble. Y los abonos de cartera no entraban a la caja en ningún lado.

**Ahora la caja es efectivo real, en toda la app:**

```
Caja = ventas directas + adelantos + cobros al entregar + abonos de cartera − gastos
```

- El valor total de una orden entregada **no** se suma aparte: ya está representado por
  su adelanto y su cobro. Así no se cuenta doble.
- Los abonos de cartera (`recordPayment`) ahora sí entran y refrescan la caja.
- El dashboard, el modal de caja, el historial de movimientos y el ticket de movimientos
  usan la misma fórmula (`getCajaResumen()` en `js/core/01-base-globales.js`).
- Los reportes de **facturación/ingresos** siguen siendo devengados (orden entregada +
  ventas directas), pero ya no suman adelantos ni cobros: antes también estaban inflados.

> **Importante:** al abrir la versión nueva, la “Caja Neta” puede bajar porque ahora
> refleja el dinero realmente cobrado. Haz un **Cierre de caja** una vez después de
> actualizar para empezar el período limpio y compara con el efectivo físico.

## 3. El dashboard ya pide PIN (crítico)

`/dashboard` leía la misma IndexedDB sin autenticación: cualquiera con el teléfono podía
ver caja, órdenes y deudas sin PIN.

- Ahora muestra una pantalla de PIN y valida contra `appPinHash` (PBKDF2).
- La desbloquea durante 15 minutos por sesión.
- Si el PIN aún no existe, redirige a la app para crearlo.
- Al bloquearse la app por inactividad también se invalida el dashboard.

> Sigue siendo una protección local (como el PIN de la app), no cifrado de datos.

## 4. Badge de stock bajo

`js/modules/16-panel-escritorio.js` usaba `s.cant`, un campo que no existe (el canónico es
`s.q`). El resultado: todos los productos aparecían como stock bajo. Corregido.

## 5. Fechas locales (Colombia)

Varios cálculos usaban `toISOString()`, que en Bogotá después de las 7 p.m. devuelve el
día siguiente. Se reemplazaron por `hoyYMD()` (fecha local) en:

- KPI “Órdenes hoy” del escritorio.
- Recordatorio de equipos sin recoger.
- Tour, calendario, nombres de archivos de exportación e informe de la IA.

## 6. Respaldo completo

Antes el respaldo (manual, Drive y Supabase) no incluía proveedores ni configuración, y
los ajustes del negocio quedaban solo en el teléfono.

Ahora incluye:
- Tabla `proveedores`.
- Tabla `config` (contador de órdenes).
- Objeto `ajustes` con: datos del negocio, logo, configuración de documentos, plantillas
  de WhatsApp, técnicos, moneda, formato de fecha, metas, umbral de stock, garantía, etc.

Al restaurar:
- El contador de órdenes se coloca en el máximo entre el respaldo y la orden más alta
  restaurada (nunca repite números).
- Los respaldos viejos (sin proveedores/config) **no** borran los proveedores actuales.
- `js/15-...`, `js/07-...`, `js/14-...` y `js/41-...` quedaron alineados.

## 7. Exportación: plan B sin JSON gigante

El fallback de exportación metía el respaldo completo dentro de un `onclick`. Con fotos,
el HTML pesaba decenas de MB y el botón podía no funcionar. Ahora el JSON vive en memoria
y los botones lo leen de ahí.

## 8. Nombres con apóstrofo

Un cliente como `O'NEILL` rompía el botón “Historial” porque el `&#39;` se decodificaba
antes de ejecutar el JS. Ahora el nombre viaja en `data-nombre` y se pasa con
`this.dataset.nombre`.

## 9. Cartera: abonos mayores a la deuda

Antes se recortaban a cero y el excedente se perdía en silencio. Ahora se rechaza el pago
con un aviso que muestra la deuda actual.

## 10. Órdenes duplicadas por doble toque

`saveOrder()` no tenía guardia: dos toques rápidos creaban dos órdenes. Se agregó un
bloqueo de 1,2 s (la venta con comprobante ya tenía su propia guardia).

## 11. Nelson IA: estados correctos

El prompt enumeraba estados inexistentes (`diagnostico`, `presupuesto`, `reparando`,
`listo`). Ahora usa los reales: `recibido`, `revisión`, `reparado`, `entregado`,
`no-reparable`.

## 12. Limpieza

- `APP_VERSION` y `CACHE_VERSION` quedaron en **v3.5.0** (antes v3.4.3 vs v3.10.0).
- Se eliminó `jspdf.umd.min.js` de la raíz: era un duplicado de 357 KB que no se usaba
  (la copia buena está en `js/libs/`).

---

## Cómo probar (10 minutos)

1. Abre la app con la versión anterior y anota la “Caja Neta” actual.
2. Reemplaza los archivos y sube a Vercel.
3. Cierra la PWA por completo y vuelve a abrirla (o borra caché del sitio).
4. Entra con tu PIN. Si es de 4 dígitos debe seguir entrando solo; si es de 5-6, ahora sí.
5. Revisa Configuración → Seguridad:
   - Cambia el PIN a 6 dígitos, cierra la app, vuelve a entrar (debe funcionar).
   - Vuelve a dejarlo en 4 si prefieres.
6. Abre `/dashboard` en una pestaña nueva: debe pedir PIN.
7. Haz un **Cierre de caja** y compara el neto con el efectivo del cajón.
8. Registra un abono en Cartera: debe aparecer en Movimientos y en la Caja.
9. En Inventario, revisa que el badge de stock bajo ya no cuente todo.
10. Exporta un respaldo y verifica que el JSON incluya `proveedores`, `config` y `ajustes`.
11. Importa ese mismo respaldo en un navegador limpio (o revisa que pida confirmación y
    recargue sin errores).
12. Crea una orden con doble toque en Guardar: debe crear una sola.

## Archivos modificados

```
js/core/01-base-globales.js
js/core/03-auth-pin-biometria.js
js/modules/04-tema-notificaciones-alertas.js
js/modules/05-cartera-clientes.js
js/modules/07-backup-drive-progreso.js
js/modules/08-ordenes-formulario-camara.js
js/modules/09-ordenes-crud-busqueda.js
js/modules/11-fotos-gastos.js
js/modules/13-ventas-precios-caja.js
js/modules/14-garantias-estadisticas-filtros.js
js/modules/15-exportar-importar-navegacion.js
js/modules/16-panel-escritorio.js
js/modules/19-diagnostico-comparar-accesibilidad.js
js/modules/21-config-acciones-seguridad.js
js/modules/22-movimientos-ticket.js
js/modules/26-tour-guia.js
js/modules/32-chat-calendario-planes.js
js/modules/35-exportacion-pdf-csv-excel.js
js/modules/41-respaldo-supabase.js
js/dashboard.js
js/nelson-ia.js
service-worker.js
jspdf.umd.min.js (eliminado)
```

## Validación hecha

- `node --check` sobre todos los JS de la app: correcto.
- Verificación de referencias CSS/JS, precache e iconos del manifest: 0 errores.
- Pruebas unitarias de las funciones nuevas de caja y fechas: 12/12 correctas.
- **No** se ejecutó una prueba completa en navegador/Android desde este entorno; sigue la
  lista de arriba antes de publicar.

## Rollback

Guarda una copia de la carpeta actual antes de reemplazar. Para volver atrás, restaura los
archivos anteriores y sube `CACHE_VERSION` en `service-worker.js` (por ejemplo
`nelsonapp-v3.5.1-rollback`) para que los teléfonos tomen el cambio.
