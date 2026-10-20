# Respaldo completo en Supabase (v3.10.0)

Segunda copia de TODOS los datos, además de Drive. Usa la misma URL, clave pública y **clave secreta** del Seguimiento del cliente.

## Qué guarda
- Las 10 tablas: órdenes, ventas, inventario, gastos, clientes, pagos, calificaciones, historial de stock, chat de órdenes y planes de pago.
- Las **fotos** de ingreso y de entrega. Cada foto se sube **una sola vez** (huella SHA-256): los respaldos siguientes solo suben las nuevas.
- Se conservan los **últimos 30 respaldos** (cada uno ~0,4 MB de datos); las fotos que ya ningún respaldo usa se borran solas.
- Con tu copia real (462 órdenes, 1.382 fotos) ocupa ~83 MB de fotos + 0,4 MB por respaldo: cabe de sobra en el plan gratuito (500 MB).

## Puesta en marcha
1. Supabase → SQL Editor: ejecuta `supabase/respaldo.sql` (después de `supabase/seguimiento.sql`). Es repetible.
2. App → Configuración → **☁️ Respaldo en Supabase** → **Respaldar ahora**. El primero sube todas las fotos (varios minutos con buena señal; si se corta, el siguiente continúa donde quedó).

## Uso
- **Automático:** una vez al día al abrir la app, y cada vez que se hace un respaldo en Drive. Se puede apagar en esa pantalla.
- **Restaurar:** 🕘 Restaurar → elige fecha → confirma. Las fotos se descargan primero; solo si todo bajó bien se reemplazan los datos locales. La app se recarga al terminar.
- Mientras se restaura, la publicación del seguimiento queda en pausa.

## Seguridad
- Las tablas no se pueden leer ni escribir directamente (RLS sin políticas). Todo pasa por funciones que exigen tu clave secreta.
- El respaldo contiene datos de clientes: no compartas la clave secreta ni la `service_role`.
- Supabase gratuito pausa el proyecto tras 7 días sin actividad: abrir la app con frecuencia lo mantiene activo.
