# NelsonAppNew v3.7.1 — dashboard estilo iOS + más fluido

Base: v3.7.0. Solo presentación (`dashboard.html` enlaza `css/24-ios-dash.css`).

## Estilo
- Paleta iOS en **tema oscuro** (negro / gris `#1c1c1e`) y **tema claro** (fondo `#f2f2f7`, tarjetas blancas), con los mismos tokens del dashboard.
- Letra del sistema, cifras tabulares, pesos semibold.
- Tarjetas, KPIs y paneles planos con línea fina; sin barras de color superiores ni brillos.
- Barra superior y barra inferior translúcidas; menú lateral con elemento activo teñido; selectores 7d/30d/90d como control segmentado.
- Hoja "Más" y ventanas con curva de resorte de iOS.
- Arreglo: el título largo ya no se encima con el buscador (se recorta con "…").

## Fluidez
- Se quitaron las 3 manchas fijas con `blur(130px)`, el ruido SVG a pantalla completa y la cuadrícula fija del fondo.
- Sin desenfoque en tarjetas, menú lateral ni fondos de ventanas (queda solo en barra superior e inferior).
- Sin animaciones infinitas del logo y de los puntos "en vivo".

## Volver atrás
Quita `<link rel="stylesheet" href="css/24-ios-dash.css">` de `dashboard.html`.

## Pendiente
- Probar en iPhone y Android reales (las capturas se hicieron en un navegador de escritorio).
- Los gráficos conservan su degradado naranja.
