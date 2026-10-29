# NelsonAppNew v3.8.0 — renovación visual

Base: v3.7.0. Cambio de presentación: no se tocan IDs, eventos, almacenamiento ni lógica de negocio.

## Nuevo: `css/25-visual-refresh.css` (se carga la última)

- **Un solo acento naranja** sobre superficies grafito planas; se eliminan los degradados de fondo, la rejilla y los resplandores de color.
- **Cabecera**: nombre del negocio en dos niveles (rótulo pequeño + nombre), caja neta en verde y cifras tabulares.
- **Barra inferior**: pestaña activa como pastilla teñida, iconos con un solo color; sin halos.
- **Tarjetas**: borde de 1 px, radio 16, títulos de sección en caja de frase con barra fina.
- **Formulario "Registrar entrada"**: cabecera propia (`Nueva recepción / Registrar entrada`), cinco bloques separados por filetes (`Cliente`, `Equipo`, `Gestión`, `Dinero`, `Notas internas`), etiquetas y ayudas reescritas, botón principal sólido.
- **Panel de hoy**: cabecera, fila de tres cifras y estado vacío "Todo al día" sin fondo degradado.
- **Órdenes**: acciones rápidas neutras, buscador sin emoji, estado vacío con llamada a la acción.
- **Caja**: tarjetas planas (antes degradados), gasto en tono rosa suave, herramientas fantasma y "Ver todo" discreto.
- **Datos**: menú de administración neutro, tarjeta de Google Drive y tarjeta de Nelson IA reconstruidas con chips que se ajustan al ancho.
- **Escritorio**: barra superior con iconos SVG, una acción primaria naranja y el resto fantasma; menú lateral plano, sin degradado en la pestaña activa.
- **Avisos (toast)**: ancho contenido, arriba de la barra inferior (abajo a la derecha en escritorio) y texto insertado con `textContent`.

## Nuevo: `css/dashboard-refresh.css` (Command Center)

- Corregido el **solapamiento de la barra superior**: el título ya no se mete debajo del buscador a 1280 px.
- Una sola acción primaria (`Nueva orden`); `Avisar`, `Reporte` y `Venta + ticket` pasan a botones fantasma.
- Fuera la rejilla de fondo, los orbes y las franjas de color de los KPI: una superficie, un acento.
- KPI con **iconos SVG** en lugar de emoji y cifras tabulares.
- Panel "Estado del taller" plano y sin resplandor.
- En móvil la barra superior vuelve a fluir en dos filas (las reglas nuevas solo aplican desde 781 px).
- El título ahora es `Command Center`; el nombre del negocio sigue en la miga de pan y en el menú.

## Ajustes de marcado (sin lógica)

- Iconos SVG en la barra superior del escritorio, en los cuatro KPI del dashboard y en el buscador.
- Etiquetas de la barra superior en caja de frase: `Nueva orden`, `Guardar orden`, `Nueva venta`.
- Se quitó el emoji del buscador de inventario y de los campos de repuesto.

## Cómo volver atrás

Quita estas dos líneas y todo queda como en v3.7.0:

```html
<link rel="stylesheet" href="css/25-visual-refresh.css">   <!-- index.html -->
<link rel="stylesheet" href="css/dashboard-refresh.css">   <!-- dashboard.html -->
```

## Notas

- `js/version.js` sube a `v3.8.0`; el service worker toma la versión de ahí, así que la caché se renueva sola.
- `service-worker.js` incluye las dos hojas nuevas en el precache.
- Verificado a 430×932 (móvil) y 1280×900 (escritorio) en Chrome. Falta probarlo en un iPhone y un Android reales.
