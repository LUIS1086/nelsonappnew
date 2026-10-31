#!/usr/bin/env node
// Uso:   node tools/build-css.js           genera los bundles de css/
//        node tools/build-css.js --check   falla si algún bundle está desactualizado (lo usa verificar.js)
//
// Une las hojas de css/ EN EL MISMO ORDEN en que antes se enlazaban una a una (el orden es la cascada)
// y quita comentarios y espacios sobrantes. Las hojas fuente NO se tocan: se siguen editando ellas
// y después se corre este script. El HTML enlaza solo el bundle (1 petición en vez de 25).
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');

const BUNDLES = {
  'css/app.bundle.css': [          // index.html
    '01-tema-variables', '02-componentes-base', '03-modo-claro-accesibilidad', '04-navegacion-movil',
    '05-modal-exportar', '06-taller-repuestos', '07-estadisticas', '08-ordenes-avisar-listos',
    '09-busqueda-config-red', '10-splash-pin-biometria', '11-responsive-escritorio', '16-aviso-actualizacion',
    'tailwind', '17-responsive-premium-hardening', '12-extras-1', '13-extras-2',
    '14-configuracion-command-center', '15-nelson-ia', '18-native-premium', '19-desktop-premium',
    '20-responsive-pro', '21-ticket-venta', '22-seguimiento', '24-ios-fluidez',
    '25-visual-refresh', '26-iconos-svg', '27-correcciones'
  ],
  'css/dashboard.bundle.css': [    // dashboard.html
    'dashboard', 'dashboard-premium', '24-ios-dash'
  ]
};

// Minificador conservador: respeta cadenas "..." '...' y url(...) sin comillas; solo quita
// comentarios y espacios que sobran (junto a { } ; y al principio/fin). No reescribe valores.
function minify(src) {
  let out = '', i = 0, n = src.length;
  const last = () => out[out.length - 1];
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(\s*[^"'\s)]/i.test(src.slice(i, i + 12))) {
      const e = src.indexOf(')', i); out += src.slice(i, e + 1); i = e + 1; continue;
    }
    if (/\s/.test(c)) {
      let j = i; while (j < n && /\s/.test(src[j])) j++;
      // ¿lo siguiente es un comentario? míralo después de saltarlo
      let k = j; while (src[k] === '/' && src[k + 1] === '*') { const e = src.indexOf('*/', k + 2); k = e < 0 ? n : e + 2; while (k < n && /\s/.test(src[k])) k++; }
      const next = src[k], prev = last();
      if (prev !== undefined && next !== undefined && !'{};'.includes(prev) && !'{}'.includes(next) && next !== ';') out += ' ';
      i = k > j ? k : j; continue;
    }
    out += c; i++;
  }
  return out.trim();
}

function build() {
  const res = {};
  for (const [outRel, names] of Object.entries(BUNDLES)) {
    const parts = names.map(nm => {
      const f = path.join(root, 'css', nm + '.css');
      if (!fs.existsSync(f)) { console.error('✗ Falta css/' + nm + '.css (citado en ' + outRel + ')'); process.exit(1); }
      return '/* ' + nm + ' */' + minify(fs.readFileSync(f, 'utf8'));
    });
    res[outRel] = '/* GENERADO por tools/build-css.js — no lo edites; edita css/*.css y corre: node tools/build-css.js */\n' + parts.join('\n') + '\n';
  }
  return res;
}

const built = build();
if (process.argv.includes('--check')) {
  let bad = 0;
  for (const [rel, txt] of Object.entries(built)) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) { console.log('✗ ' + rel + ' está desactualizado → corre: node tools/build-css.js'); bad++; }
  }
  process.exit(bad ? 1 : 0);
}
for (const [rel, txt] of Object.entries(built)) {
  fs.writeFileSync(path.join(root, rel), txt);
  const src = BUNDLES[rel].reduce((s, nm) => s + fs.statSync(path.join(root, 'css', nm + '.css')).size, 0);
  console.log('✓ ' + rel + '  ' + BUNDLES[rel].length + ' hojas · ' + (src / 1024).toFixed(0) + ' KB → ' + (txt.length / 1024).toFixed(0) + ' KB');
}
