# NelsonAppNew v3.8.4 — Splash de inicio mejorado

## Cambios
- **Tiempo adaptativo**: antes el splash esperaba siempre 1,8 s + 0,6 s de salida. Ahora dura ~1,3 s en el primer arranque de la sesión y ~0,35 s en arranques en caliente (recarga / vuelta de la app). Con "reducir movimiento" activo, ~0,6 s.
- **Se cierra cuando la página terminó de cargar** (y pasó el tiempo mínimo), con tope de seguridad de 4 s.
- **Toque para saltar** el splash (tras el tiempo mínimo).
- **Ícono real de la app** (llaves cruzadas) en lugar del emoji 🔧, para que coincida con el ícono de la pantalla de inicio en cualquier celular.
- La barra de progreso y el desvanecimiento se sincronizan con el tiempo real (variables CSS `--splash-ms` / `--splash-fade`).
- Accesibilidad: `role="status"`, `aria-live` y etiqueta para lectores de pantalla.
- Pantallas bajas (celular en horizontal): el logo se reduce para que todo quepa.
- `manifest.json`: `background_color` ahora `#050b15` (igual al splash) para evitar el parpadeo de color entre el splash nativo del APK y el splash de la app. Para verlo en el APK hay que regenerarlo con PWABuilder.
- Versión `v3.8.4` (renueva la caché PWA). Sin cambios en datos, IDs ni lógica de negocio.

## Pendiente de probar en dispositivo real
Primer arranque, recarga, vuelta desde segundo plano, tema claro/oscuro, celular horizontal y Android (APK).
