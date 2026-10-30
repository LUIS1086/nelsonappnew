# NelsonAppNew v3.8.0 — listas desplegables, iconos y escritorio

Base: v3.7.1. Solo presentación.

## Listas desplegables (`<select>`)
- Chrome/Edge 135+ (escritorio y Android): lista propia con esquinas redondeadas, marca ✓ en la opción elegida, letra legible y animación suave.
- iPhone/Safari y navegadores anteriores: se conserva la lista nativa (en iPhone es la ruleta/hoja de iOS), con letra y colores corregidos.
- En pantallas táctiles el texto del campo es de 16 px para que el iPhone no haga zoom al tocarlo.

## Iconos (`js/modules/42-ios-iconos.js`)
- Menú lateral: fichas de color con símbolo blanco (como Ajustes de iOS).
- Barra superior, acciones rápidas, etiquetas y encabezados del formulario, botón de micrófono y atajos: iconos SVG de un solo estilo, iguales en iPhone, Android y Windows.
- Si un icono falla, queda el emoji original. Los emoji dentro de las opciones de las listas se conservan.

## Escritorio y adaptación a pantallas
- Menú lateral y barra superior estilo iOS (translúcida, línea fina, elemento activo teñido).
- Entre 1024 y 1360 px se ocultan primero los contadores de la barra superior; bajo 1180 px, los atajos de teclado. Los botones no se cortan.
- Probado sin desbordes horizontales en 360, 390, 820, 1024, 1280, 1480 y 1920 px.
- Se quitaron los círculos decorativos de degradado (ahorran pintado).

## Volver atrás
Quita el `<script>` de `42-ios-iconos.js` en `index.html` para volver a los emoji, y/o el `<link>` de `css/24-ios-fluidez.css` para volver al diseño anterior.

## Pendiente
- Los emoji dentro de tarjetas de órdenes, inventario y mensajes generados siguen siendo emoji.
- Probar en iPhone y Android reales.
