# Plan de sincronización entre sucursales y técnicos (NO implementado aún)

Hoy cada dispositivo guarda sus datos en IndexedDB. Sincronizar 3 sucursales y varios técnicos exige decisiones que conviene tomar antes de escribir código.

## Fase 1 — lo mínimo útil (recomendada)
- Sincronizar solo **órdenes** y **clientes** (lo que comparten técnicos y sucursales).
- Cada registro lleva `updated_at` y `device_id`; el conflicto se resuelve por "gana la última modificación".
- Los borrados se guardan como `deleted_at` (para que otro dispositivo sepa que se eliminó).
- Tabla en Supabase por tipo de dato, con RLS y una clave por negocio (igual que `seguimiento`).
- Funciona sin internet: los cambios se encolan y suben al volver la conexión.

## Fase 2
Inventario (con cuidado: dos ventas simultáneas del mismo repuesto → usar movimientos de stock, no el número final), ventas y caja por sucursal.

## Fase 3
Usuarios/roles por técnico y reportes consolidados de las 3 sucursales.

## Decisiones que necesito de ti
1. ¿Inventario separado por sucursal o compartido?
2. ¿Cada técnico ve todas las órdenes o solo las suyas?
3. ¿Todas las sucursales usan el mismo PIN o uno por usuario?
