#!/usr/bin/env node
// Uso:  node tools/build-css.js      (desde la raíz del proyecto)
// Une, en el orden de tools/css-orden.txt, todas las hojas de estilo del index en css/app.bundle.css
// (una sola descarga en lugar de 28). Los archivos css/NN-*.css siguen siendo la fuente: edita esos y vuelve a correr este script.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const orden=fs.readFileSync(path.join(__dirname,'css-orden.txt'),'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
let out='/* Nelson App Pro · css/app.bundle.css — GENERADO por tools/build-css.js. No lo edites a mano. */\n';
for(const f of orden){ out+='\n/* ===== '+f+' ===== */\n'+fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,'')+'\n'; }
fs.writeFileSync(path.join(root,'css/app.bundle.css'),out);
console.log('✓ css/app.bundle.css  ('+orden.length+' hojas, '+(out.length/1024).toFixed(0)+' KB)');
