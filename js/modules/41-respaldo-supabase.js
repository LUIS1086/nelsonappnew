/* Nelson App Pro · js/modules/41-respaldo-supabase.js
   Respaldo COMPLETO en tu propio Supabase (segunda copia, además de Drive):
   · Datos de las 10 tablas (órdenes, ventas, inventario, clientes, pagos, planes, chat…) en cada respaldo (~0,3 MB).
   · Fotos: cada una se sube UNA sola vez (huella SHA-256). Los respaldos siguientes solo suben las nuevas.
   · Restaurar descarga las fotos por partes (sin el límite de 100 MB del archivo JSON).
   · Automático: una vez al día al abrir la app, y también junto a cada respaldo de Drive.
   Usa la misma URL/clave del Seguimiento del cliente (js/seguimiento-config.js + clave secreta). Requiere supabase/respaldo.sql. */
(function () {
  'use strict';

  const C = window.SegCore;
  if (!C) { console.warn('[respaldo] falta 40-seguimiento.js'); return; }

  const byId = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { if (typeof showToast === 'function') showToast(m, t || 'info'); };
  const alertBox = (m, t, cb) => { if (typeof showAlert === 'function') showAlert(m, t || 'info', cb); else { window.alert(m); if (cb) cb(); } };
  const nap = () => new Promise(r => setTimeout(r, 0));

  const STORES = ['orders', 'stock', 'sales', 'gastos', 'clientes', 'payments', 'calificaciones', 'stockHistory', 'orderChat', 'paymentPlans'];
  const LS_LAST = 'respUltimo', LS_AUTO = 'respAuto';
  let busy = false;

  const last = () => { try { return JSON.parse(localStorage.getItem(LS_LAST) || 'null'); } catch (e) { return null; } };
  const fmtDate = ms => new Date(ms).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const fmtMB = b => (b / 1048576).toFixed(b < 1048576 ? 2 : 1) + ' MB';

  /* ───────────────────────── Fotos: huella, conversión ───────────────────────── */
  const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  function blobBuffer(b) {
    if (b.arrayBuffer) return b.arrayBuffer();
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsArrayBuffer(b); });
  }
  async function hashPhoto(p) { return hex(await crypto.subtle.digest('SHA-256', typeof p === 'string' ? new TextEncoder().encode(p) : await blobBuffer(p))); }
  const toDataUrl = b => typeof b === 'string' ? Promise.resolve(b) : new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });

  async function shrinkDataUrl(du) { // solo si una foto supera ~1 MB (no pasa con las fotos actuales: máx. ~110 KB)
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = du; });
      const sc = Math.min(1, 1600 / (img.naturalWidth || 1600)), cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.8);
    } catch (e) { return null; }
  }

  /* ───────────────────────── Respaldar ───────────────────────── */
  async function prepare(progress) {
    const data = {};
    for (const n of STORES) { try { data[n] = (await getAll(n)) || []; } catch (e) { data[n] = []; } }
    const photos = new Map(); // huella → foto (Blob o texto)
    const orders = []; let i = 0;
    const refsOf = async list => { const out = []; for (const p of (list || [])) { if (!p) continue; const h = await hashPhoto(p); out.push(h); if (!photos.has(h)) photos.set(h, p); } return out; };
    for (const o of data.orders) {
      progress('Analizando fotos…', ++i, data.orders.length);
      const fotosRef = await refsOf(o.fotos), fotosEntregaRef = await refsOf(o.fotosEntrega);
      orders.push(Object.assign({}, o, { fotos: [], fotosEntrega: [], fotosRef, fotosEntregaRef }));
      if (i % 25 === 0) await nap();
    }
    data.orders = orders;
    return { data, photos };
  }

  async function uploadMissing(photos, progress) {
    const all = Array.from(photos.keys()); let missing = [];
    for (let i = 0; i < all.length; i += 500) {
      const r = await C.rpc('resp_fotos_faltantes', { p_clave: C.clave(), p_hashes: all.slice(i, i + 500) }, 30000);
      missing = missing.concat(r || []);
    }
    const omitted = new Set(); let done = 0, batch = {}, count = 0, bytes = 0;
    const flush = async () => { if (!count) return; await C.rpc('resp_fotos_subir', { p_clave: C.clave(), p_fotos: batch }, 60000); batch = {}; count = 0; bytes = 0; };
    for (const h of missing) {
      let du = await toDataUrl(photos.get(h));
      if (du.length > 1400000) du = await shrinkDataUrl(du);
      if (!du || du.length > 1400000) { omitted.add(h); continue; }
      if (count && bytes + du.length > 900000) await flush();
      batch[h] = du; count++; bytes += du.length; done++;
      progress('Subiendo fotos nuevas…', done, missing.length - omitted.size);
    }
    await flush();
    return { total: all.length, nuevas: done, omitted };
  }

  async function respaldar(opts) {
    opts = opts || {}; const prog = opts.onProgress || function () {};
    if (busy) return { ok: false, reason: 'busy' };
    if (!C.configured()) return { ok: false, reason: 'config' };
    if (!navigator.onLine) return { ok: false, reason: 'offline' };
    busy = true;
    try {
      prog('Leyendo datos…', 0, 0);
      const { data, photos } = await prepare(prog);
      let up = await uploadMissing(photos, prog);
      const save = async () => {
        const omit = up.omitted;
        if (omit.size) data.orders.forEach(o => { o.fotosRef = o.fotosRef.filter(h => !omit.has(h)); o.fotosEntregaRef = o.fotosEntregaRef.filter(h => !omit.has(h)); });
        const refs = Array.from(photos.keys()).filter(h => !omit.has(h));
        const resumen = {
          ordenes: data.orders.length, fotos: refs.length, ventas: data.sales.length, inventario: data.stock.length,
          clientes: data.clientes.length, gastos: data.gastos.length, pagos: data.payments.length,
          fotosNuevas: up.nuevas, omitidas: omit.size
        };
        const body = JSON.stringify(Object.assign({ version: 1, date: new Date().toISOString() }, data));
        prog('Guardando el respaldo…', 0, 0);
        const etiqueta = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'App';
        const res = await C.rpc('resp_guardar', { p_clave: C.clave(), p_etiqueta: etiqueta, p_resumen: resumen, p_datos: body, p_refs: refs }, 90000);
        return { res, resumen, bytes: body.length };
      };
      let out;
      try { out = await save(); }
      catch (e) { // otro dispositivo limpió fotos justo ahora: se vuelven a subir y se reintenta una vez
        if (!/faltan_fotos/.test(e.message || '')) throw e;
        up = await uploadMissing(photos, prog); out = await save();
      }
      const info = { at: Date.now(), id: out.res.id, resumen: out.resumen, bytes: out.bytes };
      try { localStorage.setItem(LS_LAST, JSON.stringify(info)); } catch (e) { /* sin espacio */ }
      return { ok: true, info };
    } catch (e) {
      console.warn('[respaldo] error:', e);
      return { ok: false, error: e.message || String(e) };
    } finally { busy = false; }
  }
  window.respSupabaseRun = respaldar;

  /* ───────────────────────── Restaurar ───────────────────────── */
  async function restaurar(id, prog) {
    prog = prog || function () {};
    const meta = await C.rpc('resp_obtener', { p_clave: C.clave(), p_id: id }, 60000);
    if (!meta || !meta.datos) throw new Error('No se encontró ese respaldo.');
    const v = _validateBackup(JSON.parse(meta.datos));
    if (!v.ok) throw new Error(v.msg);
    const data = v.data;
    const refs = new Set();
    data.orders.forEach(o => (o.fotosRef || []).concat(o.fotosEntregaRef || []).forEach(h => refs.add(h)));
    const list = Array.from(refs), blobs = new Map();
    for (let i = 0; i < list.length; i += 10) { // las fotos se bajan ANTES de tocar nada local
      const got = await C.rpc('resp_fotos_obtener', { p_clave: C.clave(), p_hashes: list.slice(i, i + 10) }, 60000);
      for (const h of Object.keys(got || {})) { const b = b64toBlob(got[h]); if (b) blobs.set(h, b); }
      prog('Descargando fotos…', Math.min(i + 10, list.length), list.length);
      await nap();
    }
    const sinFoto = list.filter(h => !blobs.has(h)).length;
    prog('Aplicando respaldo…', 0, 0);
    window._segPausa = true; // el seguimiento del cliente no publica mientras se restaura
    try {
      for (const s of STORES) await clearStore(s);
      for (const o of data.orders) {
        const fotos = (o.fotosRef || []).map(h => blobs.get(h)).filter(Boolean);
        const fotosEntrega = (o.fotosEntregaRef || []).map(h => blobs.get(h)).filter(Boolean);
        const rest = Object.assign({}, o); delete rest.fotosRef; delete rest.fotosEntregaRef;
        await put('orders', Object.assign(rest, { fotos, fotosEntrega }));
      }
      for (const s of data.stock) await put('stock', typeof _normStock === 'function' ? _normStock(s) : s);
      for (const k of ['sales', 'gastos', 'clientes', 'payments', 'calificaciones', 'stockHistory', 'orderChat', 'paymentPlans']) for (const r of data[k]) await put(k, r);
      if (typeof _migrateStockFields === 'function') await _migrateStockFields();
      try { if (typeof updateTotal === 'function') await updateTotal(); if (typeof updateSuggestions === 'function') await updateSuggestions(); if (typeof renderCartera === 'function') await renderCartera(); } catch (e) { /* la recarga lo rehace */ }
    } catch (e) { window._segPausa = false; throw e; }
    return { ordenes: data.orders.length, fotos: list.length - sinFoto, sinFoto };
  }

  /* ───────────────────────── Automático ───────────────────────── */
  function autoReady() { return C.configured() && localStorage.getItem(LS_AUTO) !== '0' && !!last() && navigator.onLine && !busy && !window._segPausa; }
  async function maybeAuto(minHours) {
    if (!autoReady()) return;
    if (Date.now() - last().at < minHours * 3600e3) return;
    const r = await respaldar({});
    if (r.ok) toast('☁️ Respaldo en Supabase listo (' + r.info.resumen.fotos + ' fotos)', 'success');
  }
  setTimeout(() => maybeAuto(20), 45000);
  setInterval(() => maybeAuto(20), 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => maybeAuto(20), 6000); });
  // Se llama al terminar un respaldo en Drive: la segunda copia queda al día (máx. una vez cada 30 min)
  window.respSupabaseHook = function () { setTimeout(() => maybeAuto(0.5), 3000); };

  /* ───────────────────────── Pantalla ───────────────────────── */
  function sheet(id, inner) {
    let m = byId(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'sg-modal hidden'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m && !busy) m.classList.add('hidden'); }); }
    m.innerHTML = inner; m.classList.remove('hidden'); return m;
  }
  const close = () => { if (!busy) { const m = byId('rs-modal'); if (m) m.classList.add('hidden'); } };
  window.closeRespaldo = close;

  function setProg(txt, done, total) {
    const bar = byId('rs-bar'), t = byId('rs-prog'); if (!t) return;
    t.textContent = txt + (total ? ' ' + done + ' de ' + total : '');
    if (bar) { bar.hidden = !total; const i = bar.firstElementChild; if (i && total) i.style.width = Math.round(done / total * 100) + '%'; }
  }
  function lastLine() {
    const u = last();
    return u ? '✅ Último respaldo: ' + fmtDate(u.at) + ' · ' + u.resumen.ordenes + ' órdenes · ' + u.resumen.fotos + ' fotos' : 'Aún no hay respaldos en Supabase. Haz el primero ahora.';
  }
  function friendly(r) {
    if (r.reason === 'config') return 'Primero termina la configuración del Seguimiento del cliente (URL, clave y SQL).';
    if (r.reason === 'offline') return 'Sin conexión a internet.';
    if (/clave_invalida/.test(r.error || '')) return 'La clave no coincide con la de Supabase. Revísala en Seguimiento del cliente.';
    if (/PGRST202|404|resp_/.test(r.error || '')) return 'Supabase aún no tiene el respaldo instalado: ejecuta supabase/respaldo.sql en el SQL Editor.';
    return 'No se pudo completar el respaldo: ' + (r.error || 'error desconocido');
  }

  window.openRespaldoSupabase = function () {
    const ok = C.configured(), auto = localStorage.getItem(LS_AUTO) !== '0';
    sheet('rs-modal',
      '<div class="sg-panel"><div class="sg-head"><div class="sg-badge" style="background:rgba(34,197,94,.16)">☁️</div><div><h2>Respaldo en Supabase</h2><p>Copia completa con fotos en tu propia nube</p></div><button type="button" class="sg-x" onclick="closeRespaldo()" aria-label="Cerrar">×</button></div>' +
      '<div class="sg-body">' +
      (ok ? '' : '<div class="sg-status warn">Primero conecta Supabase en <b>Seguimiento del cliente</b> (URL, clave y SQL). Se usa la misma configuración.<br><button type="button" class="sg-btn full" onclick="closeRespaldo();openSeguimientoConfig()">Abrir configuración</button></div>') +
      '<div class="sg-status' + (last() ? ' ok' : '') + '" id="rs-last">' + esc(lastLine()) + '</div>' +
      '<div class="rs-bar" id="rs-bar" hidden><div></div></div><div class="sg-hint" id="rs-prog"></div>' +
      '<label class="sg-sw"><input type="checkbox" id="rs-auto" ' + (auto ? 'checked' : '') + ' onchange="respToggleAuto()"><span>Respaldo automático: una vez al día al abrir la app y junto al de Drive</span></label>' +
      '<p class="sg-hint">Guarda <b>todos</b> los datos y las fotos. Cada foto se sube una sola vez: los siguientes respaldos solo suben lo nuevo. Se conservan los últimos 30 y solo tú puedes leerlos (con tu clave).</p>' +
      '<div id="rs-list"></div></div>' +
      '<div class="sg-actions"><button type="button" class="sg-btn wa" id="rs-now" onclick="respBackupNow()">☁️ Respaldar ahora</button>' +
      '<button type="button" class="sg-btn" id="rs-restore" onclick="respMostrarLista()">🕘 Restaurar</button><button type="button" class="sg-btn" onclick="closeRespaldo()">Cerrar</button></div></div>');
  };

  window.respToggleAuto = function () { localStorage.setItem(LS_AUTO, byId('rs-auto').checked ? '1' : '0'); toast(byId('rs-auto').checked ? 'Respaldo automático activado' : 'Respaldo automático desactivado', 'info'); };

  window.respBackupNow = async function () {
    const now = byId('rs-now'), rb = byId('rs-restore'); if (now) now.disabled = true; if (rb) rb.disabled = true;
    const first = !last();
    const r = await respaldar({ onProgress: setProg });
    if (now) now.disabled = false; if (rb) rb.disabled = false;
    setProg('', 0, 0);
    const l = byId('rs-last');
    if (r.ok) {
      if (l) { l.className = 'sg-status ok'; l.textContent = lastLine(); }
      const x = r.info.resumen;
      toast('☁️ Respaldo guardado: ' + x.ordenes + ' órdenes, ' + x.fotos + ' fotos (' + x.fotosNuevas + ' nuevas)', 'success');
      if (x.omitidas) alertBox('Atención: ' + x.omitidas + ' foto(s) eran demasiado grandes y no se incluyeron.', 'warning');
      if (first) alertBox('✅ Primer respaldo listo. Desde ahora se actualiza solo cada día y cada vez que respaldes en Drive.', 'success');
    } else if (r.reason !== 'busy') {
      if (l) { l.className = 'sg-status bad'; l.textContent = '❌ ' + friendly(r); }
    }
  };

  window.respMostrarLista = async function () {
    const box = byId('rs-list'); if (!box) return;
    if (!C.configured()) { alertBox(friendly({ reason: 'config' }), 'warning'); return; }
    box.innerHTML = '<div class="sg-hint">Buscando respaldos…</div>';
    try {
      const rows = await C.rpc('resp_listar', { p_clave: C.clave() }, 30000);
      if (!rows || !rows.length) { box.innerHTML = '<div class="sg-status">Todavía no hay respaldos guardados en Supabase.</div>'; return; }
      box.innerHTML = '<p class="sg-h" style="margin:14px 0 8px">Elige el respaldo a restaurar</p>' + rows.map(r => {
        const s = r.resumen || {};
        return '<div class="rs-item"><div><strong>' + esc(fmtDate(Date.parse(r.created_at))) + '</strong><small>' + esc(s.ordenes || 0) + ' órdenes · ' + esc(s.fotos || 0) + ' fotos · ' + esc(s.ventas || 0) + ' ventas' + (r.etiqueta ? ' · ' + esc(r.etiqueta) : '') + '</small></div>' +
          '<button type="button" onclick="respRestore(' + Number(r.id) + ')">Restaurar</button></div>';
      }).join('');
    } catch (e) { box.innerHTML = '<div class="sg-status bad">❌ ' + esc(friendly({ error: e.message })) + '</div>'; }
  };

  window.respRestore = function (id) {
    showConfirm('¿Restaurar este respaldo de Supabase?\n\nSe reemplazará TODA la información actual (órdenes, fotos, ventas, inventario…). Si tienes dudas, haz antes un respaldo de lo actual.', async () => {
      const now = byId('rs-now'), rb = byId('rs-restore'); if (now) now.disabled = true; if (rb) rb.disabled = true; busy = true;
      try {
        const r = await restaurar(id, setProg);
        busy = false;
        alertBox('✅ Restauración exitosa: ' + r.ordenes + ' órdenes y ' + r.fotos + ' fotos.' + (r.sinFoto ? '\n⚠️ ' + r.sinFoto + ' foto(s) no estaban en la nube.' : '') + '\nLa app se recargará.', 'success', () => location.reload());
      } catch (e) {
        busy = false; setProg('', 0, 0); if (now) now.disabled = false; if (rb) rb.disabled = false;
        alertBox('No se pudo restaurar: ' + (e.message || e) + '\nTus datos actuales no se tocaron (si el error fue al descargar).', 'error');
      }
    });
  };
})();
