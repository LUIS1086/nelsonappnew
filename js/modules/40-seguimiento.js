/* Nelson App Pro · js/modules/40-seguimiento.js
   Seguimiento del cliente en vivo:
   · Publica cada orden en Supabase (solo datos de seguimiento, sin teléfono ni cédula) con un token aleatorio.
   · El cliente abre /seguimiento?t=TOKEN (QR o WhatsApp) y ve el estado, foto, valor y fechas.
   · Funciona sin internet: lo que no se pudo enviar queda en cola y se reintenta al volver la conexión.
   Los ganchos están en put()/del() de core/02 (segOnOrderPut / segOnOrderDel), saveOrder (segOfferAfterCreate)
   y buildWhatsappMsg (segAppendLink). Requiere supabase/seguimiento.sql y js/seguimiento-config.js. */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { if (typeof showToast === 'function') showToast(m, t || 'info'); };
  const alertBox = (m, t) => { if (typeof showAlert === 'function') showAlert(m, t || 'info'); else window.alert(m); };

  const LS = { clave: 'segClave', opts: 'segOpts', tokens: 'segTokens', pend: 'segPend', pendDel: 'segPendDel', fp: 'segFp' };
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio */ } };

  /* ───────────────────────── Configuración ───────────────────────── */
  function cfg() {
    const c = window.SEG_CONFIG || {};
    return { url: String(c.url || '').trim().replace(/\/+$/, ''), key: String(c.key || '').trim(), base: String(c.baseUrl || '').trim().replace(/\/+$/, '') };
  }
  const clave = () => String(localStorage.getItem(LS.clave) || '').trim();
  const opts = () => Object.assign({ mostrarValor: true, mostrarFotos: true, enlaceAuto: true }, jget(LS.opts, {}));
  const hasServer = () => { const c = cfg(); return !!(c.url && c.key); };
  const configured = () => hasServer() && clave().length >= 16;
  function biz() { try { const o = JSON.parse(localStorage.getItem('businessConfig') || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  const bizName = () => biz().name || 'Todo Repuestos Nelson';
  // Toma UN solo número (el primer celular colombiano del texto): el teléfono del negocio puede traer varios, ej. «314 265 7279 / 320 962 5781».
  const waNum = raw => {
    const t = String(raw || '');
    const m = t.match(/(?:\+?57[\s.-]*)?(3\d{2})[\s.-]*(\d{3})[\s.-]*(\d{4})/);
    if (m) return '57' + m[1] + m[2] + m[3];
    const d = t.replace(/\D/g, ''); if (d.length < 7) return '';
    return d.length <= 10 ? '57' + d : d.slice(0, 12);
  };
  const firstName = n => { const w = String(n || '').trim().split(/\s+/)[0] || ''; return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''; };
  const iso = ms => { const n = Number(ms); return n > 0 ? new Date(n).toISOString() : null; };

  async function rpc(name, args, timeoutMs) {
    const c = cfg(); const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs || 15000);
    const headers = { 'Content-Type': 'application/json', apikey: c.key };
    if (/^eyJ/.test(c.key)) headers.Authorization = 'Bearer ' + c.key; // las claves sb_publishable_ no son JWT
    try {
      const r = await fetch(c.url + '/rest/v1/rpc/' + name, { method: 'POST', headers, body: JSON.stringify(args), signal: ctrl.signal });
      if (!r.ok) {
        let msg = ''; try { msg = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
        const err = new Error(msg || ('HTTP ' + r.status)); err.status = r.status; throw err;
      }
      const txt = await r.text(); return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(t); }
  }

  /* ───────────────────────── Tokens y enlaces ───────────────────────── */
  function genToken() {
    const a = new Uint8Array(18); crypto.getRandomValues(a);
    let s = ''; a.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // 24 caracteres, 144 bits
  }
  // El token vive en la orden (segToken) y en un mapa local de respaldo, por si una edición vieja pisa el campo.
  function tokenFor(o) {
    const map = jget(LS.tokens, {});
    const t = o.segToken || map[o.id] || genToken();
    if (map[o.id] !== t) { map[o.id] = t; jset(LS.tokens, map); }
    return t;
  }
  function linkFor(token) {
    const c = cfg(); const base = c.base || (/^https?:/.test(location.protocol) ? location.origin : '');
    return base + '/seguimiento?t=' + token;
  }

  /* ───────────────────────── Publicación en Supabase ───────────────────────── */
  const silent = new Set();          // órdenes que la propia sincronización está guardando (para no entrar en bucle)
  const timers = new Map();
  const sentPhoto = new Map();       // token → firmas de foto ya enviadas en esta sesión
  let queue = Promise.resolve();
  let lastNotice = 0;

  async function shrink(src) {
    let url = null, rev = false;
    if (typeof src === 'string') url = src;
    else if (typeof Blob !== 'undefined' && src instanceof Blob) { url = URL.createObjectURL(src); rev = true; }
    else return null;
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('imagen')); i.src = url; });
      const w0 = img.naturalWidth || 560, sc = Math.min(1, 560 / w0);
      const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w0 * sc)); cv.height = Math.max(1, Math.round((img.naturalHeight || 420) * sc));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.6);
    } finally { if (rev) URL.revokeObjectURL(url); }
  }
  const photoSig = p => !p ? '' : (typeof p === 'string' ? p.length + ':' + p.slice(-24) : (p.size || 0) + ':' + (p.type || ''));

  async function buildPayload(o, token) {
    const op = opts(), b = biz(), val = op.mostrarValor;
    const body = {
      token, order_id: o.id,
      numero: (o.orderNum && typeof formatOrderNum === 'function') ? formatOrderNum(o.orderNum) : '',
      cliente: firstName(o.nom), equipo: String(o.equ || '').trim(), falla: String(o.det || '').trim(), estado: o.sta || 'recibido',
      presupuesto: o.presupuesto || 'pendiente', presu_valor: (o.presupuesto === 'enviado') ? (Number(o.val) || 0) : null, // el valor a aprobar siempre se muestra
      valor: val ? (Number(o.val) || 0) : null, adelanto: val ? (Number(o.adelanto) || 0) : null, saldo: val ? (Number(o.saldo) || 0) : null,
      fecha_ingreso: iso(o.fecha), fecha_estado: iso(o.fechaEstado || o.fechaEntrega), fecha_estimada: o.fechaEstimada || null,
      garantia_dias: Number(o.garantia) || null, negocio: bizName(), wa_negocio: waNum(b.phone),
      telefono: waNum(o.tel) || null // solo para los avisos automáticos (n8n); seg_obtener nunca lo devuelve al cliente
    };
    const sigs = {}; const prev = sentPhoto.get(token) || {};
    if (op.mostrarFotos) {
      const fi = (o.fotos || [])[0], ff = (o.fotosEntrega || [])[0];
      sigs.fi = photoSig(fi); sigs.ff = photoSig(ff);
      try { if (fi && sigs.fi !== prev.fi) body.foto_ingreso = await shrink(fi); } catch (e) { console.warn('[seguimiento] foto ingreso:', e); sigs.fi = prev.fi; }
      try { if (ff && sigs.ff !== prev.ff) body.foto_final = await shrink(ff); } catch (e) { console.warn('[seguimiento] foto final:', e); sigs.ff = prev.ff; }
    } else { body.foto_ingreso = ''; body.foto_final = ''; sigs.fi = sigs.ff = ''; }
    return { body, sigs };
  }

  const fingerprint = o => [o.sta, o.presupuesto, o.val, o.adelanto, o.saldo, o.equ, o.det, o.nom, o.tel, o.fechaEstimada, o.garantia, o.orderNum, (o.fotos || []).length, (o.fotosEntrega || []).length, JSON.stringify(opts())].join('|');
  const OLD_DONE = o => (o.sta === 'entregado' || o.sta === 'no-reparable') && (Date.now() - (Number(o.fechaEstado || o.fecha) || 0)) > 60 * 864e5;

  function setPending(id, on) {
    const list = new Set(jget(LS.pend, []));
    if (on) list.add(id); else list.delete(id);
    jset(LS.pend, [...list]);
  }

  async function doSync(id, force) {
    if (!configured()) return 'skip';
    try {
      const o = await getOne('orders', id);
      if (!o) return 'skip';
      if (!force && OLD_DONE(o)) return 'skip';
      const token = tokenFor(o);
      const fps = jget(LS.fp, {}), fp = fingerprint(o);
      if (!force && fps[token] === fp) return 'ok';
      if (o.segToken !== token) { o.segToken = token; silent.add(id); try { await put('orders', o); } finally { silent.delete(id); } }
      const { body, sigs } = await buildPayload(o, token);
      await rpc('seg_upsert', { p_clave: clave(), p: body });
      sentPhoto.set(token, sigs); fps[token] = fp; jset(LS.fp, fps); setPending(id, false);
      return 'ok';
    } catch (e) {
      console.warn('[seguimiento] no se pudo publicar:', e);
      if (/clave_invalida/.test(e.message || '')) {
        if (Date.now() - lastNotice > 60000) { lastNotice = Date.now(); toast('Seguimiento: la clave no coincide con Supabase. Revísala en Configuración.', 'warning'); }
        return 'error';
      }
      setPending(id, true); return 'pending';
    }
  }
  const syncOrder = (id, force) => (queue = queue.then(() => doSync(id, force)).catch(() => 'error'));
  const schedule = (id, ms) => { clearTimeout(timers.get(id)); timers.set(id, setTimeout(() => { timers.delete(id); syncOrder(id); }, ms)); };

  window.segOnOrderPut = function (o) {
    try { if (!o || window._segPausa || silent.has(o.id) || !configured()) return; schedule(o.id, 900); } catch (e) { /* nunca romper put() */ }
  };

  window.segOnOrderDel = function (id) {
    try {
      const map = jget(LS.tokens, {}); delete map[id]; jset(LS.tokens, map);
      clearTimeout(timers.get(id)); setPending(id, false);
      if (!configured()) return;
      rpc('seg_eliminar', { p_clave: clave(), p_order_id: id }).catch(() => {
        const l = new Set(jget(LS.pendDel, [])); l.add(id); jset(LS.pendDel, [...l]);
      });
    } catch (e) { /* nunca romper del() */ }
  };

  async function flushPending() {
    if (!configured() || !navigator.onLine) return;
    for (const id of jget(LS.pend, [])) await syncOrder(id);
    for (const id of jget(LS.pendDel, [])) {
      try { await rpc('seg_eliminar', { p_clave: clave(), p_order_id: id }); const l = new Set(jget(LS.pendDel, [])); l.delete(id); jset(LS.pendDel, [...l]); } catch (e) { /* se reintenta luego */ }
    }
  }
  window.addEventListener('online', () => setTimeout(flushPending, 1500));
  setTimeout(flushPending, 9000);

  /* ───────────────────────── Respuestas del cliente (presupuesto) ───────────────────────── */
  // El cliente aprueba/rechaza en su enlace → aquí se actualiza la orden (o.presupuesto) y se avisa en la app.
  let polling = false;
  const announced = new Set();
  const moneyFmt = n => (typeof getCurrency === 'function' ? getCurrency() : '$') + Number(n || 0).toLocaleString('es-CO');

  function announce(o, r) {
    const key = o.id + ':' + r.respuesta_at; if (announced.has(key)) return; announced.add(key);
    const ok = r.presupuesto_estado === 'aprobado';
    const quien = firstName(o.nom) || 'El cliente';
    const msg = (ok ? '✅ ' : '❌ ') + quien + (ok ? ' aprobó' : ' rechazó') + ' el presupuesto de ' + (String(o.equ || 'su equipo').trim()) + (Number(r.presupuesto_valor) > 0 ? ' (' + moneyFmt(r.presupuesto_valor) + ')' : '');
    toast(msg, ok ? 'success' : 'warning');
    try { if (navigator.vibrate) navigator.vibrate([180, 80, 180]); } catch (e) { /* no crítico */ }
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification('Presupuesto ' + (ok ? 'aprobado' : 'rechazado'), { body: msg, tag: 'seg-' + o.id }));
      }
    } catch (e) { /* no crítico */ }
  }

  async function pollRespuestas() {
    if (polling || !configured() || !navigator.onLine || window._segPausa) return;
    polling = true;
    try {
      const rows = await rpc('seg_respuestas', { p_clave: clave() }, 12000);
      if (!Array.isArray(rows) || !rows.length) return;
      const done = [];
      for (const r of rows) {
        const o = await getOne('orders', r.order_id);
        if (!o) { done.push(r.order_id); continue; }
        o.presupuesto = r.presupuesto_estado;
        o.presupuestoRespuesta = { at: Date.parse(r.respuesta_at) || Date.now(), valor: Number(r.presupuesto_valor) || 0, via: 'seguimiento' };
        silent.add(o.id);
        try { await put('orders', o); } finally { silent.delete(o.id); }
        done.push(r.order_id); announce(o, r);
      }
      if (done.length) {
        await rpc('seg_marcar_visto', { p_clave: clave(), p_order_ids: done }, 12000);
        try { if (typeof renderOrders === 'function') await renderOrders(); } catch (e) { /* no crítico */ }
      }
    } catch (e) {
      if (!/clave_invalida/.test(e.message || '')) console.warn('[seguimiento] respuestas:', e);
    } finally { polling = false; }
  }
  window.segPollRespuestas = pollRespuestas;
  setTimeout(pollRespuestas, 7000);
  setInterval(() => { if (document.visibilityState === 'visible') pollRespuestas(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(pollRespuestas, 2500); });
  window.addEventListener('online', () => setTimeout(pollRespuestas, 1500));

  /* ───────────────────────── Mensajes de WhatsApp ───────────────────────── */
  // Añade el enlace de seguimiento a los avisos del taller (recepción, revisión, presupuesto, listo, retraso).
  window.segAppendLink = function (msg, order, type) {
    try {
      if (!configured() || !opts().enlaceAuto || !order || !order.id) return msg;
      if (['recepcion', 'revision', 'presupuesto', 'listo', 'retraso'].indexOf(type) < 0) return msg;
      const token = tokenFor(order); schedule(order.id, 400); // se asegura de que el enlace ya esté publicado
      return msg + '\n\n🔎 Sigue tu equipo en vivo:\n' + linkFor(token);
    } catch (e) { return msg; }
  };

  const waText = (o, link) => '🔧 *' + bizName() + '*\n\nHola' + (o.nom ? ' ' + firstName(o.nom) : '') + ' 👋 Aquí puedes ver en vivo el estado de tu ' + String(o.equ || 'equipo').trim() + (o.orderNum && typeof formatOrderNum === 'function' ? ' (orden ' + formatOrderNum(o.orderNum) + ')' : '') + ':\n' + link;

  /* ───────────────────────── Interfaz ───────────────────────── */
  function qrDataUrl(text, size) {
    if (typeof QRCode === 'undefined') return '';
    const d = document.createElement('div');
    new QRCode(d, { text, width: size, height: size, colorDark: '#111827', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    const cv = d.querySelector('canvas'), im = d.querySelector('img');
    return cv ? cv.toDataURL('image/png') : (im ? im.src : '');
  }

  function sheet(id, inner) {
    let m = byId(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'sg-modal hidden'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }); }
    m.innerHTML = inner; m.classList.remove('hidden'); return m;
  }
  const closeSheet = id => { const m = byId(id); if (m) m.classList.add('hidden'); };

  let cur = null; // { o, token, link }

  window.openSeguimiento = async function (id) {
    if (!configured()) { window.openSeguimientoConfig(true); return; }
    let o = null;
    try { o = await getOne('orders', id); } catch (e) { /* abajo */ }
    if (!o) { alertBox('No se encontró la orden.', 'warning'); return; }
    const token = tokenFor(o), link = linkFor(token); cur = { o, token, link };
    const num = (o.orderNum && typeof formatOrderNum === 'function') ? formatOrderNum(o.orderNum) : '';
    const qr = qrDataUrl(link, 200);
    sheet('sg-modal',
      '<div class="sg-panel"><div class="sg-head"><div class="sg-badge">🔗</div><div style="min-width:0"><h2>Seguimiento del cliente</h2><p>' + esc(num) + (num ? ' · ' : '') + esc(o.equ || '') + '</p></div><button type="button" class="sg-x" onclick="closeSheetSeg(\'sg-modal\')" aria-label="Cerrar">×</button></div>' +
      '<div class="sg-body"><div class="sg-status" id="sg-status">⏳ Publicando…</div>' +
      '<div class="sg-qr">' + (qr ? '<img src="' + qr + '" alt="QR de seguimiento" width="200" height="200">' : '<p>No se pudo generar el QR</p>') + '<small>El cliente lo escanea y ve el estado de su equipo</small></div>' +
      '<div class="sg-hint" id="sg-presu" style="margin:-2px 0 12px">' + presuHint(o) + '</div>' +
      '<div class="sg-field"><label>Enlace</label><input id="sg-link" readonly value="' + esc(link) + '" onclick="this.select()"></div>' +
      '<div class="sg-field"><label for="sg-phone">WhatsApp del cliente</label><input id="sg-phone" type="tel" inputmode="tel" maxlength="20" placeholder="Ej. 3001234567" value="' + esc(o.tel || '') + '"></div>' +
      '</div><div class="sg-actions">' +
      '<button type="button" class="sg-btn wa" onclick="segSendWhatsApp()">💬 Enviar enlace por WhatsApp</button>' +
      '<button type="button" class="sg-btn" onclick="segCopyLink()">📋 Copiar</button>' +
      '<button type="button" class="sg-btn" onclick="segPrintSheet()">🖨️ Hoja con QR</button>' +
      '<button type="button" class="sg-btn" onclick="segPreview()">👁️ Ver como cliente</button>' +
      '<button type="button" class="sg-btn" onclick="closeSheetSeg(\'sg-modal\')">Listo</button></div></div>');
    const r = await syncOrder(id, true);
    const st = byId('sg-status'); if (!st) return;
    if (r === 'ok') { st.className = 'sg-status ok'; st.textContent = '✅ Publicado: el cliente ya puede abrir el enlace'; }
    else if (r === 'pending') { st.className = 'sg-status warn'; st.textContent = '⚠️ Sin conexión: se publicará solo cuando vuelva internet'; }
    else { st.className = 'sg-status bad'; st.textContent = '❌ No se pudo publicar. Revisa Configuración → Seguimiento'; }
  };
  window.closeSheetSeg = closeSheet;

  function presuHint(o) {
    const e = o.presupuesto || 'pendiente', r = o.presupuestoRespuesta;
    const cuando = r && r.at ? ' el ' + new Date(r.at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '';
    if (e === 'enviado') return (Number(o.val) > 0) ? '💰 El cliente puede <b>aprobar o rechazar el presupuesto</b> desde este enlace.' : '⚠️ Pon el valor de la reparación para que el cliente pueda aprobar el presupuesto.';
    if (e === 'aprobado') return '✅ Presupuesto aprobado' + (r ? ' por el cliente' + cuando : '') + '.';
    if (e === 'rechazado') return '❌ Presupuesto rechazado' + (r ? ' por el cliente' + cuando : '') + '.';
    return '💡 Para que el cliente apruebe desde el enlace, marca el presupuesto como <b>«Enviado»</b> en la orden y pon el valor.';
  }

  window.segCopyLink = async function () {
    if (!cur) return;
    try { await navigator.clipboard.writeText(cur.link); toast('Enlace copiado', 'success'); }
    catch (e) { const i = byId('sg-link'); if (i) { i.select(); try { document.execCommand('copy'); toast('Enlace copiado', 'success'); } catch (e2) { alertBox('Copia el enlace manualmente.', 'info'); } } }
  };
  window.segPreview = function () { if (cur) window.open(cur.link, '_blank'); };
  window.segSendWhatsApp = function () {
    if (!cur) return;
    const num = waNum((byId('sg-phone') || {}).value);
    if (!num) { alertBox('Escribe el número de WhatsApp del cliente (mínimo 7 dígitos).', 'warning'); const i = byId('sg-phone'); if (i) i.focus(); return; }
    try { sessionStorage.setItem('_waJump', '1'); } catch (e) { /* no crítico */ }
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(waText(cur.o, cur.link)), '_blank');
  };

  window.segPrintSheet = function () {
    if (!cur) return;
    const o = cur.o, b = biz(), qr = qrDataUrl(cur.link, 260);
    const num = (o.orderNum && typeof formatOrderNum === 'function') ? formatOrderNum(o.orderNum) : '';
    const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Seguimiento ' + esc(num) + '</title><style>@page{size:auto;margin:6mm}html,body{margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}.c{width:78mm;margin:0 auto;text-align:center;padding:4mm 0}h1{font-size:16px;margin:0 0 2px}p{margin:3px 0;font-size:12px}.s{font-size:10px;color:#555}.q{margin:10px auto 4px;width:56mm;height:56mm}.l{font-size:9px;color:#444;word-break:break-all;margin-top:4px}.k{border-top:1px dashed #999;margin:8px 0}.b{font-size:13px;font-weight:700}</style></head><body><div class="c">' +
      '<h1>' + esc(bizName()) + '</h1>' + (b.phone ? '<p class="s">Tel. ' + esc(b.phone) + '</p>' : '') + '<div class="k"></div>' +
      '<p class="b">' + esc(num ? 'Orden ' + num : 'Orden de reparación') + '</p><p>' + esc(o.equ || '') + '</p><p class="s">' + esc(o.nom || '') + ' · ' + esc(new Date(Number(o.fecha) || Date.now()).toLocaleDateString('es-CO')) + '</p><div class="k"></div>' +
      '<p class="b">📲 Sigue tu equipo en vivo</p>' + (qr ? '<img class="q" src="' + qr + '" alt="QR">' : '') +
      '<p class="s">Escanea el código con la cámara de tu celular y ve el estado de tu reparación, fotos y valor.</p><p class="l">' + esc(cur.link) + '</p></div></body></html>';
    const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(fr);
    try { const d = fr.contentWindow.document; d.open(); d.write(html); d.close(); } catch (e) { fr.remove(); alertBox('No se pudo preparar la hoja para imprimir.', 'warning'); return; }
    setTimeout(() => {
      try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { alertBox('Este dispositivo no permite imprimir desde aquí. Comparte el QR por WhatsApp.', 'warning'); }
      setTimeout(() => { try { fr.remove(); } catch (e) { /* ya no está */ } }, 60000);
    }, 350);
  };

  // Aviso ligero al registrar una orden nueva (solo si el seguimiento ya está configurado)
  window.segOfferAfterCreate = function (order) {
    try {
      if (!configured() || !order || !order.id) return;
      tokenFor(order); schedule(order.id, 300);
      const old = byId('sg-snack'); if (old) old.remove();
      const s = document.createElement('div'); s.id = 'sg-snack'; s.className = 'sg-snack';
      s.innerHTML = '<span>🔗 ¿Enviar el seguimiento al cliente?</span><button type="button" id="sg-snack-go">Enviar / QR</button><button type="button" id="sg-snack-x" aria-label="Cerrar">✕</button>';
      document.body.appendChild(s);
      const close = () => { s.classList.add('out'); setTimeout(() => s.remove(), 250); };
      byId('sg-snack-go').onclick = () => { close(); window.openSeguimiento(order.id); };
      byId('sg-snack-x').onclick = close;
      setTimeout(() => { if (s.isConnected) close(); }, 14000);
    } catch (e) { /* no crítico */ }
  };

  /* ───────────────────────── Configuración ───────────────────────── */
  function sqlClave(k) { return "update public.seguimiento_config set clave_hash = encode(sha256(convert_to('" + String(k).replace(/'/g, "''") + "','utf8')),'hex') where id = 1;\n" +
    "insert into public.seguimiento_config (id, clave_hash) select 1, encode(sha256(convert_to('" + String(k).replace(/'/g, "''") + "','utf8')),'hex') where not exists (select 1 from public.seguimiento_config where id = 1);"; }

  window.openSeguimientoConfig = function (needSetup) {
    const c = cfg(), op = opts(), k = clave();
    const host = c.url ? c.url.replace(/^https?:\/\//, '') : '';
    sheet('sg-config',
      '<div class="sg-panel"><div class="sg-head"><div class="sg-badge">🔗</div><div><h2>Seguimiento del cliente</h2><p>Enlace y QR para ver el estado del equipo</p></div><button type="button" class="sg-x" onclick="closeSheetSeg(\'sg-config\')" aria-label="Cerrar">×</button></div>' +
      '<div class="sg-body">' +
      (needSetup ? '<div class="sg-status warn">Primero termina la configuración (3 pasos abajo) para poder enviar enlaces.</div>' : '') +
      '<div class="sg-step"><b>1</b><div><strong>Supabase</strong><p>' + (hasServer() ? '✅ Conectado a <code>' + esc(host) + '</code>' : '❌ Falta la URL y la clave publicable en <code>js/seguimiento-config.js</code>, y ejecutar <code>supabase/seguimiento.sql</code> en el SQL Editor.') + '</p></div></div>' +
      '<div class="sg-step"><b>2</b><div><strong>Clave secreta de la app</strong><p>Solo tu app la conoce. Protege la escritura en tu base de datos.</p>' +
      '<div class="sg-row"><input id="sgc-clave" type="text" autocomplete="off" spellcheck="false" placeholder="Mínimo 16 caracteres" value="' + esc(k) + '" onchange="segGuardarClave()"><button type="button" class="sg-mini" onclick="segGenerarClave()">🎲 Generar</button></div>' +
      '<button type="button" class="sg-btn full" onclick="segCopiarSql()">📋 Copiar SQL de la clave (pégalo y ejecútalo en Supabase)</button></div></div>' +
      '<div class="sg-step"><b>3</b><div><strong>Probar</strong><button type="button" class="sg-btn full" onclick="segProbar()">🔌 Probar conexión</button><div id="sgc-result" class="sg-status" hidden></div></div></div>' +
      '<div class="sg-sep"></div><p class="sg-h">Qué ve el cliente</p>' +
      '<label class="sg-sw"><input type="checkbox" id="sgc-valor" ' + (op.mostrarValor ? 'checked' : '') + ' onchange="segGuardarOpts()"><span>Mostrar el valor y el saldo</span></label>' +
      '<label class="sg-sw"><input type="checkbox" id="sgc-fotos" ' + (op.mostrarFotos ? 'checked' : '') + ' onchange="segGuardarOpts()"><span>Mostrar fotos del equipo</span></label>' +
      '<label class="sg-sw"><input type="checkbox" id="sgc-auto" ' + (op.enlaceAuto ? 'checked' : '') + ' onchange="segGuardarOpts()"><span>Agregar el enlace a los avisos de WhatsApp (recibido, revisión, listo…)</span></label>' +
      '<div class="sg-sep"></div><button type="button" class="sg-btn full" onclick="segPublicarTodas()">🔄 Publicar las órdenes activas ahora</button><div id="sgc-prog" class="sg-hint"></div>' +
      '</div></div>');
  };

  window.segGuardarClave = function () { const v = String((byId('sgc-clave') || {}).value || '').trim(); localStorage.setItem(LS.clave, v); if (v && v.length < 16) toast('La clave debe tener al menos 16 caracteres', 'warning'); };
  window.segGenerarClave = function () {
    const a = new Uint8Array(24); crypto.getRandomValues(a); let s = ''; a.forEach(b => { s += String.fromCharCode(b); });
    const k = btoa(s).replace(/[+/=]/g, '').slice(0, 28); byId('sgc-clave').value = k; localStorage.setItem(LS.clave, k);
    toast('Clave generada. Ahora copia el SQL y ejecútalo en Supabase.', 'success');
  };
  window.segCopiarSql = async function () {
    window.segGuardarClave(); const k = clave();
    if (k.length < 16) { alertBox('Escribe o genera una clave de al menos 16 caracteres primero.', 'warning'); return; }
    try { await navigator.clipboard.writeText(sqlClave(k)); toast('SQL copiado. Pégalo en Supabase → SQL Editor → Run', 'success'); }
    catch (e) { alertBox('No se pudo copiar automáticamente. Mantén presionada la clave para copiarla.', 'warning'); }
  };
  window.segGuardarOpts = function () {
    jset(LS.opts, { mostrarValor: !!byId('sgc-valor').checked, mostrarFotos: !!byId('sgc-fotos').checked, enlaceAuto: !!byId('sgc-auto').checked });
    jset(LS.fp, {}); // cambia lo que se publica: se vuelve a enviar todo cuando cada orden se toque
    toast('Preferencias guardadas', 'success');
  };
  window.segProbar = async function () {
    window.segGuardarClave();
    const out = byId('sgc-result'); const show = (cls, t) => { out.hidden = false; out.className = 'sg-status ' + cls; out.textContent = t; };
    if (!hasServer()) { show('bad', '❌ Falta la URL o la clave publicable en js/seguimiento-config.js'); return; }
    show('warn', '⏳ Probando…');
    try { await rpc('seg_obtener', { p_token: 'x'.repeat(24) }, 12000); }
    catch (e) { show('bad', /404|PGRST202|function/i.test(String(e.status) + e.message) ? '❌ Supabase no tiene las funciones: ejecuta supabase/seguimiento.sql' : '❌ No se pudo conectar: ' + e.message); return; }
    if (clave().length < 16) { show('warn', '⚠️ Conexión correcta. Falta la clave secreta (paso 2).'); return; }
    try { const ok = await rpc('seg_probar', { p_clave: clave() }, 12000); show(ok ? 'ok' : 'bad', ok ? '✅ Todo listo: conexión y clave correctas' : '❌ La clave no coincide. Copia el SQL de la clave y ejecútalo en Supabase.'); }
    catch (e) { show('bad', '❌ ' + e.message); }
  };
  window.segPublicarTodas = async function () {
    if (!configured()) { alertBox('Termina primero los pasos 1 y 2.', 'warning'); return; }
    const prog = byId('sgc-prog'); const orders = (await getAll('orders')).filter(o => o.sta !== 'entregado' && o.sta !== 'no-reparable');
    if (!orders.length) { prog.textContent = 'No hay órdenes activas.'; return; }
    let ok = 0, fail = 0;
    for (let i = 0; i < orders.length; i++) {
      prog.textContent = 'Publicando ' + (i + 1) + ' de ' + orders.length + '…';
      (await syncOrder(orders[i].id, true)) === 'ok' ? ok++ : fail++;
    }
    prog.textContent = '✅ ' + ok + ' publicadas' + (fail ? ' · ⚠️ ' + fail + ' pendientes (se reintentan solas)' : '');
  };
  // Utilidades compartidas con el respaldo en Supabase (41-respaldo-supabase.js)
  window.SegCore = { rpc, configured, clave, hasServer };
})();
