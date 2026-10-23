# Nelson App Pro — Sistema de diseño (capa 24)

> Implementación de la UI mejorada con **ui-ux-pro-max**. Solo presentación:
> no se tocan IDs, eventos ni lógica de negocio.

## 1. Fuente de verdad del diseño

Catálogo `ui-ux-pro-max` (skill instalada en `~/.opencode/skills/ui-ux-pro-max`):

| Dominio | Fila elegida | Qué aporta |
|---|---|---|
| `product` | **Inventory & Stock Management** | Flat Design + Minimalism & Swiss + Accessible & Ethical · Dashboard "Real-Time Monitoring + Data-Dense" · Paleta "neutral funcional + semáforo (verde/ámbar/rojo)" |
| `product` | **Home Services (Plumber/Electrician)** | Paleta "Trust Blue + Safety Orange + Professional grey" — dominio literal de la app (taller de electrodomésticos) |
| `style` | `data-dense-dashboard` | `--grid-gap:8px` · `--card-padding:12px` · `--font-size-small:12px` · `--table-row-height:36px` · `--sidebar-width:240px` · `--header-height:56px` · requisitos: `contrast-text-4.5`, `keyboard`, `visible-focus`, `reduced-motion` |
| `typography` | "Dashboard Data" (Mono + Sans) | Mono para cifras/datos + sans para UI → se aplica con **JetBrains Mono**, que el `dashboard.html` ya carga (sin peso nuevo de fuentes) |
| `ux` | Touch Target Size, Contrast Readability | 44pt iOS / 48dp Android / 24px web + WCAG |

**Descartado:** el generador automático `--design-system` eligió patrón de *landing page* ("Feature-Rich Showcase")
y tipografía serif "Cormorant Garamond / Crimson Pro" (mood *parchment/brass/victorian*), inservible para una
herramienta operativa densa. En su lugar se tomó el catálogo por dominio.

## 2. Auditoría medida (DOM real, no estática)

Inspección con `browser.evaluate` sobre el app servido, viewport 912×670 y **375×812 vía iframe** (mismo origen).

### Modo oscuro (por defecto)
- `body` `rgb(13,15,26)` · `.card` `rgb(24,27,40)` · texto `#e8eaf6`
- **5 textos bajo 4.5:1** — peekiest: `text-slate-400` (`#64748b`) = **3.6:1** en tarjeta, `4.01:1` en página
- `text-slate-400` se usa **65 veces** → un solo override de token lo corrige

### Modo claro
- **17 textos bajo 4.5:1**. No es un bug de activación: `body` y `.card` tienen `transition: background .35s`
  (01-L43/L50), por lo que una lectura síncrona mide el valor *inicial* de la animación. **Esperando 900 ms**
  el modo claro sí renderiza bien (`rgb(245,243,238)` / `rgb(253,252,249)`).
- El defecto real: **17 textos conservan valores del modo oscuro** sobre superficies claras:
  blanco 1.03:1 · slate-300 1.34 · emerald-400 1.73 · indigo-300 1.80 · orange-400 2.04–2.21 ·
  slate-400 2.50 · indigo-400 2.69 · emerald-600 3.40 · slate-400 4.29
- `03-modo-claro-accesibilidad.css` solo remapea 7 clases (`text-slate-400/500`, `text-white`,
  `text-emerald-400`, `text-rose-400`, `text-blue-400`, `text-orange-400/500`) → faltan 19 más.

### Tipografía — el problema mayor
| Origen | Cantidad | Mínimo |
|---|---|---|
| `font-size` en los 22 CSS | **209** | 7px |
| `style="font-size:…"` inline en `index.html` | **123** | 8px |
| clases Tailwind `text-[8px]…text-[11px]` | **102** | 8px |
| **total** | **~434 textos por debajo de 12px** | |

### Otros
- **Radios caóticos**: 8 valores distintos (13/13.5/14/16/18/20/22/27px) + `50%`×16 + `999px`
- **3 paletas paralelas**: tokens del tema (`#0d0f1a`/`#181b28`), Tailwind slate/emerald/rose/violet
  (26 clases `text-*`, 40 `bg-*`) y hex hardcodeado (`<style id="invoice-sale-styles">` en `index.html` L45-55)
- `css/23-premium-polish.css` **huérfana**: existe en disco, ni enlazada ni en `PRECACHE_URLS`
- `manifest.json` `theme_color #0f172a` ≠ `body` real `#0d0f1a`; `dashboard.html` `#07080f`
- **259 emoji** en `index.html`, **79 de 268 botones** los usan como icono
- Móvil 375px: **sin overflow horizontal**, **0 tap targets < 44px** ✓

## 3. Decisiones

### 3.1 Paleta
Dark-first, neutros azul-noche (no negro puro), acento naranja de identidad preservado.

| Token | Valor | Contraste |
|---|---|---|
| `--bg-dark` | `#0b1220` | — |
| `--card-dark` | `#111b2c` | — |
| `--text-dark` | `#eef2f8` | 16.9:1 |
| `--text-muted` | `#8494ab` | 6.1:1 base · **5.6:1** tarjeta |
| `--accent` | `#f97316` | identidad |
| `--accent-text` | `#fdba74` | 11.2:1 (texto naranja sobre fondo oscuro) |
| `--ds-text-on-accent` | `#1a0f04` | **5.36:1** — CTA naranja lleva texto casi negro, no blanco (blanco = 3.56:1 ✗) |
| `--success` | `#34d399` | — |
| `--danger` | `#fb7185` | — |
| `--info` | `#60a5fa` | — |

Modo claro: neutral **frío** (`#f8fafc` / `#ffffff` / `#d8e0ea` / `#0f172a` / `#475569`).
Se elimina el crema `#f5f3ee`/`#fdfcf9`/`#f0ece3` (marcado como "tell" de IA por `frontend-design`).

### 3.2 Semáforo de estado
`--ds-on-ok #04231a` · `--ds-on-warn #2a1a03` · `--ds-on-danger #2b0510` · `--ds-on-info #0c1b3d`
→ texto casi negro sobre rellenos saturados (patrón *On Accent: #000000* del catálogo).

### 3.3 Piso tipográfico
- **11px** micro (badges/contadores, valores ≤ 9px) · **12px** mínimo general
- Nunca por debajo de 11px en ninguna vista

### 3.4 Tipografía de datos
`JetBrains Mono` + `tabular-nums` para precios, cantidades, códigos y totales → columnas alineadas.
Ya cargado por `dashboard.html`; se añade a `index.html` (mismo par de familias en todo el producto).

## 4. Archivos

### Nuevos
| Archivo | Contenido |
|---|---|
| `css/24-design-system-nelson.css` | Tokens + remediación de contraste (dark/light) + piso tipográfico + radios + a11y + densidad |
| `tools/piso-tipografico.js` | Transformación mecánica del piso tipográfico en los CSS (dry-run por defecto) |
| `DISENO-SISTEMA-NELSON.md` | Este documento |

### Modificados
| Archivo | Cambio |
|---|---|
| `index.html` | `<link>` de `23-premium-polish.css` + `24-design-system-nelson.css`; `<style id="invoice-sale-styles">` tokenizado; `<meta theme-color>` → `#0b1220`; `JetBrains Mono` |
| `css/*.css` (22) | `font-size` < 12px elevado por `tools/piso-tipografico.js` (solo valor) |
| `css/dashboard.css`, `css/dashboard-premium.css` | idem + tokens alineados; los 3 rellenos de acento con texto blanco (2.8:1) pasan a tinta casi negra (6.9:1) |
| `service-worker.js` | `PRECACHE_URLS` += `23`, `24` · `CACHE_VERSION` → `v3.7.0` |
| `manifest.json` | `theme_color` / `background_color` → `#0b1220` |
| `dashboard.html` | `<meta theme-color>` → `#07080f` consistente |
| `tools/verificar.js` | Invariantes del sistema de diseño (piso tipográfico, precache, tokens) |
| `css/10-splash-pin-biometria.css` | subtítulo/versión del splash al piso; numpad PIN con tinta sobre acento |
| `js/modules/04-tema-notificaciones-alertas.js` | toasts con `#1a0f04` (blanco daba 2.6–3.7:1) |

## 5. Verificación

```powershell
node tools/piso-tipografico.js --apply   # transformación CSS
node tools/piso-rem.js                   # piso en valores inline del HTML
node tools/verificar.js                  # checker estático + invariantes
```

### 5.1 Resultado de la matriz automatizada

Chrome headless vía CDP (documento real, no iframe). 4 vistas × 2 temas × 6 acentos
(orange, blue, emerald, violet, rose, amber) = **48 combinaciones por viewport**, más
splash, modal PIN, los 4 toasts y la tarjeta de créditos desplegada.

| Viewport | Contraste < 4.5:1 | Tipografía < 11px | Overflow horizontal |
|---|---|---|---|
| 1280×900 (escritorio) | **0** | **0** | **0** |
| 375×812 (móvil, dpr 2) | **0** | **0** | **0** |

Pendiente informativo: 860/332 elementos por debajo de 44px de alto en las tablas
densas — es intencional (fila de 36px del patrón `data-dense-dashboard`); en móvil
los controles principales sí cumplen 44px.

## 6. Cierre de contraste (sección 9 de la capa 24)

Hallazgos reales de la matriz y cómo se resolvieron:

| Hallazgo | Medido | Solución |
|---|---|---|
| 12 tiles de iconos (emoji) con degradados saturados distintos | 1.47–3.09:1 | Pastilla neutra `rgba(148,163,184,.12)` + borde 1px; el emoji conserva su color y desaparecen 12 lenguajes visuales paralelos |
| CTA "Registrar entrada" con degradado naranja y texto blanco | 2.26:1 | Relleno de acento aclarado + tinta `#1a0f04` |
| "ACTIVAR AHORA" (permiso de notificaciones) | 1.71:1 | Igual que el anterior (regla por intención `[class*="from-orange-600"]`) |
| Avatar "LE", avatar NIA y logo lateral sobre acento vivo | 2.8–3.8:1 | `--ds-accent-fill` (acento 92% + blanco) + tinta casi negra |
| Insignia "IA" verde con texto blanco | 2.5:1 | Verde 700 `#047857` |
| "CONECTAR" (Drive) sobre `#3b82f6` | 3.68:1 | Degradado `#1d4ed8 → #1e40af` (5.2:1) |
| Texto de acento con `var(--accent)` literal | 4.08:1 (violeta) | `--ds-accent-readable` (acento 55% + blanco) |
| Modo claro: "Nueva recepción" y chip `#PRÓX.` | 4.4:1 y 1.01:1 | `#9a3412` sobre blanco; chip blanco con borde |
| Modal PIN y panel de créditos en modo claro | 1.09:1 / 1.78:1 | `#pin-modal` entra en la lista de "superficies siempre oscuras" |

Dos lecciones del arnés (documentadas para futuras auditorías):
1. Congelar transiciones escribiendo `style` inline **re-serializa** el atributo
   (`color:#475569` → `color: rgb(...)`) y rompe los selectores `[style*=...]` de la app:
   la mitad de los hallazgos eran artefactos. Se congelan por hoja, no por elemento.
2. Un icono emoji es un glifo de color: `color` no lo repinta, así que el par fg/bg debe
   resolverse con la superficie, no con la tinta.
