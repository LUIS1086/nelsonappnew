# Seguimiento del cliente en vivo (v3.9.0)

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
- Eliminar una orden borra su seguimiento. Las entregadas se limpian solas a los 90 días (o a la garantía + 30 días, si la garantía es más larga).

## Seguridad
- Las tablas no se pueden leer ni escribir directamente (RLS sin políticas).
- La página solo llama a `seg_obtener(token)`: token aleatorio de 144 bits, devuelve una orden, nada más.
- La app escribe con `seg_upsert` / `seg_eliminar`, que exigen tu clave secreta (guardada con SHA-256).
- Puedes ocultar valor y fotos en Configuración → «Qué ve el cliente».

## Archivos
`seguimiento.html` (página del cliente) · `js/modules/40-seguimiento.js` · `css/22-seguimiento.css` ·
`js/seguimiento-config.js` · `supabase/seguimiento.sql` · ganchos en `put()/del()` (core/02), `saveOrder`, `buildWhatsappMsg`.

## Aprobar el presupuesto desde el enlace (v3.9.0)
Usa el estado de presupuesto que la app ya tenía (⏳ Pendiente · 📤 Enviado · ✅ Aprobado · ❌ Rechazado):
1. Pon el **valor** de la reparación y marca el presupuesto como **📤 Enviado** (o usa el aviso de WhatsApp «presupuesto», que ya lleva el enlace).
2. El cliente abre su enlace y ve el **valor** con los botones **✅ Aprobar** / **No, gracias** (pide confirmación; no puede cambiar la respuesta después).
3. Tu app lo detecta sola (al abrirla, cada minuto con la app abierta y al volver internet): la orden pasa a ✅ Aprobado / ❌ Rechazado, aparece un aviso y vibra. Tras responder, el cliente ve «Avisar al taller por WhatsApp» con el mensaje listo.
- Solo se puede responder mientras el equipo esté «Recibido» o «En revisión» y haya valor. Si cambias el valor mientras está «Enviado», el cliente ve el nuevo.
- Para pedir una nueva aprobación (presupuesto revisado) vuelve a marcar «Enviado».
- Aunque ocultes «Mostrar el valor y el saldo», el valor del presupuesto siempre se muestra, porque es lo que se aprueba.

## Restaurar respaldos
Mientras importas un respaldo (o restauras desde Drive) la publicación queda en pausa. Después, cada orden se publica sola
cuando la tocas, le envías el enlace o pulsas «Publicar las órdenes activas ahora». Las entregadas hace más de 60 días no se publican.

## Actualizar el SQL (desde la v1)
Pega de nuevo `supabase/seguimiento.sql` completo en el SQL Editor: es repetible y conserva tus datos y tu clave.
