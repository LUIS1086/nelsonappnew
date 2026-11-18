# v3.9.1 — Tema claro / oscuro real + toque premium

## Qué estaba mal
El modo claro estaba **desactivado a propósito** en `js/modules/04-tema-notificaciones-alertas.js`
(`toggleTheme()` forzaba oscuro) y, aun activándolo, las capas `24-ios-fluidez` y `25-visual-refresh`
pintaban todo con colores oscuros fijos, así que solo cambiaban la barra y algunos campos.

## Qué se hizo
- **Nueva hoja `css/30-tema-claro-oscuro.css`** (última del bundle): redefine las variables `--nn-*`, `--ios-*`
  y `--bg-*` para claro y corrige cabecera, barra inferior, tarjetas, campos, textos Tailwind, estilos en línea,
  hoja de Configuración, Drive, Nelson IA, Menú de Datos. El oscuro **no cambia**.
- **Tema en 3 modos** (Configuración → Apariencia → Tema): Claro · Oscuro · Sistema. Por defecto sigue Oscuro.
  El "Tema automático por horas" que ya existía sigue funcionando.
- `<html data-theme>` + `body.light-mode/dark-mode` sincronizados; script en `<head>` que evita el destello al abrir.
- `theme-color` y `color-scheme` se actualizan (barra de estado del teléfono).
- Transición suave al cambiar de tema; anillo de foco unificado; sombras de tarjeta suaves en claro.
- `dashboard.html` entiende el modo "Sistema" y comparte la preferencia.
- Versión → v3.9.1. `node tools/verificar.js` → todo en orden.

## Revisado también en claro (segunda pasada)
Control de Caja, Estadísticas, Exportar, Garantías, Proveedores y Nelson IA (configuración de la llave).

## Pendiente / a revisar en tu teléfono
Ticket de venta, chat de Nelson IA con mensajes, modales de órdenes/entrega y el dashboard en claro.
Si algo queda oscuro, dime la pantalla y se agrega al final de la hoja 30.

## v3.9.1 — arreglos tras prueba en teléfono
- Filas del Menú de Datos que se quedaban **negras al hacer scroll**: el efecto de pulsado lo hacía JS con `#111827`
  y no se quitaba si el dedo arrastraba. Se eliminaron 24 handlers `ontouchstart/ontouchend` de `index.html` y el
  pulsado ahora es CSS (`:active`).
- **Notificaciones (toasts)** en claro: fondo blanco, texto oscuro y borde de color según el tipo.
- Fichas de iconos del Menú de Datos con fondo gris suave para que no "floten".
