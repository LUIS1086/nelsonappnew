# Cambios v3.7.0 — UI profesional (sistema de diseño Nelson)

> Fecha: 22 oct 2026 · Solo presentación: **ningún ID, evento, endpoint ni lógica de negocio cambió**.
> Fuente de verdad del diseño: catálogo `ui-ux-pro-max` (ver `DISENO-SISTEMA-NELSON.md`).

## 1. Qué se ve distinto

| Área | Antes | Ahora |
|---|---|---|
| Paleta | 3 paletas paralelas (tokens propios, Tailwind slate/emerald/rose, hex suelto) + crema `#f5f3ee` | Un solo sistema azul-noche: fondo `#0b1220`, tarjeta `#111b2c`, texto `#eef2f8`, muted `#8494ab`, naranja de identidad intacto |
| Modo claro | 17 textos heredados del modo oscuro (blanco 1.03:1) sobre superficies claras | Neutral frío `#f8fafc`/`#ffffff` con texto `#0f172a`/`#475569`; sin crema |
| Tipografía | ~434 textos por debajo de 12px (mínimo 7px) | Piso 11px para micro (badges, contadores) y 12px general; 0 casos por debajo |
| Cifras | Números proporcionales, columnas desalineadas | `JetBrains Mono` + `tabular-nums` en precios, cantidades, códigos y totales |
| Radios | 8 valores sueltos (13 / 13.5 / 14 / 16 / 18 / 20 / 22 / 27px) | Escala única: `8 / 10 / 14 / 18 / 22 / 999` |
| Tiles de iconos | 12 degradados saturados distintos + glow de color | Pastilla neutra translúcida con borde 1px; el emoji aporta el color |
| CTAs | Blanco sobre naranja (2.26–2.8:1) | Tinta casi negra `#1a0f04` sobre relleno de acento aclarado (6.9:1) |
| Densidad escritorio | Filas y tarjetas con aire desparejo | Patrón `data-dense-dashboard`: gap 8px, tarjeta 12px, fila 36px, sidebar 260px, header 56px |
| Foco de teclado | Verde de la capa 23 | Naranja de marca, `outline` 2px con offset 3px |
| Toasts | Texto blanco (2.6–3.7:1) | Texto `#1a0f04` |
| Splash / PIN | Subtítulo bajo el piso, numpad con blanco sobre acento | Piso 11/12px y numpad con tinta sobre acento |

## 2. Contraste y accesibilidad (medido, no estimado)

Matriz automatizada sobre el DOM real: **4 vistas × 2 temas × 6 acentos = 48 combinaciones
por viewport**, más splash, modal PIN, los 4 toasts y la tarjeta de créditos desplegada.

| Viewport | Textos < 4.5:1 | Tipografía < 11px | Overflow horizontal |
|---|---|---|---|
| 1280×900 | **0** | **0** | **0** |
| 375×812 (dpr 2) | **0** | **0** | **0** |

Los 6 acentos (orange, blue, emerald, violet, rose, amber) pasan en los dos temas.
Detalle de cada hallazgo y su solución en `DISENO-SISTEMA-NELSON.md` §6.

## 3. Archivos

**Nuevos**
- `css/24-design-system-nelson.css` — capa del sistema de diseño (tokens, contraste dark/light, piso tipográfico, radios, a11y, densidad, sección 9 de cierre de contraste).
- `DISENO-SISTEMA-NELSON.md` — decisiones, tokens y verificación.
- `tools/piso-tipografico.js`, `tools/piso-rem.js`, `tools/verificar.js` — verificadores del sistema.
- `CAMBIOS-v3.7.0.md` — este documento.

**Modificados**
- `index.html` — enlaces a capas 23 y 24, estilos de factura tokenizados, `theme-color`, JetBrains Mono, versión visible `v3.7.0`.
- `css/23-premium-polish.css` — acento verde realineado al naranja de marca.
- `css/10-splash-pin-biometria.css` — piso tipográfico y contraste del numpad.
- `css/dashboard.css` — 3 rellenos de acento con texto blanco (2.8:1) → tinta casi negra (6.9:1).
- `js/modules/04-tema-notificaciones-alertas.js` — color de texto de los toasts.
- `js/modules/20-configuracion-modal.js` — versión mostrada.
- `service-worker.js` — `PRECACHE_URLS` con capas 23/24 · `CACHE_VERSION` → `nelsonapp-v3.7.0`.
- `manifest.json` — `theme_color`/`background_color` → `#0b1220`.

## 4. Cómo re-verificar

```powershell
node tools/verificar.js          # invariantes (precache, tokens, piso)
node tools/piso-tipografico.js   # dry-run: declaraciones bajo el piso
node tools/piso-rem.js           # piso en valores inline del HTML
```

Salida esperada: `Todo en orden` · `0 declaraciones elevadas` · `0 valores inline sin cubrir`.

## 5. Notas

- Los 860/332 elementos de menos de 44px de alto son las filas de las tablas densas
  (fila de 36px, intencional). En móvil los controles principales sí miden ≥44px.
- `dashboard.html` (Command Center) es una página aparte: no carga la capa 24, pero sus
  tres rellenos de acento con texto blanco quedaron corregidos en `css/dashboard.css`.
- Al cambiar `CACHE_VERSION`, el service worker purga la caché anterior en la próxima visita.
