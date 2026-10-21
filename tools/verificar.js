#!/usr/bin/env node
// Uso:  node tools/verificar.js        (desde la raiz del proyecto, sin instalar nada)
// Revisa: archivos referenciados existen · sintaxis de cada .js · todo esta en el precache del SW.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const pages=['index.html','dashboard.html','seguimiento.html'];
const html=pages.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const refs=[...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map(m=>m[1]);
const pre=new Set([...sw.matchAll(/'\.\/((?:css|js|icons)\/[^']+)'/g)].map(m=>m[1]));
let errores=0; const err=(m)=>{errores++;console.log('✗ '+m);};
pages.forEach(f=>{ if(!sw.includes(`'./${f}'`)) err('Página sin precaché offline: '+f); });
refs.forEach(r=>{
  if(!fs.existsSync(path.join(root,r))) return err('Falta el archivo: '+r);
  if(!pre.has(r)) err('No esta en PRECACHE_URLS del service-worker.js: '+r);
  if(r.endsWith('.js')){ try{cp.execFileSync(process.execPath,['--check',path.join(root,r)],{stdio:'pipe'});}catch(e){err('Error de sintaxis en '+r+'\n'+String(e.stderr).split('\n').slice(0,4).join('\n'));} }
});
pre.forEach(p=>{ if(!fs.existsSync(path.join(root,p))) err('PRECACHE apunta a un archivo que no existe: '+p); });
const body=idx.slice(idx.indexOf('<body'));
if(/<link[^>]+rel="stylesheet"/.test(body)) err('Hay <link rel="stylesheet"> dentro del <body> de index.html (deben ir en el <head>)');
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
m.icons.forEach(i=>{ if(!fs.existsSync(path.join(root,i.src))) err('Icono del manifest no existe: '+i.src); });
const vj=fs.readFileSync(path.join(root,'vercel.json'),'utf8');
if(!/Content-Security-Policy/.test(vj)) err('vercel.json no tiene Content-Security-Policy');
for(const f of fs.readdirSync(path.join(root,'js'),{recursive:true})){ if(!String(f).endsWith('.js')||String(f).includes('libs')) continue;
  if(/[?&]key=\$\{/.test(fs.readFileSync(path.join(root,'js',String(f)),'utf8'))) err('La llave de API va en la URL (usa la cabecera x-goog-api-key): js/'+f); }
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk(path.join(root,'js')).filter(f=>f.endsWith('.js')&&!f.includes(path.sep+'libs'+path.sep))){
  const t=fs.readFileSync(f,'utf8');
  for(const m of t.matchAll(/['"](js\/libs\/[A-Za-z0-9._-]+)['"]/g)) if(!fs.existsSync(path.join(root,m[1]))) err('Falta la librería '+m[1]+' (citada en '+path.relative(root,f)+')');
  if(/\.src\s*=\s*['"]https?:\/\/(cdnjs|cdn\.jsdelivr|unpkg)/.test(t)) err('Carga un script de CDN (la CSP lo bloquea; alójalo en js/libs): '+path.relative(root,f));
}
console.log(errores?`\n${errores} problema(s) encontrados`:`✓ Todo en orden (${refs.length} referencias CSS/JS, páginas offline, precache y manifest correctos)`);
process.exit(errores?1:0);
