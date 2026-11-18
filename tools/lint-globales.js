#!/usr/bin/env node
// Uso:  node tools/lint-globales.js      (lo llama tools/verificar.js)
// Detecta funciones/variables USADAS pero NO DEFINIDAS en ningún script (el error que dejó el
// dashboard en "Cargando..." en v3.9.12). Como la app usa scripts clásicos con globales, une los
// scripts en el orden de cada HTML y revisa el conjunto.
// Requiere ESLint una sola vez:  cd tools/lint && npm install
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let ESLint;
try { ({ ESLint } = require(path.join(__dirname, 'lint', 'node_modules', 'eslint'))); }
catch (_) { console.log('· Chequeo de globales omitido (instala ESLint una vez:  cd tools/lint && npm install)'); process.exit(0); }

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const allJs = walk(path.join(root, 'js')).filter(f => f.endsWith('.js') && !f.includes(path.sep + 'libs' + path.sep));

// Globales que otros scripts publican con window.X = ...  (ESLint no las ve)
const extra = {};
for (const f of allJs) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)) extra[m[1]] = 'writable';
// Librerías externas que se cargan por <script> de js/libs o de Google
for (const g of ['QRCode', 'html2canvas', 'XLSX', 'jspdf', 'Chart', 'google', 'BarcodeDetector', 'PublicKeyCredential']) extra[g] = 'readonly';

async function revisar(nombre, archivos) {
  let code = '', mapa = [];
  for (const f of archivos) { const t = fs.readFileSync(f, 'utf8'); mapa.push({ f, desde: code.split('\n').length }); code += t + '\n;\n'; }
  const eslint = new ESLint({ useEslintrc: false, overrideConfig: {
    env: { browser: true, es2022: true, serviceworker: true }, parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
    globals: extra, rules: { 'no-undef': 'error' } } });
  const [r] = await eslint.lintText(code, { filePath: nombre + '.js' });
  return r.messages.map(m => {
    let o = mapa[0]; for (const x of mapa) if (x.desde <= m.line) o = x;
    return `${path.relative(root, o.f)}:${m.line - o.desde + 1}  ${m.message}`;
  });
}
(async () => {
  const orden = h => [...fs.readFileSync(path.join(root, h), 'utf8').matchAll(/<script[^>]+src="((?:\.\/)?js\/[^"]+)"/g)]
    .map(m => path.join(root, m[1].replace(/^\.\//, ''))).filter(f => f.endsWith('.js') && !f.includes(path.sep + 'libs' + path.sep) && fs.existsSync(f));
  const problemas = [];
  for (const h of ['index.html', 'dashboard.html']) problemas.push(...(await revisar(h, orden(h))));
  if (problemas.length) { console.log('✗ Funciones/variables usadas pero no definidas:\n  ' + [...new Set(problemas)].join('\n  ')); process.exit(1); }
  console.log('· Globales: ninguna función o variable sin definir');
})();
