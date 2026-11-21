# v3.9.20 — Control de caja bien acomodado
- **Monto grande que se salía de la tarjeta:** ahora se achica solo lo necesario para que quepa completo (también en la confirmación de cierre) y no se parte en dos líneas.
- **Botón «Cerrar caja ($0)»:** decía siempre $0; ahora muestra el monto real de la caja (ej. «CERRAR CAJA (COP 182.000)»), con signo menos si es negativo.
- **«Invalid Date» en el historial diario:** el registro (orden entregada, venta o gasto) sin fecha válida ahora aparece como «Sin fecha (revisar registro)» en el último lugar de la lista, en vez de «Invalid Date». No se oculta ni se cambia ningún dato.
- **Moneda con espacio:** «COP182.000» ahora se ve «COP 182.000» (solo en esta ventana; si la moneda es un símbolo como $ queda igual).
- **Que quepa en pantalla:** la ventana ahora tiene el encabezado fijo y el contenido con su propio desplazamiento; el botón de cierre siempre se alcanza y el historial es más corto en pantallas pequeñas.
- `tools/humo.js` comprueba el botón con el monto real y que no aparezca «Invalid Date».
