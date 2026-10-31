#!/usr/bin/env node
// Uso:  node tools/verificar.js        (desde la raiz del proyecto, sin instalar nada)
// Revisa: archivos referenciados existen · sintaxis de cada .js · todo esta en el precache del SW.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const html=['index.html','dashboard.html'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
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
// ── Versión: una sola fuente (js/version.js) y todo lo demás debe leerla ──
{ const vf=fs.readFileSync(path.join(root,'js/version.js'),'utf8'); const vm=vf.match(/APP_VERSION\s*=\s*'(v\d+\.\d+\.\d+)'/);
  if(!vm) err("js/version.js debe definir  self.APP_VERSION = 'vX.Y.Z'");
  else { const v=vm[1];
    if(!/importScripts\('\.\/js\/version\.js'\)/.test(sw)) err('service-worker.js no importa js/version.js (su caché no seguiría la versión)');
    if(/const CACHE_VERSION\s*=\s*'nelsonapp-v\d/.test(sw)) err('service-worker.js tiene CACHE_VERSION fija; debe derivarse de APP_VERSION');
    ['index.html','dashboard.html'].forEach(f=>{ if(!/<script src="js\/version\.js"><\/script>/.test(fs.readFileSync(path.join(root,f),'utf8'))) err(f+' no carga js/version.js'); });
    ['splash-version','credits-version','cfg-header-version'].forEach(id=>{ const m=idx.match(new RegExp('id="'+id+'">([^<]*)<')); if(m&&m[1]!==v) err('index.html #'+id+' dice '+m[1]+' y la versión es '+v); });
    for(const f of walk(path.join(root,'js')).filter(f=>f.endsWith('.js')&&!f.includes(path.sep+'libs'+path.sep)&&!f.endsWith('version.js'))){
      if(/APP_VERSION\s*=\s*['"]v\d/.test(fs.readFileSync(f,'utf8'))) err('Versión fija en '+path.relative(root,f)+' (solo js/version.js puede definirla)'); }
    console.log('· Versión de la app y del service worker: '+v); } }
// ── Bundles de CSS: deben estar al día respecto a las hojas fuente ──
try{ cp.execFileSync(process.execPath,[path.join(__dirname,'build-css.js'),'--check'],{stdio:'pipe'}); }
catch(e){ err('Los bundles de CSS están desactualizados. Corre:  node tools/build-css.js\n'+String(e.stdout).trim()); }
// ── El HTML debe enlazar los bundles, no las hojas sueltas ──
['index.html','dashboard.html'].forEach(f=>{ const t=fs.readFileSync(path.join(root,f),'utf8');
  const sueltas=[...t.matchAll(/<link rel="stylesheet" href="css\/(?!(?:app|dashboard)\.bundle\.css)[^"]+">/g)];
  if(sueltas.length) err(f+' enlaza '+sueltas.length+' hoja(s) CSS suelta(s); deben ir dentro del bundle (tools/build-css.js)'); });
console.log(errores?`\n${errores} problema(s) encontrados`:`✓ Todo en orden (${refs.length} archivos css/js, precache y manifest correctos)`);
process.exit(errores?1:0);
