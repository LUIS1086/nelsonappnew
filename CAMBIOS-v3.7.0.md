# NelsonAppNew v3.7.0 — estilo iOS profesional + fluidez

Base: v3.6.2. Solo presentación: no cambia estructura, IDs, eventos ni lógica.

## Nuevo: `css/24-ios-fluidez.css` (se carga la última)
- **Paleta iOS oscura**: fondo negro, tarjetas `#1c1c1e`, campos con relleno gris del sistema, separadores finos de 0,5 px.
- **Tipografía del sistema** (`-apple-system` / SF en iPhone; Inter o Roboto en otros) y pesos semibold en lugar de "black".
- **Cabecera y barra inferior** translúcidas; pestaña activa teñida (sin brillos ni resplandores).
- **Tarjetas y acciones rápidas planas**: sin gradientes, sombras pesadas ni resplandor de color en las órdenes.
- **Ventanas como hojas de iOS**: curva de resorte; en móvil quedan ancladas abajo (antes la hoja se centraba verticalmente).
- **Fluidez**: desenfoque (`backdrop-filter`) solo en cabecera y barra inferior; fondo de ventanas sin desenfoque; sin animaciones infinitas en avisos de listas; Google Fonts ya no bloquea el primer pintado.

## Cómo volver atrás
Quita la línea `<link rel="stylesheet" href="css/24-ios-fluidez.css">` de `index.html` y la app queda como en v3.6.2.

## Pendiente
- `dashboard.html` aún no usa esta capa.
- Algunos paneles (Panel de hoy, cabecera de Nueva recepción) conservan fondos con degradado.
- Probar en un iPhone y un Android reales; las capturas se hicieron en un navegador de escritorio con tamaño de iPhone.
