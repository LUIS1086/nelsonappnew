#!/usr/bin/env node
// Uso:  node tools/piso-rem.js [--dir <ruta>]
//
// Complemento de tools/piso-tipografico.js: aquel solo reescribe valores en px
// y deja intactos los `rem` y los `font-size` en linea del HTML.
//
// Aqui se comprueba el piso de 11px en tres frentes:
//   1. DECLARACIONES CSS por debajo de 11px (px o rem)  -> fallo
//   2. `font-size` en linea del HTML por debajo de 11px  -> informativo
//      (la capa css/24-design-system-nelson.css los neutraliza con
//      selectores de atributo + `!important`; se verifica que esten cubiertos)
//   3. Valores en linea NO cubiertos por la capa 24      -> fallo
//
//   node tools/piso-rem.js          -> informe (no escribe nada)
//
// Piso: 11px (micro) · 12px (general). Los `rem` se miden contra 16px.
const fs = require('fs');
const path = require('path');

const RAIZ = 16;
const PISO = 11;
const SALTAR = new Set(['tailwind.css']);
const CAPA = '24-design-system-nelson.css';

const raiz = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : path.join(__dirname, '..');

const fallos = [];       // declaraciones CSS por debajo del piso
const inline = [];       // valores en linea del HTML
let capaTexto = '';

// ── 1 y 3: recorro de archivos ─────────────────────────────────────────────
function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const completo = path.join(dir, e.name);
    if (e.isDirectory()) { recorrer(completo); continue; }
    if (e.name.endsWith('.css') && e.name === CAPA) {
      capaTexto = fs.readFileSync(completo, 'utf8');
      continue;
    }
    if (!e.name.endsWith('.css') && !e.name.endsWith('.html')) continue;
    if (SALTAR.has(e.name)) continue;

    const lineas = fs.readFileSync(completo, 'utf8').split(/\r?\n/);
    lineas.forEach((linea, i) => {
      if (e.name.endsWith('.css')) {
        // solo la parte de declaracion: lo que va despues de la ultima llave
        const decl = linea.includes('{') ? linea.slice(linea.lastIndexOf('{') + 1) : linea;
        buscar(linea, decl, completo, i + 1, 'css');
      } else if (/style\s*=/.test(linea)) {
        buscar(linea, linea, completo, i + 1, 'html');
      }
    });
  }
}

function buscar(linea, texto, archivo, n, tipo) {
  const re = /font-size\s*:\s*([0-9]*\.?[0-9]+)(px|rem)/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const valor = parseFloat(m[1]);
    const px = m[2] === 'rem' ? valor * RAIZ : valor;
    if (px >= PISO - 0.01) continue;
    const item = {
      archivo: path.relative(raiz, archivo),
      linea: n,
      valor: m[0].trim(),
      px: +px.toFixed(2),
      contexto: linea.trim().slice(0, 95)
    };
    if (tipo === 'css') fallos.push(item);
    else inline.push(item);
  }
}

recorrer(raiz);

// ── 2: los valores en linea estan cubiertos por la capa 24? ───────────────
const sinCubrir = [];
const vistos = new Set();
for (const it of inline) {
  const clave = it.valor.replace(/\s+/g, '');
  if (vistos.has(clave)) continue;
  vistos.add(clave);
  const n = parseFloat(it.valor.replace(/[^0-9.]/g, ''));
  const cubierto = capaTexto.indexOf('font-size:' + n) >= 0 ||
                  capaTexto.indexOf('font-size: ' + n) >= 0;
  if (!cubierto) sinCubrir.push(it);
}

console.log('PISO TIPOGRAFICO (' + PISO + 'px)');
console.log('  declaraciones CSS por debajo del piso : ' + fallos.length);
console.log('  valores en linea del HTML               : ' + inline.length + ' (' + vistos.size + ' distintos, los neutraliza la capa 24)');
console.log('  valores en linea SIN cubrir por capa 24 : ' + sinCubrir.length);
console.log('');

if (fallos.length) {
  console.log('FALLOS (declaraciones CSS):');
  for (const f of fallos) console.log('  ' + f.archivo + ' L' + f.linea + '  ' + f.valor + '  (' + f.px + 'px)\n      ' + f.contexto);
  console.log('');
}
if (sinCubrir.length) {
  console.log('FALLOS (en linea sin corregir por la capa 24):');
  for (const f of sinCubrir) console.log('  ' + f.archivo + ' L' + f.linea + '  ' + f.valor + '  (' + f.px + 'px)\n      ' + f.contexto);
  console.log('');
}

if (fallos.length === 0 && sinCubrir.length === 0) {
  console.log('OK - ninguna fuente visible por debajo de ' + PISO + 'px.');
  process.exit(0);
}
process.exit(1);
