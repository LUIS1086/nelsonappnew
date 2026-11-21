#!/usr/bin/env node
// Prueba de humo: abre la app completa en un navegador simulado (jsdom + IndexedDB falso),
// desbloquea con el PIN por defecto, crea una orden, recorre las pestañas y abre el dashboard.
// Falla (exit 1) si aparece cualquier error. No toca ningún dato real.
// Requiere (una sola vez):  cd tools/lint && npm install
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let JSDOM, VirtualConsole, requestInterceptor;
try {
  const lint = path.join(__dirname, 'lint', 'node_modules');
  require(path.join(lint, 'fake-indexeddb', 'auto'));
  ({ JSDOM, VirtualConsole, requestInterceptor } = require(path.join(lint, 'jsdom')));
} catch (_) { console.log('· Prueba de humo omitida (instala una vez:  cd tools/lint && npm install)'); process.exit(0); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const fallos = [];
process.on('uncaughtException', e => { fallos.push('error no controlado: ' + String(e && e.message).slice(0, 160)); });

function abrir(htmlFile, errs) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errs.push('JSDOM ' + String((e.detail && e.detail.message) || e.message).slice(0, 180)));
  return new JSDOM(fs.readFileSync(path.join(root, htmlFile), 'utf8'), {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + htmlFile, virtualConsole: vc,
    resources: { interceptors: [requestInterceptor(req => {
      const u = new URL(req.url);
      if (u.hostname !== 'localhost') return new Response('', { headers: { 'Content-Type': 'text/plain' } }); // sin internet
      const f = path.join(root, decodeURIComponent(u.pathname));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('', { status: 404 });
      const ct = f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      return new Response(fs.readFileSync(f), { headers: { 'Content-Type': ct } });
    })] },
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange;
      Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true });
      w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.scrollTo = () => {};
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
      w.navigator.serviceWorker = { register: () => Promise.resolve({ scope: '/' }), addEventListener() {}, ready: new Promise(() => {}) };
      w.Notification = function () {}; w.Notification.permission = 'denied'; w.Notification.requestPermission = () => Promise.resolve('denied');
      w.Chart = function () {}; w.Chart.register = () => {}; w.Chart.defaults = { font: {}, plugins: {} };
      w.addEventListener('error', e => { if (!e.target || e.target === w) errs.push('ERROR ' + e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno); });
      w.addEventListener('unhandledrejection', e => errs.push('PROMESA ' + String((e.reason && e.reason.stack) || e.reason).split('\n').slice(0, 2).join(' | ').slice(0, 200)));
    }
  });
}

(async () => {
  // ── 1) App principal ──
  const e1 = [];
  const w = abrir('index.html', e1).window;
  await wait(2500);
  const necesarias = ['tab', 'renderOrders', 'showToast', 'initApp', 'put', 'getAll'];
  for (const n of necesarias) if (typeof w[n] !== 'function') fallos.push('index: no existe la función ' + n);
  for (const d of '1234') if (typeof w.pinPad === 'function') w.pinPad(Number(d));
  await wait(2500);
  if (w.document.getElementById('app-header').classList.contains('hidden')) fallos.push('index: el PIN 1234 no desbloqueó la app');
  try {
    // Datos para comprobar la caja del dashboard: orden entregada de 80.000 (con adelanto y cobro de entrega ya registrados
    // como ventas auxiliares) + una venta real de 30.000. La caja correcta es 110.000 (no se cuentan dos veces).
    const ahora = Date.now();
    await w.put('orders', { id: 'humo-2', orderNum: 2, nom: 'Entregada', equ: 'Ventilador', tel: '3009999999', sta: 'entregado', fecha: ahora - 86400000, fechaEntrega: ahora - 60000, val: 80000, saldo: 0 });
    await w.put('sales', { id: 'humo-v1', item: 'Adelanto Entregada', val: 20000, fecha: ahora - 80000000, tipo: 'adelanto' });
    await w.put('sales', { id: 'humo-v2', item: 'Cobro entrega Entregada', val: 60000, fecha: ahora - 60000, tipo: 'cobro_entrega' });
    await w.put('sales', { id: 'humo-v3', item: 'Motor', val: 30000, fecha: ahora - 30000 });
    await w.put('orders', { id: 'humo-1', orderNum: 1, nom: 'Cliente Prueba', equ: 'Licuadora', tel: '3001234567', sta: 'recibido', fecha: Date.now(), val: 50000 });
    for (const t of ['ordenes', 'ventas', 'admin', 'taller']) { await w.tab(t); await wait(300); }
    await w.renderOrders(); await wait(600);
    if (!w.document.body.textContent.includes('Cliente Prueba')) fallos.push('index: la orden creada no aparece en la lista');
  } catch (e) { fallos.push('index: ' + e.message); }
  try { // ── Control de caja: botón con el monto real y fila "Sin fecha" en vez de "Invalid Date" ──
    await w.put('gastos', { id: 'humo-g-sinfecha', det: 'Gasto sin fecha', val: 1000 });
    await w.openCajaModal(); await wait(200);
    const dd = w.document, btn = dd.getElementById('btn-cerrar-caja');
    if (!btn || /\$0\)/.test(btn.textContent) || !/110[.,]000/.test(btn.textContent)) fallos.push('caja: el botón «Cerrar caja» no muestra el monto real: ' + (btn && btn.textContent));
    if (/Invalid Date/.test(dd.getElementById('daily-income-list').textContent)) fallos.push('caja: el historial muestra «Invalid Date»');
    if (!/Sin fecha/.test(dd.getElementById('daily-income-list').textContent)) fallos.push('caja: debía mostrar «Sin fecha» para el registro sin fecha');
    w.closeCajaModal(); await w.del('gastos', 'humo-g-sinfecha');
  } catch (e) { fallos.push('caja: ' + e.message); }
  try { // helpers de v3.9.16: número de WhatsApp y registro de errores
    if (w._waNumber('+57 300 123 4567') !== '573001234567' || w._waNumber('300-123-4567') !== '573001234567') fallos.push('index: _waNumber no normaliza bien el teléfono');
    w._guardarErrorLocal('prueba', new Error('error de prueba'));
    const er = w._erroresRecientes(24);
    if (er.n !== 1 || er.ultimo.m !== 'error de prueba') fallos.push('index: el registro de errores no guarda/lee bien');
    w.localStorage.removeItem('appErrorLog');
  } catch (e) { fallos.push('index (helpers): ' + e.message); }
  try { // ── Corregir una venta (módulo 46) ──
    const t0 = Date.now() - 600000;
    await w.put('stock', { id: 9001, n: 'Motor prueba', p: 20000, q: 10, cat: 'x', code: 'M1' });
    await w.put('stock', { id: 9002, n: 'Aspa prueba', p: 5000, q: 10, cat: 'x', code: 'A1' });
    const base = { fecha: t0, cliente: 'Cliente Z', telefono: '', documento: '', metodoPago: 'Efectivo', observaciones: '', comprobante: 'T-HUMO1' };
    await w.put('sales', { ...base, id: 8001, item: 'Motor prueba', val: 40000, qty: 2, stockId: 9001, linea: 1, precioUnit: 20000, precioOriginal: 20000 });
    await w.put('sales', { ...base, id: 8002, item: 'Aspa prueba', val: 5000, qty: 1, stockId: 9002, linea: 2, precioUnit: 5000, precioOriginal: 5000 });
    const val = async () => { const s = await w.getAll('sales'), k = await w.getAll('stock'); return { s1: s.find(x => x.id === 8001), s2: s.find(x => x.id === 8002), q1: k.find(x => x.id === 9001).q, q2: k.find(x => x.id === 9002).q }; };
    const doc = w.document, setv = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
    await w.renderMovimientos(); await wait(100);
    if (!/openSaleEditor\(8001\)/.test(doc.getElementById('movimientos-history').innerHTML)) fallos.push('ventas: el historial de caja no muestra el botón ✏️ Corregir');
    await w.openSaleTicket(8001); await wait(150);
    const bEd = doc.getElementById('tk-edit');
    if (!bEd) fallos.push('ventas: el comprobante no tiene el botón «Corregir»');
    else { bEd.click(); await wait(200); const mm = doc.getElementById('sale-edit-modal'); if (!mm || mm.classList.contains('hidden')) fallos.push('ventas: «Corregir» del comprobante no abrió el editor'); w.closeSaleEditor(); }
    await w.openSaleEditor(8001); await wait(100);
    const modal = doc.getElementById('sale-edit-modal');
    if (!modal || modal.classList.contains('hidden')) fallos.push('ventas: no abrió el editor de venta');
    else {
      const qty = doc.querySelectorAll('#ev-lines input[data-k=qty]'), pr = doc.querySelectorAll('#ev-lines input[data-k=price]');
      if (qty.length !== 2) fallos.push('ventas: el editor no mostró las 2 líneas del comprobante');
      if (!doc.getElementById('ev-save').disabled) fallos.push('ventas: «Guardar» debería estar deshabilitado sin cambios');
      setv(qty[0], '4'); setv(pr[0], '18000'); setv(doc.getElementById('ev-cliente'), 'Cliente Corregido');
      doc.querySelectorAll('.ev-rm')[1].click();                      // quitar la línea 2 (Aspa)
      if (!/72\.000/.test(doc.getElementById('ev-total').textContent)) fallos.push('ventas: total del editor incorrecto: ' + doc.getElementById('ev-total').textContent);
      await w.saveSaleEdit(); await wait(300);
      const r = await val();
      if (!r.s1 || r.s1.qty !== 4 || r.s1.val !== 72000 || r.s1.precioUnit !== 18000) fallos.push('ventas: la venta editada no quedó con cantidad 4 / total 72.000: ' + JSON.stringify(r.s1 && [r.s1.qty, r.s1.val]));
      if (r.q1 !== 8) fallos.push('ventas: stock del producto editado debería ser 8 y es ' + r.q1);
      if (r.s2) fallos.push('ventas: la línea quitada debió eliminarse');
      if (r.q2 !== 11) fallos.push('ventas: el stock de la línea quitada debió volver (11) y es ' + r.q2);
      if (!r.s1 || r.s1.cliente !== 'Cliente Corregido' || !(r.s1.ediciones && r.s1.ediciones.length === 1)) fallos.push('ventas: faltó cliente nuevo o historial de ediciones');
    }
    // stock insuficiente: pedir 99 de un producto con 8 en inventario
    await w.openSaleEditor(8001); await wait(100);
    setv(doc.querySelectorAll('#ev-lines input[data-k=qty]')[0], '99');
    w.alert = () => {}; await w.saveSaleEdit(); await wait(200);
    const r2 = await val(); if (r2.s1.qty !== 4 || r2.q1 !== 8) fallos.push('ventas: con stock insuficiente no debía cambiar nada');
    w.closeSaleEditor();
    // todo o nada: si falla un guardado a mitad, todo vuelve a como estaba
    await w.put('sales', { ...base, id: 8003, item: 'Aspa prueba', val: 5000, qty: 1, stockId: 9002, linea: 2, precioUnit: 5000, precioOriginal: 5000 });
    const before = await val(); const putOrig = w.put; let n = 0;
    await w.openSaleEditor(8001); await wait(100);
    const qs = doc.querySelectorAll('#ev-lines input[data-k=qty]'); setv(qs[0], '3'); setv(qs[1], '3');
    w.put = async (...a) => { if (a[0] === 'sales' && ++n === 2) throw new Error('fallo simulado'); return putOrig(...a); };
    await w.saveSaleEdit(); await wait(300); w.put = putOrig;
    const after = await val(), all = await w.getAll('sales'), s3 = all.find(x => x.id === 8003), k2 = (await w.getAll('stock')).find(x => x.id === 9002).q;
    if (after.s1.qty !== before.s1.qty || after.q1 !== before.q1 || !s3 || s3.qty !== 1 || k2 !== 11) fallos.push('ventas: el rollback no devolvió todo (antes ' + JSON.stringify([before.s1.qty, before.q1, before.q2]) + ' despues ' + JSON.stringify([after.s1.qty, after.q1, s3 && s3.qty, k2]) + ')');
    w.closeSaleEditor();
    for (const id of [8001, 8003]) await w.del('sales', id); for (const id of [9001, 9002]) await w.del('stock', id);
  } catch (e) { fallos.push('ventas (editor): ' + e.message); }
  fallos.push(...[...new Set(e1)].map(x => 'index: ' + x));
  w.close();

  // ── 2) Dashboard con los datos de la app ──
  const e2 = [];
  const d = abrir('dashboard.html', e2).window;
  await wait(2500);
  const caja = (d.document.getElementById('kpi-caja') || {}).textContent || '';
  if (!/110\.000/.test(caja) || /1[3-9]\d\.000/.test(caja)) fallos.push('dashboard: la caja debería ser $110.000 y muestra "' + caja + '" (adelantos/cobros contados dos veces)');
  if (/Cargando/i.test((d.document.getElementById('today-stats') || {}).textContent || '')) fallos.push('dashboard: se quedó en "Cargando..."');
  fallos.push(...[...new Set(e2)].map(x => 'dashboard: ' + x));
  d.close();

  if (fallos.length) { console.log('✗ Prueba de humo:\n  ' + fallos.join('\n  ')); process.exit(1); }
  console.log('· Prueba de humo: la app abre, desbloquea, crea una orden, recorre las pestañas y el dashboard carga');
  process.exit(0);
})().catch(e => { console.log('✗ Prueba de humo falló al iniciar: ' + e.message); process.exit(1); });
