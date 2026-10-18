/* Nelson App Pro · js/modules/39-ticket-venta.js
   Venta con comprobante (Caja & Inventario):
   formulario → registra venta y descuenta stock → modal "Venta registrada" con acciones:
   WhatsApp al cliente · compartir imagen · PDF · imagen · imprimir.
   También permite reabrir el ticket de una venta desde el historial de la caja (openSaleTicket). */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sym = () => (typeof getCurrency === 'function' ? getCurrency() : '$');
  const money = v => sym() + Number(v || 0).toLocaleString('es-CO');
  const toast = (msg, type) => { if (typeof showToast === 'function') showToast(msg, type || 'info'); };
  const alertBox = (msg, type) => { if (typeof showAlert === 'function') showAlert(msg, type || 'info'); else window.alert(msg); };

  function biz() {
    try {
      const o = JSON.parse(localStorage.getItem('businessConfig') || '{}');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  const bizName = b => b.name || 'Todo Repuestos Nelson';
  const newId = () => (typeof _uid === 'function' ? _uid() : Date.now() * 1000 + Math.floor(Math.random() * 1000));

  /* ───────────────────────── Formulario de venta (carrito) ───────────────────────── */
  let invoiceStock = [];
  let cart = [];        // { stockId, n, qty, price }
  let submitting = false;

  const lineTotal = l => l.qty * l.price;
  const cartTotal = () => cart.reduce((a, l) => a + lineTotal(l), 0);

  // Suma al arreglo; si el producto ya estaba, junta cantidades y deja el último precio escrito.
  function mergeInto(arr, line) {
    const ex = arr.find(l => String(l.stockId) === String(line.stockId));
    if (ex) { ex.qty += line.qty; ex.price = line.price; } else arr.push(line);
  }

  // Lee el producto que está en pantalla (aún sin agregar). null = no hay producto elegido.
  function readPending() {
    const id = byId('inv-product').value;
    if (!id) return null;
    const item = invoiceStock.find(p => String(p.id) === String(id));
    const qty = parseInt(byId('inv-qty').value, 10), price = Number(byId('inv-price').value);
    if (!item || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(price) || price < 0) return { error: 'Revisa producto, cantidad y precio.' };
    const ya = (cart.find(l => String(l.stockId) === String(item.id)) || { qty: 0 }).qty;
    if (ya + qty > Number(item.q)) return { error: 'Stock insuficiente de «' + item.n + '». Disponible: ' + Number(item.q) + (ya ? ' (ya agregaste ' + ya + ')' : '') };
    return { line: { stockId: item.id, n: item.n, qty, price } };
  }

  function renderCart() {
    const box = byId('inv-cart'); if (!box) return;
    if (!cart.length) { box.innerHTML = '<div class="inv-cart-empty">Aún no agregas productos al ticket</div>'; return; }
    box.innerHTML = cart.map((l, i) =>
      '<div class="inv-line"><div class="inv-line-main"><strong>' + esc(l.n) + '</strong><small>' + esc(l.qty) + ' × ' + esc(money(l.price)) + '</small></div>' +
      '<span class="inv-line-sub">' + esc(money(lineTotal(l))) + '</span>' +
      '<button type="button" class="inv-line-x" onclick="removeInvoiceLine(' + i + ')" aria-label="Quitar ' + esc(l.n) + '">✕</button></div>').join('');
  }

  window.openInvoiceSaleModal = async function () {
    const modal = byId('invoice-sale-modal'); if (!modal) return;
    modal.classList.remove('hidden');
    byId('invoice-sale-form').reset(); byId('inv-qty').value = 1;
    cart = []; renderCart();
    submitting = false; const btn = byId('inv-submit'); if (btn) btn.disabled = false;
    const sel = byId('inv-product'); sel.innerHTML = '<option value="">Cargando inventario…</option>';
    try {
      invoiceStock = await getAll('stock');
      const available = invoiceStock.filter(p => Number(p.q) > 0).sort((a, b) => String(a.n || '').localeCompare(String(b.n || '')));
      sel.innerHTML = '<option value="">Selecciona un producto</option>' + available.map(p => '<option value="' + esc(p.id) + '">' + esc(p.n) + ' · ' + Number(p.q) + ' uds · ' + money(p.p) + '</option>').join('');
      if (!available.length) sel.innerHTML = '<option value="">No hay productos con stock</option>';
      window.updateInvoicePreview();
    } catch (err) {
      sel.innerHTML = '<option value="">No se pudo cargar el inventario</option>';
      alertBox('No se pudo cargar el inventario. Intenta de nuevo.', 'error');
    }
  };

  window.closeInvoiceSaleModal = function () { const m = byId('invoice-sale-modal'); if (m) m.classList.add('hidden'); };

  window.selectInvoiceProduct = function () {
    const item = invoiceStock.find(p => String(p.id) === String((byId('inv-product') || {}).value));
    byId('inv-price').value = item ? (Number(item.p) || 0) : '';
    window.updateInvoicePreview();
  };

  // Total = productos ya agregados + el producto que esté en pantalla (se incluye al registrar).
  window.updateInvoicePreview = function () {
    const pend = readPending();
    byId('inv-total').textContent = money(cartTotal() + (pend && pend.line ? lineTotal(pend.line) : 0));
  };

  window.addInvoiceLine = function () {
    const pend = readPending();
    if (!pend) { alertBox('Selecciona un producto para agregarlo al ticket.', 'warning'); return; }
    if (pend.error) { alertBox(pend.error, 'warning'); return; }
    mergeInto(cart, pend.line);
    byId('inv-product').value = ''; byId('inv-qty').value = 1; byId('inv-price').value = '';
    renderCart(); window.updateInvoicePreview();
  };

  window.removeInvoiceLine = function (i) {
    cart.splice(i, 1); renderCart(); window.updateInvoicePreview();
  };

  window.submitInvoiceSale = async function (ev) {
    ev.preventDefault();
    if (submitting) return; // evita ventas duplicadas por doble toque
    const pend = readPending();
    if (pend && pend.error) { alertBox(pend.error, 'warning'); return; }
    const lines = cart.map(l => ({ ...l }));
    if (pend && pend.line) mergeInto(lines, pend.line); // lo que quedó en pantalla sin pulsar «Agregar»
    const client = byId('inv-client').value.trim();
    if (!lines.length) { alertBox('Agrega al menos un producto al ticket.', 'warning'); return; }
    if (!client) { alertBox('Escribe el nombre del cliente.', 'warning'); return; }

    submitting = true;
    const btn = byId('inv-submit'); if (btn) btn.disabled = true;
    const doneStock = [], doneSales = [];
    let ok = false;
    try {
      // Se lee el stock actual (no el de cuando se abrió el modal) para no pisar ventas hechas entre tanto.
      const stockAll = await getAll('stock');
      const fresh = lines.map(l => stockAll.find(p => String(p.id) === String(l.stockId)));
      for (let i = 0; i < lines.length; i++) {
        if (!fresh[i]) { alertBox('«' + lines[i].n + '» ya no existe en el inventario.', 'error'); return; }
        if (lines[i].qty > Number(fresh[i].q)) { alertBox('Stock insuficiente de «' + lines[i].n + '». Disponible: ' + Number(fresh[i].q), 'error'); return; }
      }

      const now = Date.now(), invoiceNo = 'T-' + String(now).slice(-8);
      const usedIds = new Set();
      const mkId = () => { let id = newId(); while (usedIds.has(id)) id = newId(); usedIds.add(id); return id; };
      const common = {
        fecha: now, cliente: client, documento: byId('inv-id').value.trim(), telefono: byId('inv-phone').value.trim(),
        metodoPago: byId('inv-payment').value, comprobante: invoiceNo, observaciones: byId('inv-notes').value.trim()
      };
      try {
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i], f = fresh[i], prevQ = Number(f.q) || 0;
          f.q = prevQ - l.qty; await put('stock', f); doneStock.push({ f, prevQ });
          const sale = Object.assign({
            id: mkId(), item: f.n, val: lineTotal(l), qty: l.qty, stockId: f.id, linea: i + 1,
            precioUnit: l.price, precioOriginal: Number(f.p) || 0, precioModificado: l.price !== (Number(f.p) || 0)
          }, common);
          await put('sales', sale); doneSales.push(sale);
          if (typeof addStockMovementRecord === 'function') {
            try { await addStockMovementRecord(f.id, 'salida', l.qty, 'Venta con comprobante ' + invoiceNo, prevQ); }
            catch (e) { console.warn('No se pudo registrar el movimiento de stock:', e); }
          }
        }
        ok = true;
      } catch (err) {
        console.error('Error registrando venta con comprobante:', err);
        // Todo o nada: se borran las ventas guardadas y se devuelve el stock descontado.
        for (const s of doneSales) { try { await del('sales', s.id); } catch (e2) { console.error('No se pudo revertir la venta:', e2); } }
        for (const d of doneStock.reverse()) { try { d.f.q = d.prevQ; await put('stock', d.f); } catch (e2) { console.error('No se pudo revertir el stock:', e2); } }
        alertBox('No se pudo completar la venta. No se descontó stock. Revisa el inventario y vuelve a intentarlo.', 'error');
      }
    } catch (err) {
      console.error('Error preparando la venta:', err);
      alertBox('No se pudo leer el inventario. Intenta de nuevo.', 'error');
    } finally {
      submitting = false; if (btn) btn.disabled = false;
    }
    if (!ok) return;

    // Refrescar pantallas (un fallo aquí no invalida la venta ya guardada)
    try {
      if (typeof renderStock === 'function') await renderStock();
      if (typeof updateVentaSelect === 'function') await updateVentaSelect();
      if (typeof updateTotal === 'function') await updateTotal();
      if (typeof renderMovimientos === 'function') await renderMovimientos();
    } catch (e) { console.warn('No se pudo refrescar la vista tras la venta:', e); }

    window.closeInvoiceSaleModal();
    cart = [];
    showSaleTicket(ticketFromGroup(doneSales), true);
  };

  /* ───────────────────────── Modelo y diseño del ticket ───────────────────────── */
  // Una compra = una o varias ventas con el mismo comprobante y la misma fecha.
  function ticketFromGroup(sales) {
    const list = sales.slice().sort((x, y) => (Number(x.linea) || 0) - (Number(y.linea) || 0) || (Number(x.id) || 0) - (Number(y.id) || 0));
    const f = list[0];
    const items = list.map(s => {
      const qty = Number(s.qty) || 1, total = Number(s.val) || 0;
      return { item: s.item || 'Producto', qty, precioUnit: Number(s.precioUnit) || (total / qty), total };
    });
    return {
      ids: list.map(s => s.id),
      no: f.comprobante || ('V-' + String(f.id).slice(-8)),
      fecha: Number(f.fecha) || Date.now(),
      cliente: f.cliente || 'Cliente de mostrador',
      documento: f.documento || '',
      telefono: (list.find(s => s.telefono) || {}).telefono || '',
      items,
      total: items.reduce((a, it) => a + it.total, 0),
      metodoPago: f.metodoPago || '',
      observaciones: f.observaciones || ''
    };
  }

  function ticketMarkup(t, b) {
    const hr = '<div style="border-top:1px dashed #888;margin:10px 0"></div>';
    const row = (a, c, extra) => '<div style="display:flex;justify-content:space-between;gap:10px;' + (extra || '') + '"><span>' + a + '</span><span>' + c + '</span></div>';
    return '<div style="text-align:center">' +
      '<div style="font-size:16px;font-weight:700;line-height:1.25">' + esc(bizName(b)) + '</div>' +
      (b.nit ? '<div style="font-size:11px">NIT ' + esc(b.nit) + '</div>' : '') +
      (b.address ? '<div style="font-size:11px">' + esc(b.address) + '</div>' : '') +
      (b.phone ? '<div style="font-size:11px">Tel. ' + esc(b.phone) + '</div>' : '') +
      '<div style="margin-top:8px;font-weight:700;letter-spacing:1px">COMPROBANTE DE VENTA</div>' +
      '<div style="font-size:11px;color:#555">' + esc(t.no) + ' · ' + esc(new Date(t.fecha).toLocaleString('es-CO')) + '</div></div>' + hr +
      '<div><b>Cliente:</b> ' + esc(t.cliente) + '</div>' +
      (t.documento ? '<div><b>Doc/NIT:</b> ' + esc(t.documento) + '</div>' : '') +
      (t.telefono ? '<div><b>Tel:</b> ' + esc(t.telefono) + '</div>' : '') + hr +
      t.items.map((it, i) => '<div style="font-weight:700;' + (i ? 'margin-top:6px' : '') + '">' + esc(it.item) + '</div>' +
        row(esc(it.qty) + ' × ' + esc(money(it.precioUnit)), esc(money(it.total)))).join('') +
      (t.metodoPago ? '<div style="font-size:11px;color:#555;margin-top:6px">Pago: ' + esc(t.metodoPago) + '</div>' : '') +
      (t.observaciones ? '<div style="font-size:11px;color:#555">Obs.: ' + esc(t.observaciones) + '</div>' : '') + hr +
      row('TOTAL', esc(money(t.total)), 'font-size:16px;font-weight:700') + hr +
      '<div style="text-align:center;font-size:11px;color:#555">' + esc(b.footer || 'Gracias por tu compra.') + '</div>' +
      '<div style="text-align:center;font-size:9px;color:#777;margin-top:4px">Comprobante comercial; no es factura electrónica DIAN.</div>';
  }

  /* ───────────────────────── Modal "Venta registrada" ───────────────────────── */
  let state = null; // { t: ticket, b: businessConfig }

  function ensureModal() {
    let m = byId('ticket-sale-modal'); if (m) return m;
    m = document.createElement('div');
    m.id = 'ticket-sale-modal'; m.className = 'hidden';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tk-title');
    m.innerHTML =
      '<div class="tk-panel">' +
        '<div class="tk-head"><div class="tk-badge" id="tk-badge">✅</div><div><h2 id="tk-title">Venta registrada</h2><p id="tk-sub"></p></div>' +
        '<button type="button" class="tk-x" onclick="closeSaleTicket()" aria-label="Cerrar">×</button></div>' +
        '<div class="tk-body">' +
          '<div class="tk-paper-wrap"><div id="ticket-sale-capture" class="tk-paper" style="font-family:\'Courier New\',monospace;width:300px;background:#fff;color:#111;padding:18px 16px;box-sizing:border-box;font-size:12px;line-height:1.5"></div></div>' +
          '<div class="tk-phone"><label for="tk-phone">WhatsApp del cliente</label>' +
          '<input id="tk-phone" type="tel" inputmode="tel" maxlength="20" placeholder="Ej. 3001234567" autocomplete="off"></div>' +
          '<p class="tk-hint">«WhatsApp» envía el detalle como mensaje al número. Para mandar la imagen del ticket usa «Compartir» y elige el chat del cliente.</p>' +
        '</div>' +
        '<div class="tk-actions">' +
          '<button type="button" class="tk-btn wa" id="tk-wa" onclick="sendSaleTicketWhatsApp()">💬 Enviar por WhatsApp</button>' +
          '<button type="button" class="tk-btn" id="tk-share" onclick="shareSaleTicketImage()">📤 Compartir</button>' +
          '<button type="button" class="tk-btn" id="tk-pdf" onclick="downloadSaleTicketPdf()">📄 PDF</button>' +
          '<button type="button" class="tk-btn" id="tk-img" onclick="downloadSaleTicketImage()">🖼️ Imagen</button>' +
          '<button type="button" class="tk-btn" id="tk-print" onclick="printSaleTicket()">🖨️ Imprimir</button>' +
          '<button type="button" class="tk-btn done" onclick="closeSaleTicket()">Listo</button>' +
        '</div>' +
      '</div>';
    m.addEventListener('click', e => { if (e.target === m) window.closeSaleTicket(); });
    document.body.appendChild(m);
    return m;
  }

  function showSaleTicket(t, isNew) {
    const m = ensureModal(); const b = biz(); state = { t, b };
    byId('tk-title').textContent = isNew ? 'Venta registrada' : 'Comprobante ' + t.no;
    byId('tk-badge').textContent = isNew ? '✅' : '🧾';
    byId('tk-sub').textContent = isNew ? ('Comprobante ' + t.no + ' · ' + t.items.length + (t.items.length === 1 ? ' producto' : ' productos') + ' · stock actualizado') : 'Reenviar, descargar o imprimir';
    byId('ticket-sale-capture').innerHTML = ticketMarkup(t, b);
    byId('tk-phone').value = t.telefono || '';
    m.classList.remove('hidden');
  }

  window.closeSaleTicket = function () {
    const m = byId('ticket-sale-modal'); if (m) m.classList.add('hidden');
    state = null;
    try {
      const v = byId('view-ventas');
      if (v && !v.classList.contains('hidden') && typeof renderMovimientos === 'function') renderMovimientos();
    } catch (e) { /* no crítico */ }
  };

  // Reabrir el ticket de una venta ya registrada (botón 🧾 del historial de la caja)
  window.openSaleTicket = async function (id) {
    try {
      const all = await getAll('sales');
      const s = all.find(x => String(x.id) === String(id));
      if (!s) { alertBox('No se encontró la venta.', 'warning'); return; }
      const group = s.comprobante ? all.filter(x => x.comprobante === s.comprobante && x.fecha === s.fecha) : [s];
      showSaleTicket(ticketFromGroup(group.length ? group : [s]), false);
    } catch (e) {
      console.error('No se pudo abrir el ticket:', e);
      alertBox('No se pudo abrir el ticket de esta venta.', 'error');
    }
  };

  /* ───────────────────────── Acciones ───────────────────────── */
  const setBusy = (id, on) => { const el = byId(id); if (el) el.disabled = !!on; };
  const fileBase = () => 'ticket_' + String(state.t.no).replace(/[^\w-]/g, '');

  // Colombia: 10 dígitos o menos → antepone 57; si ya trae indicativo, lo respeta.
  function waNumber(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length < 7) return '';
    return d.length <= 10 ? '57' + d : d;
  }

  function waText(t, b) {
    const nombre = t.cliente && !/^cliente de mostrador$/i.test(t.cliente) ? ' ' + t.cliente : '';
    const lines = [
      '*' + bizName(b) + '*',
      '🧾 Comprobante *' + t.no + '*',
      new Date(t.fecha).toLocaleString('es-CO'),
      '',
      'Hola' + nombre + ', gracias por tu compra 🙌',
    ].concat(t.items.map(it => '• ' + it.item + ' × ' + it.qty + ' — ' + money(it.total)), ['Total: *' + money(t.total) + '*']);
    if (t.metodoPago) lines.push('Pago: ' + t.metodoPago);
    if (b.footer) lines.push('', b.footer);
    return lines.join('\n');
  }

  async function persistPhone(phone) {
    if (!state) return;
    const ids = state.t.ids.map(String);
    const mine = (await getAll('sales')).filter(x => ids.includes(String(x.id)));
    for (const s of mine) { s.telefono = phone; await put('sales', s); }
    state.t.telefono = phone;
  }

  window.sendSaleTicketWhatsApp = function () {
    if (!state) return;
    const raw = byId('tk-phone').value.trim();
    const num = waNumber(raw);
    if (!num) { alertBox('Escribe el número de WhatsApp del cliente (mínimo 7 dígitos).', 'warning'); byId('tk-phone').focus(); return; }
    try { sessionStorage.setItem('_waJump', '1'); } catch (e) { /* no crítico */ }
    // window.open va primero (sin await) para conservar el gesto del usuario y evitar bloqueos.
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(waText(state.t, state.b)), '_blank');
    if (raw !== state.t.telefono) persistPhone(raw).catch(e => console.warn('No se pudo guardar el teléfono:', e));
  };

  async function ticketCanvas() {
    if (typeof html2canvas === 'undefined') throw new Error('html2canvas no disponible');
    return html2canvas(byId('ticket-sale-capture'), { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  }
  const canvasBlob = canvas => new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('No se pudo crear la imagen')), 'image/png'));

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  window.shareSaleTicketImage = async function () {
    if (!state) return;
    setBusy('tk-share', true);
    try {
      const blob = await canvasBlob(await ticketCanvas());
      const file = new File([blob], fileBase() + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Comprobante ' + state.t.no, text: bizName(state.b) + ' · Comprobante ' + state.t.no + ' · ' + money(state.t.total) });
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return; // el usuario canceló
          console.warn('Compartir falló, se descarga la imagen:', e);
        }
      }
      downloadBlob(blob, file.name);
      toast('Este dispositivo no permite compartir archivos; se descargó la imagen.', 'info');
    } catch (e) {
      console.error(e); alertBox('No se pudo preparar la imagen del ticket.', 'error');
    } finally { setBusy('tk-share', false); }
  };

  window.downloadSaleTicketImage = async function () {
    if (!state) return;
    setBusy('tk-img', true);
    try {
      downloadBlob(await canvasBlob(await ticketCanvas()), fileBase() + '.png');
      toast('Imagen descargada', 'success');
    } catch (e) {
      console.error(e); alertBox('No se pudo guardar la imagen.', 'error');
    } finally { setBusy('tk-img', false); }
  };

  async function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/libs/jspdf.umd.min.js';
      s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar jsPDF. Comprueba la conexión y actualiza la app.'));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }

  window.downloadSaleTicketPdf = async function () {
    if (!state) return;
    setBusy('tk-pdf', true);
    try {
      const [JsPDF, canvas] = await Promise.all([loadJsPdf(), ticketCanvas()]);
      const w = 80, h = Math.max(40, w * canvas.height / canvas.width); // rollo de 80 mm
      const doc = new JsPDF({ unit: 'mm', format: [w, h], orientation: h >= w ? 'portrait' : 'landscape' });
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      downloadBlob(doc.output('blob'), fileBase() + '.pdf');
      toast('PDF descargado', 'success');
    } catch (e) {
      console.error(e); alertBox('No se pudo generar el PDF del ticket.', 'error');
    } finally { setBusy('tk-pdf', false); }
  };

  window.printSaleTicket = function () {
    if (!state) return;
    const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante ' + esc(state.t.no) + '</title>' +
      '<style>@page{size:80mm auto;margin:3mm}html,body{margin:0;background:#fff}body{font-family:"Courier New",monospace;font-size:12px;line-height:1.5;color:#111;width:72mm;padding:0 1mm}</style></head><body>' +
      ticketMarkup(state.t, state.b) + '</body></html>';
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(fr);
    try {
      const d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    } catch (e) { fr.remove(); alertBox('No se pudo preparar la impresión. Usa PDF o Compartir.', 'warning'); return; }
    setTimeout(() => {
      try { fr.contentWindow.focus(); fr.contentWindow.print(); }
      catch (e) { alertBox('Este dispositivo no permite imprimir desde aquí. Usa PDF o Compartir.', 'warning'); }
      setTimeout(() => { try { fr.remove(); } catch (e) { /* ya no existe */ } }, 60000);
    }, 250);
  };

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const tk = byId('ticket-sale-modal');
    if (tk && !tk.classList.contains('hidden')) { window.closeSaleTicket(); return; }
    window.closeInvoiceSaleModal();
  });
})();
