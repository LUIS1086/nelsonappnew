#!/usr/bin/env node
// Uso:  node tools/piso-tipografico.js [--apply] [--dir <ruta>]
// Piso tipografico: ninguna fuente de texto por debajo de 11px.
//
// Por que toca los CSS y no solo una capa nueva:
//   · los `font-size: Npx` de una hoja de estilos gana a cualquier capa cargada despues
//     (mismo selector) salvo con `!important`, que produciria una sopa de especificidad
//   · los `style="font-size:Npx"` inline de index.html SI se pueden corregir desde CSS
//     (selectores de atributo + `!important`), y eso lo hace css/24-design-system-nelson.css
//   => aqui se corrige el origen de las hojas de estilo; el HTML se corrige por capa.
//
// Es una transformacion SOLO de valor: no toca selectores, ni estructura, ni reglas.
// Los valores en `em`/`rem`, `clamp()`, `min()`, `max()` y los `font-size: 0` quedan intactos.
//
//   node tools/piso-tipografico.js            -> dry-run (informe, no escribe)
//   node tools/piso-tipografico.js --apply    -> escribe los cambios
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const dirArgIdx = process.argv.indexOf('--dir');
const CSS_DIR = dirArgIdx > -1 ? path.resolve(process.argv[dirArgIdx + 1]) : path.join(ROOT, 'css');

// Escalas de destino.
const MICRO = 11; // micro: badges, contadores, etiquetas auxiliares
const MIN   = 12; // minimo general

// "8.5px" -> 8.5 ; no toca "8.5rem" ni "clamp(...)" ni "calc(...)".
const RE = /font-size\s*:\s*(\d+(?:\.\d+)?)px\b/g;

function destino(v) {
  if (v <= 9) return MICRO;   // 7, 8, 8.5, 9
  return MIN;                 // 9.5, 10, 10.5, 11, 11.5
}

let cambios = 0;
const porArchivo = [];
const porValor = {};

// `tailwind.css` es un artefacto compilado (tailwindcss v3.4.17): no se edita a mano.
// Sus utilidades arbitrarias (`text-[8px]`, `text-[9px]`, ...) se corrigen por capa
// en css/24-design-system-nelson.css, sin depender de un rebuild de Tailwind.
// `24-design-system-nelson.css` es capa autoral: sus valores (11px micro, 12px general)
// son objetivos deliberados, no deuda heredada. Reescribirlos la dejaría inconsistente.
const SALTAR = new Set(['tailwind.css', '24-design-system-nelson.css']);

for (const f of fs.readdirSync(CSS_DIR).filter(n => n.endsWith('.css') && !SALTAR.has(n)).sort()) {
  const p = path.join(CSS_DIR, f);
  const src = fs.readFileSync(p, 'utf8');
  let n = 0;
  const out = src.replace(RE, (match, num, offset) => {
    // Un literal de selector como [style*="font-size:8px"] NO es una declaración.
    // Reescribirlo cambiaría a qué elementos apunta el selector, así que se respeta.
    const antes = src.slice(Math.max(0, offset - 12), offset);
    if (/style\*=\s*["']?$/.test(antes)) return match;

    const v = parseFloat(num);
    if (v >= MIN) return match;
    const d = destino(v);
    n++;
    porValor[num] = (porValor[num] || 0) + 1;
    return match.replace(num + 'px', d + 'px');
  });
  if (n > 0) {
    cambios += n;
    porArchivo.push({ file: f, n });
    if (APPLY) fs.writeFileSync(p, out, 'utf8');
  }
}

console.log((APPLY ? 'APLICADO' : 'DRY-RUN') + '  ' + CSS_DIR);
console.log('declaraciones elevadas: ' + cambios);
if (porArchivo.length) {
  console.log('\npor archivo:');
  porArchivo.forEach(a => console.log('  ' + a.file.padEnd(42) + String(a.n).padStart(4) + ' decls'));
  console.log('\npor valor original:');
  Object.entries(porValor).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .forEach(([k, v]) => console.log('  ' + (k + 'px').padEnd(10) + String(v).padStart(4) + '  -> ' + destino(parseFloat(k)) + 'px'));
}
if (!APPLY && cambios > 0) console.log('\nEjecuta con --apply para escribir los cambios.');
