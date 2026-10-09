#!/usr/bin/env node
// Uso:  node tools/verificar.js        (desde la raiz del proyecto, sin instalar nada)
// Revisa: archivos referenciados existen · sintaxis de cada .js · todo esta en el precache del SW.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const refs=[...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map(m=>m[1]);
const pre=new Set([...sw.matchAll(/'\.\/((?:css|js|icons)\/[^']+)'/g)].map(m=>m[1]));
let errores=0; const err=(m)=>{errores++;console.log('✗ '+m);};
refs.forEach(r=>{
  if(!fs.existsSync(path.join(root,r))) return err('Falta el archivo: '+r);
  if(!pre.has(r)) err('No esta en PRECACHE_URLS del service-worker.js: '+r);
  if(r.endsWith('.js')){ try{cp.execFileSync(process.execPath,['--check',path.join(root,r)],{stdio:'pipe'});}catch(e){err('Error de sintaxis en '+r+'\n'+String(e.stderr).split('\n').slice(0,4).join('\n'));} }
});
pre.forEach(p=>{ if(!fs.existsSync(path.join(root,p))) err('PRECACHE apunta a un archivo que no existe: '+p); });
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
m.icons.forEach(i=>{ if(!fs.existsSync(path.join(root,i.src))) err('Icono del manifest no existe: '+i.src); });
console.log(errores?`\n${errores} problema(s) encontrados`:`✓ Todo en orden (${refs.length} archivos css/js, precache y manifest correctos)`);
process.exit(errores?1:0);
