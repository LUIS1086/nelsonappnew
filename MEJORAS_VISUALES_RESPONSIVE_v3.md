# NelsonAppNew — mejoras visuales responsive v3

## Objetivo
Mejorar la presentación visual y la adaptación a móvil, tablet y escritorio sin reescribir la lógica de negocio ni eliminar módulos existentes.

## Cambios
- Nueva capa `css/18-visual-premium-responsive.css` cargada al final para armonizar superficies, sombras, bordes, interacciones y espaciados.
- Ajustes específicos para móvil pequeño, móvil estándar, tablet y escritorio ancho.
- Navegación inferior con consideración de `safe-area` en iPhone.
- Mejor contención de tablas/listados anchos y controles dentro del viewport.
- Mejora visual del modo claro para tarjetas y navegación inferior.
- Actualización de caché del service worker a `nelsonapp-v3.4.7`.

## Alcance de validación
Esta entrega ha de verificarse en navegador real con tamaños representativos (320, 375, 390, 768, 1024 y 1440 px). La validación estática no sustituye la prueba de flujos, cámara, OAuth, Drive o Gemini. No se afirma que esas integraciones hayan sido probadas en esta revisión.
