# NelsonAppNew — Etapa 1 de UI premium

## Qué cambia
- Nueva capa `css/23-premium-polish.css` cargada al final de los estilos de `index.html`.
- Refinamientos visuales del Command Center en `css/dashboard-premium.css`.
- Estados de foco accesibles, transiciones discretas, consistencia de bordes/superficies y soporte para `prefers-reduced-motion`.
- El nuevo CSS queda incluido en el precaché del service worker.
- Versión de caché actualizada a `nelsonapp-v3.11.0` para que la PWA recoja los estilos nuevos.

## Qué se preserva
No se modificaron módulos JavaScript, identificadores HTML, eventos, estructuras de datos, lógica de órdenes, ventas, caja, inventario, cámara, Google OAuth, Drive, exportaciones ni configuración de servicios.

## Verificación
Ejecutar desde la raíz:
```bash
node tools/verificar.js
```
Esta etapa es un refinamiento visual de bajo riesgo; el verificador estático no sustituye pruebas manuales de login, cámara, operaciones, exportaciones y PWA en dispositivos reales.
