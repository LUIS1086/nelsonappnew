# v3.9.7 — Caja, Nueva venta y comprobante profesional
**Comprobante (vista previa, imagen y PDF)** — js/modules/39-ticket-venta.js, css/35-comprobante-venta.css
- Diseño nuevo: encabezado con negocio y número, bloque Cliente / Método de pago, tabla (Descripción · Cant. · Precio · Total), total destacado, observaciones y pie.
- Letra normal (ya no máquina de escribir): se acabaron los espacios raros.
- Imagen PNG: se captura a 600 px, nítida y recortada al contenido.
- PDF: texto real (vectorial), hoja A5 (hasta 6 productos) o A4 (más), con paginación.
- Imprimir en rollo de 80 mm se mantiene como antes.
**Caja** — index.html (#view-ventas), js/modules/11-fotos-gastos.js, css/36-caja-venta.css
- Arriba: Caja actual (neto) con Ingresos y Gastos. Botón grande "Nueva venta". "Registrar gasto" plegable.
- Movimientos primero (antes de Cartera e Inventario): filas limpias, cifras sin cortarse, íconos de línea.
**Nueva venta** — index.html (#invoice-sale-modal)
- Secciones: Agregar producto · Detalle de la venta · Datos del cliente (plegable, opcional) · Pago.
- Total y botones fijos abajo. Todos los ids y funciones se conservan.
Probado: venta real de 2 productos (stock baja, caja = resumen = $79.000), PDF e imagen, sin errores JS. Incluye v3.9.3–v3.9.6.
