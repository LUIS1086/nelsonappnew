# NelsonAppNew — Configuración avanzada Premium

## Cambios de esta iteración
- Se añadió una navegación horizontal por categorías con estilo de ajustes de un dispositivo premium.
- Categorías disponibles: Todo, Apariencia, Negocio, Sistema, Comunicación, Metas, Operación y Datos.
- La navegación por categoría se combina con el buscador existente para localizar opciones sin recorrer toda la pantalla.
- Se refinó el contraste, la jerarquía visual, los estados activos, los focos de teclado y las transiciones de filas y controles.
- Se mantuvieron los identificadores, campos, botones y funciones existentes de configuración; el filtro únicamente oculta temporalmente grupos y filas.
- Se corrigió el texto de versión de créditos para que coincida con v3.8.0.

## Alcance y preservación
No se modificaron las funciones de órdenes, autenticación, almacenamiento, inventario, caja, Google Drive, Gemini, respaldo/restauración ni los datos de usuario. No se ejecutó ninguna operación de borrado ni migración de datos.

## Verificación
- `node --check` aplicado a los módulos de configuración modificados.
- `tools/verificar.js` ejecutado para comprobar coherencia de versión.
- La prueba estática no sustituye una prueba visual y funcional en navegador real; debe probarse en una rama de preview antes de publicar.
