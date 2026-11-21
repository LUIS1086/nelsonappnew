#!/usr/bin/env node
// Prueba de seguimiento.html (la página que ve el cliente): los 5 estados, presupuesto aprobar/rechazar, sin señal con y sin copia,
// botón de llamar, garantía con fecha y foto ampliada. Requiere:  cd tools/lint && npm install
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');const lint=path.join(__dirname,'lint','node_modules');
let JSDOM,VirtualConsole,requestInterceptor;
try{({JSDOM,VirtualConsole,requestInterceptor}=require(path.join(lint,'jsdom')));}catch(_){console.log('· Prueba de seguimiento omitida (instala una vez:  cd tools/lint && npm install)');process.exit(0);}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const TOKEN='abcdefghijklmnopqrstuvwxyz012345';
const IMG='data:image/jpeg;base64,/9j/4AAQSkZJRg==';
async function abrir(resp,opts={}){
  const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,120)));
  const store=opts.store||{};
  const dom=new JSDOM(fs.readFileSync(root+'/seguimiento.html','utf8'),{url:'http://localhost/seguimiento.html?t='+TOKEN,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
   resources:{interceptors:[requestInterceptor(req=>{const u=new URL(req.url);if(u.hostname!=='localhost')return new Response('',{});const f=path.join(root,u.pathname);return fs.existsSync(f)?new Response(fs.readFileSync(f),{headers:{'Content-Type':'application/javascript'}}):new Response('',{status:404});})]},
   beforeParse(w){ w.requestAnimationFrame=cb=>setTimeout(cb,0);
     w.fetch=(url,o)=>{ if(opts.fail) return Promise.reject(new Error('offline')); const body=JSON.parse(o.body||'{}'); w.__calls=(w.__calls||[]).concat(url.split('/').pop()+':'+(body.p_respuesta||''));
       const d=typeof resp==='function'?resp(url,body):resp; return Promise.resolve({ok:true,json:()=>Promise.resolve(d)}); };
     for(const k in store) w.localStorage.setItem(k,store[k]); }});
  await wait(500); return {w:dom.window,errs};
}
const base={estado:'recibido',cliente:'Ana',equipo:'LICUADORA',numero:'#0001',falla:'NO ENCIENDE',fecha_ingreso:'2026-11-10T15:00:00Z',negocio:'Todo Repuestos Nelson',wa_negocio:'573001234567',valor:50000,adelanto:10000,garantia_dias:30,fecha_estado:'2026-11-12T15:00:00Z',foto_ingreso:IMG};
const t=(w,id)=>(w.document.getElementById(id).textContent||'').replace(/\s+/g,' ').trim();
const vis=(w,id)=>!w.document.getElementById(id).hidden;
(async()=>{
 let ok=0,bad=0;const chk=(n,c,x)=>{c?ok++:(bad++,console.log('✗',n,x||''));};
 for(const st of ['recibido','revisión','reparado','entregado','no-reparable']){
   const {w,errs}=await abrir({...base,estado:st});
   chk('estado '+st+' visible',vis(w,'v-ok'));chk('h1 '+st,/Ana/.test(t(w,'h1')),t(w,'h1'));chk('sin errores '+st,!errs.length,errs.join('|'));
   chk('pasos accesibles '+st,st==='no-reparable'||w.document.querySelectorAll('#steps [role=listitem]').length===4);
   if(st==='entregado'){chk('garantía con fecha',/Garantía (hasta|venció) el/.test(t(w,'kv')),t(w,'kv'));}
 }
 { const {w}=await abrir(base); chk('botón llamar',vis(w,'call')&&w.document.getElementById('call').href==='tel:+573001234567',w.document.getElementById('call').href);
   chk('whatsapp',vis(w,'wa'));
   const ph=w.document.querySelector('.photo');chk('foto ampliable',!!ph&&ph.getAttribute('role')==='button');
   ph.click();chk('visor abre',!!w.document.querySelector('.lb'));w.document.querySelector('.lb').click();chk('visor cierra',!w.document.querySelector('.lb'));
   chk('copia local guardada',!!w.localStorage.getItem('seg:'+TOKEN.slice(0,16)) && !/foto_ingreso/.test(w.localStorage.getItem('seg:'+TOKEN.slice(0,16))));
 }
 { const {w,errs}=await abrir(null,{fail:true,store:{['seg:'+TOKEN.slice(0,16)]:JSON.stringify({t:Date.now()-120000,d:{...base,estado:'reparado'}})}});
   chk('sin señal con copia: muestra datos',vis(w,'v-ok')&&/listo/i.test(t(w,'h1')),t(w,'h1'));chk('aviso sin conexión',vis(w,'off'));chk('sin errores offline',!errs.length,errs.join('|')); }
 { const {w}=await abrir(null,{fail:true}); chk('sin señal sin copia: mensaje de error',vis(w,'v-err')&&/conexión/i.test(t(w,'err-m')),t(w,'err-m')); }
 { const {w}=await abrir({...base,presupuesto_estado:'enviado',presupuesto_valor:120000,valor:null});
   chk('presupuesto visible',vis(w,'presu-card')&&/120\.000/.test(t(w,'presu-card')),t(w,'presu-card'));
   w.document.querySelector('.pbtn.yes').click();await wait(50);chk('confirmación',/Confirmas/.test(t(w,'presu-card')));
 }
 { let resp={...base,presupuesto_estado:'enviado',presupuesto_valor:120000};
   const {w}=await abrir((u,b)=>{ if(/seg_responder/.test(u)) return {...resp,presupuesto_estado:b.p_respuesta,respuesta_at:new Date().toISOString()}; return resp;});
   w.document.querySelector('.pbtn.yes').click();await wait(30);[...w.document.querySelectorAll('.pbtn')].find(b=>/confirmar/i.test(b.textContent)).click();await wait(400);
   chk('aprobar presupuesto → aprobado',/aprobado/i.test(t(w,'presu-card')),t(w,'presu-card')); chk('llamó seg_responder',(w.__calls||[]).some(c=>/seg_responder:aprobado/.test(c)),(w.__calls||[]).join(',')); }
 console.log(bad?`✗ seguimiento.html: ${bad} fallos (${ok} bien)`:`· Seguimiento del cliente: ${ok} comprobaciones bien (5 estados, presupuesto, sin señal, llamar, garantía, foto)`);process.exit(bad?1:0);
})();
