#!/usr/bin/env node
// Uso:  node tools/verificar.js        (desde la raiz del proyecto, sin instalar nada)
// Revisa: archivos referenciados existen · sintaxis de cada .js · todo esta en el precache del SW.
//         + invariantes del sistema de diseño (capa 24): piso tipografico, orden de cascada,
//           tokens, coherencia de theme-color entre HTML / manifest / tokens.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const html=['index.html','dashboard.html'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const refs=[...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map(m=>m[1]);
const pre=new Set([...sw.matchAll(/'\.\/((?:css|js|icons)\/[^']+|[a-z0-9-]+\.html)'/g)].map(m=>m[1]));
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

/* ═══════════════════════════════════════════════════════════════════════════
   SISTEMA DE DISEÑO (capa 24)
   ═══════════════════════════════════════════════════════════════════════════ */
const DS='css/24-design-system-nelson.css';
const dsPath=path.join(root,DS);
const ds=fs.existsSync(dsPath)?fs.readFileSync(dsPath,'utf8'):'';
if(!ds) err('Falta la capa de sistema de diseño: '+DS);
else{
  // 24.1 · tokens obligatorios
  for(const t of ['--ds-surface-raised','--ds-surface-inset','--ds-text-primary','--ds-text-secondary',
                  '--ds-text-muted','--ds-text-on-accent','--ds-accent','--ds-border',
                  '--ds-text-on-dark','--ds-text-on-dark-muted','--ds-ok-text','--ds-accent-text',
                  '--ds-radius-lg','--ds-grid-gap','--ds-table-row-height','--ds-font-min','--ds-font-mono'])
    if(!ds.includes(t+':')) err('La capa de diseño no define el token '+t);

  // 24.2 · la capa debe ser la ultima hoja de estilos del <head> (gana la cascada)
  const hojas=[...idx.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(x=>x[1]);
  if(hojas[hojas.length-1]!==DS)
    err('La capa de diseño debe cargarse al final de la cascada (la ultima es '+(hojas[hojas.length-1]||'ninguna')+')');
  if(!hojas.includes('css/23-premium-polish.css'))
    err('css/23-premium-polish.css esta en disco pero no enlazada en index.html');

  // 24.3 · el piso tipografico debe cubrir los valores inline que usan los HTML
  const cubiertos=new Set([...ds.matchAll(/\[style\*="font-size:(\d+(?:\.\d+)?)px"\]/g)].map(x=>x[1]));
  for(const f of ['index.html','dashboard.html','seguimiento.html']){
    const t=fs.readFileSync(path.join(root,f),'utf8');
    for(const x of t.matchAll(/style="[^"]*font-size:\s*(\d+(?:\.\d+)?)px/g)){
      const v=parseFloat(x[1]);
      if(v>=12) continue;
      if(!cubiertos.has(x[1])) err('El piso tipografico no cubre font-size:'+x[1]+'px (inline en '+f+')');
    }
  }

  // 24.4 · el modal de factura es una superficie SIEMPRE oscura: su texto no
  //        puede usar los tokens sensibles al tema (--ds-text-primary/--ds-text-muted).
  const bloqueFactura=(idx.match(/<style id="invoice-sale-styles">([\s\S]*?)<\/style>/)||[])[1]||'';
  for(const sel of ['.invoice-panel','.invoice-close','.invoice-field input','.invoice-actions button','.invoice-field label']){
    const regla=bloqueFactura.split('}').find(b=>b.indexOf(sel)>-1);
    if(!regla) continue;
    if(/--ds-text-primary|--ds-text-secondary|--ds-text-muted/.test(regla))
      err('La superficie siempre oscura "'+sel+'" usa un token sensible al tema (debe usar --ds-text-on-dark*)');
  }
  if(bloqueFactura && !/--ds-text-on-dark/.test(bloqueFactura))
    err('El modal de factura no usa --ds-text-on-dark (se romperia en modo claro)');
}

// 24.4 · piso tipografico en las hojas de estilo.
//        `tailwind.css` es un artefacto compilado: sus utilidades arbitrarias se corrigen por capa.
//        Los literales de selector [style*="font-size:8px"] NO son declaraciones: se ignoran.
const sinSelectores=t=>t.replace(/\[style\*?=[^\]]*\]/g,'');
const cssDir=path.join(root,'css');
for(const f of fs.readdirSync(cssDir).filter(n=>n.endsWith('.css'))){
  if(f==='tailwind.css') continue;                       // artefacto compilado
  const t=sinSelectores(fs.readFileSync(path.join(cssDir,f),'utf8'));
  for(const x of t.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)){
    const v=parseFloat(x[1]);
    if(v<11) err('Piso tipografico: css/'+f+' declara font-size:'+x[1]+'px (por debajo de 11px)');
    else if(v<12 && f!=='24-design-system-nelson.css')
      err('Piso tipografico: css/'+f+' declara font-size:'+x[1]+'px (el minimo general es 12px)');
  }
}

// 24.5 · coherencia del color de tema: HTML = manifest = token de fondo real
const tokenFondo=(()=>{
  let v=null;
  for(const f of ['01-tema-variables.css','24-design-system-nelson.css']){
    const p=path.join(cssDir,f); if(!fs.existsSync(p)) continue;
    const t=fs.readFileSync(p,'utf8');
    for(const x of t.matchAll(/--bg-dark\s*:\s*([^;]+);/g)) v=x[1].trim();  // gana la ultima definicion
  }
  return v;
})();
const themeHtml=(idx.match(/<meta name="theme-color" content="([^"]+)"/)||[])[1];
if(themeHtml && m.theme_color && themeHtml.toLowerCase()!==m.theme_color.toLowerCase())
  err('theme-color distinto: index.html='+themeHtml+' vs manifest.json='+m.theme_color);
if(tokenFondo && m.theme_color && tokenFondo.toLowerCase()!==m.theme_color.toLowerCase())
  err('theme-color distinto: manifest.json='+m.theme_color+' vs --bg-dark='+tokenFondo);
if(m.background_color && m.background_color.toLowerCase()!==m.theme_color.toLowerCase())
  err('manifest background_color ('+m.background_color+') != theme_color ('+m.theme_color+')');

// 24.6 · la version de cache debe cambiar cuando cambian los assets
const cv=(sw.match(/CACHE_VERSION\s*=\s*'([^']+)'/)||[])[1];
if(!/^nelsonapp-v\d+\.\d+\.\d+$/.test(cv||'')) err('CACHE_VERSION con formato inesperado: '+cv);

console.log(errores?`\n${errores} problema(s) encontrados`:`✓ Todo en orden (${refs.length} archivos css/js, precache, manifest y sistema de diseño correctos)`);
process.exit(errores?1:0);
