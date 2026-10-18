# Seguimiento del cliente en vivo (v3.8.0)

El cliente escanea un QR (o abre el enlace que le llega por WhatsApp) y ve **en vivo** el estado de su equipo:
línea de tiempo (Recibido → En revisión → Listo → Entregado), foto del equipo, valor/saldo, fecha estimada,
garantía y un botón de WhatsApp al taller. No instala nada y no ve teléfono ni cédula (solo su primer nombre).

## Puesta en marcha (una sola vez, ~5 minutos)
1. **Supabase → SQL Editor:** pega todo `supabase/seguimiento.sql` y pulsa Run.
2. **`js/seguimiento-config.js`:** escribe `url` («Project URL») y `key` («Publishable key» `sb_publishable_…` o «anon»).
   Son datos públicos. **Nunca** pongas ahí la `service_role`. Sube el cambio a Vercel.
3. **En la app → Configuración → Seguimiento del cliente:**
   - «🎲 Generar» una clave secreta → «📋 Copiar SQL de la clave» → pégalo en el SQL Editor de Supabase y Run.
   - «🔌 Probar conexión» debe decir ✅ Todo listo.
   - «🔄 Publicar las órdenes activas ahora» para las órdenes que ya tenías.

## Uso diario
- Al registrar una orden aparece «¿Enviar el seguimiento al cliente?» → **Enviar / QR**.
- En cada orden, botón **🔗**: QR, enlace, enviar por WhatsApp, copiar, **🖨️ hoja con QR** para entregar al cliente.
- Cada cambio de estado se publica solo. Los avisos de WhatsApp (recibido, revisión, presupuesto, listo, retraso)
  ya llevan el enlace. Sin internet: queda en cola y se publica al volver la conexión.
- Eliminar una orden borra su seguimiento. Las entregadas se limpian solas a los 90 días.

## Seguridad
- Las tablas no se pueden leer ni escribir directamente (RLS sin políticas).
- La página solo llama a `seg_obtener(token)`: token aleatorio de 144 bits, devuelve una orden, nada más.
- La app escribe con `seg_upsert` / `seg_eliminar`, que exigen tu clave secreta (guardada con SHA-256).
- Puedes ocultar valor y fotos en Configuración → «Qué ve el cliente».

## Archivos
`seguimiento.html` (página del cliente) · `js/modules/40-seguimiento.js` · `css/22-seguimiento.css` ·
`js/seguimiento-config.js` · `supabase/seguimiento.sql` · ganchos en `put()/del()` (core/02), `saveOrder`, `buildWhatsappMsg`.

## Fase 2 (pendiente)
Botón «Aprobar presupuesto» en la página del cliente, con aviso a la app.
