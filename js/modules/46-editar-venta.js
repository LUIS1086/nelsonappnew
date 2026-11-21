/* Nelson App Pro · js/modules/46-editar-venta.js  (v3.9.19)
   Corregir una venta ya registrada: cantidad, precio, quitar un producto y datos del cliente.
   · Se abre desde el botón ✏️ del historial de la caja y desde el botón «Corregir» del comprobante.
   · Ajusta el inventario por la diferencia (y deja movimientos de stock «Corrección de venta»).
   · Todo o nada: si algo falla, se devuelven la venta y el stock a como estaban.
   · Guarda un historial de las correcciones en cada línea (campo `ediciones`).
   No cambia ninguna función existente: solo agrega openSaleEditor(id). */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof getCurrency === 'function' ? getCurrency() : '$') + Number(v || 0).toLocaleString('es-CO');
  const toast = (m, t) => { if (typeof showToast === 'function') showToast(m, t || 'info'); };
  const alertBox = (m, t) => { if (typeof showAlert === 'function') showAlert(m, t || 'info'); else window.alert(m); };
  const esAux = s => s && (s.tipo === 'adelanto' || s.tipo === 'cobro_entrega'); // dinero de órdenes: no se edita aquí
  const clone = o => JSON.parse(JSON.stringify(o));

  let st = null;        // { rows:[{sale, stock, qty, price, removed}], head:{...}, busy:false }

  /* ── Datos ── */
  function unitPrice(s) {
    const q = Number(s.qty) || 1;
    const p = Number(s.precioUnit);
    return Number.isFinite(p) && p > 0 ? p : (Number(s.val) || 0) / q;
  }
  function groupOf(all, s) {
    return s.comprobante ? all.filter(x => x.comprobante === s.comprobante && x.fecha === s.fecha && !esAux(x)) : [s];
  }

  /* ── Modal ── */
  function ensureModal() {
    let m = byId('sale-edit-modal'); if (m) return m;
    m = document.createElement('div');
    m.id = 'sale-edit-modal'; m.className = 'hidden';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'ev-title');
    m.innerHTML =
      '<div class="ev-panel">' +
        '<div class="ev-head"><div class="ev-badge">✏️</div><div><h2 id="ev-title">Corregir venta</h2><p id="ev-sub"></p></div>' +
        '<button type="button" class="ev-x" onclick="closeSaleEditor()" aria-label="Cerrar">×</button></div>' +
        '<div class="ev-body">' +
          '<div id="ev-warn" class="ev-warn" hidden></div>' +
          '<div class="ev-sec">Productos</div><div id="ev-lines"></div>' +
          '<div class="ev-sec">Datos del cliente</div>' +
          '<div class="ev-grid">' +
            '<label class="ev-f full">Cliente<input id="ev-cliente" type="text" maxlength="80" autocomplete="off"></label>' +
            '<label class="ev-f">Teléfono<input id="ev-tel" type="tel" inputmode="tel" maxlength="20" autocomplete="off"></label>' +
            '<label class="ev-f">Doc / NIT<input id="ev-doc" type="text" maxlength="30" autocomplete="off"></label>' +
            '<label class="ev-f">Método de pago<select id="ev-pago"></select></label>' +
            '<label class="ev-f full">Observaciones<textarea id="ev-obs" rows="2" maxlength="300"></textarea></label>' +
          '</div>' +
          '<div id="ev-diff" class="ev-diff" hidden></div>' +
        '</div>' +
        '<div class="ev-foot">' +
          '<div class="ev-total"><span>Total</span><strong id="ev-total">$0</strong></div>' +
          '<div class="ev-actions"><button type="button" class="ev-btn" onclick="closeSaleEditor()">Cancelar</button>' +
          '<button type="button" class="ev-btn primary" id="ev-save" onclick="saveSaleEdit()">Guardar cambios</button></div>' +
        '</div>' +
      '</div>';
    m.addEventListener('click', e => { if (e.target === m) window.closeSaleEditor(); });
    document.body.appendChild(m);
    return m;
  }

  function paymentOptions(current) {
    const sel = byId('ev-pago'); sel.innerHTML = '';
    let opts = [];
    const src = byId('inv-payment');
    if (src) opts = Array.from(src.options).map(o => o.value || o.textContent);
    if (!opts.length) opts = ['Efectivo', 'Transferencia', 'Tarjeta'];
    if (current && !opts.includes(current)) opts.unshift(current);
    opts.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
    sel.value = current || opts[0];
  }

  function renderLines() {
    const box = byId('ev-lines'); box.innerHTML = '';
    st.rows.forEach((r, i) => {
      const d = document.createElement('div'); d.className = 'ev-line' + (r.removed ? ' off' : '');
      const stockTxt = r.stock ? ('En inventario: ' + (Number(r.stock.q) || 0)) : 'Ya no está en el inventario';
      d.innerHTML =
        '<div class="ev-line-top"><div class="ev-name"><strong>' + esc(r.sale.item || 'Producto') + '</strong><small>' + esc(stockTxt) + '</small></div>' +
        '<button type="button" class="ev-rm" data-i="' + i + '" aria-label="' + (r.removed ? 'Volver a incluir' : 'Quitar producto') + '">' + (r.removed ? 'Deshacer' : 'Quitar') + '</button></div>' +
        '<div class="ev-line-in">' +
          '<label class="ev-f">Cantidad<input type="number" min="1" step="1" inputmode="numeric" data-k="qty" data-i="' + i + '" value="' + r.qty + '"' + (r.removed ? ' disabled' : '') + '></label>' +
          '<label class="ev-f">Precio c/u<input type="number" min="0" step="any" inputmode="decimal" data-k="price" data-i="' + i + '" value="' + r.price + '"' + (r.removed ? ' disabled' : '') + '></label>' +
          '<div class="ev-sub"><span>Subtotal</span><strong id="ev-sub-' + i + '">' + (r.removed ? '—' : money(r.qty * r.price)) + '</strong></div>' +
        '</div>';
      box.appendChild(d);
    });
    box.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', onLine));
    box.querySelectorAll('.ev-rm').forEach(b => b.addEventListener('click', () => { const r = st.rows[+b.dataset.i]; r.removed = !r.removed; renderLines(); refresh(); }));
  }

  function onLine(e) {
    const r = st.rows[+e.target.dataset.i], k = e.target.dataset.k;
    const v = parseFloat(e.target.value);
    r[k] = Number.isFinite(v) ? v : 0;
    const sub = byId('ev-sub-' + e.target.dataset.i); if (sub) sub.textContent = money(r.qty * r.price);
    refresh();
  }

  // Resumen de cambios y total; habilita «Guardar» solo si hay algo distinto
  function changes() {
    const out = [];
    st.rows.forEach(r => {
      const q0 = Number(r.sale.qty) || 1, p0 = unitPrice(r.sale);
      if (r.removed) out.push({ r, kind: 'remove' });
      else if (r.qty !== q0 || Math.abs(r.price - p0) > 1e-9) out.push({ r, kind: 'edit', q0, p0 });
    });
    return out;
  }
  function headChanged() {
    const h = st.head;
    return byId('ev-cliente').value.trim() !== h.cliente || byId('ev-tel').value.trim() !== h.telefono ||
      byId('ev-doc').value.trim() !== h.documento || byId('ev-pago').value !== h.metodoPago || byId('ev-obs').value.trim() !== h.observaciones;
  }
  function refresh() {
    const ch = changes();
    const total = st.rows.filter(r => !r.removed).reduce((a, r) => a + r.qty * r.price, 0);
    byId('ev-total').textContent = money(total);
    const lines = [];
    ch.forEach(c => {
      const n = c.r.sale.item || 'Producto';
      if (c.kind === 'remove') lines.push('Se quita «' + esc(n) + '» y vuelven ' + (Number(c.r.sale.qty) || 1) + ' al inventario');
      else if (c.r.qty !== c.q0) { const d = c.r.qty - c.q0; lines.push('«' + esc(n) + '»: ' + (d > 0 ? 'salen ' + d + ' más' : 'vuelven ' + (-d)) + ' del inventario'); }
    });
    const df = byId('ev-diff');
    df.hidden = !lines.length; df.innerHTML = lines.length ? '<b>Inventario</b><br>' + lines.join('<br>') : '';
    const bad = st.rows.some(r => !r.removed && (!(r.qty >= 1) || !Number.isInteger(r.qty) || !(r.price >= 0)));
    byId('ev-save').disabled = st.busy || bad || (!ch.length && !headChanged());
  }

  /* ── Abrir / cerrar ── */
  window.openSaleEditor = async function (id) {
    try {
      const all = await getAll('sales');
      const s = all.find(x => String(x.id) === String(id));
      if (!s) { alertBox('No se encontró la venta.', 'warning'); return; }
      if (esAux(s)) { alertBox('Este registro es un adelanto o cobro de una orden; se corrige desde la orden.', 'info'); return; }
      const group = groupOf(all, s).sort((a, b) => (Number(a.linea) || 0) - (Number(b.linea) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));
      const stock = await getAll('stock');
      const f = group[0];
      st = {
        busy: false,
        rows: group.map(x => ({ sale: x, stock: stock.find(p => String(p.id) === String(x.stockId)) || null, qty: Number(x.qty) || 1, price: unitPrice(x), removed: false })),
        head: { cliente: f.cliente || '', telefono: (group.find(x => x.telefono) || {}).telefono || '', documento: f.documento || '', metodoPago: f.metodoPago || '', observaciones: f.observaciones || '' }
      };
      const m = ensureModal();
      byId('ev-sub').textContent = (f.comprobante ? 'Comprobante ' + f.comprobante + ' · ' : '') + new Date(Number(f.fecha) || Date.now()).toLocaleString('es-CO');
      byId('ev-cliente').value = st.head.cliente; byId('ev-tel').value = st.head.telefono;
      byId('ev-doc').value = st.head.documento; byId('ev-obs').value = st.head.observaciones;
      paymentOptions(st.head.metodoPago);
      ['ev-cliente', 'ev-tel', 'ev-doc', 'ev-obs', 'ev-pago'].forEach(i => { const el = byId(i); el.oninput = refresh; el.onchange = refresh; });
      const cierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
      const w = byId('ev-warn');
      w.hidden = !(Number(f.fecha) <= cierre && cierre > 0);
      w.textContent = 'Esta venta es de antes del último cierre de caja: el cambio no modifica la caja actual, solo los reportes e inventario.';
      renderLines(); refresh();
      m.classList.remove('hidden');
    } catch (e) {
      console.error('No se pudo abrir el editor de venta:', e);
      alertBox('No se pudo abrir la venta para corregirla.', 'error');
    }
  };
  window.closeSaleEditor = function () { const m = byId('sale-edit-modal'); if (m) m.classList.add('hidden'); st = null; };

  /* ── Guardar (todo o nada) ── */
  window.saveSaleEdit = async function () {
    if (!st || st.busy) return;
    const ch = changes(), keep = st.rows.filter(r => !r.removed);
    if (!keep.length) {
      const ok = await new Promise(res => {
        if (typeof showConfirm === 'function') showConfirm('Quitaste todos los productos: se anulará la venta completa y volverá todo al inventario. ¿Continuar?', () => res(true));
        else res(window.confirm('Se anulará la venta completa. ¿Continuar?'));
        setTimeout(() => res(false), 60000);
      });
      if (!ok) return;
    }
    st.busy = true; refresh();
    const savedSales = [], savedStock = new Map(), createdMoves = [];
    let okSave = false, firstId = null;
    try {
      const stockAll = await getAll('stock');
      // Copias de trabajo: la app comparte en memoria los objetos leídos (caché); así no se ensucian si algo falla.
      const work = new Map();
      const fresh = r => {
        const key = String(r.sale.stockId);
        if (!work.has(key)) { const o = stockAll.find(p => String(p.id) === key); work.set(key, o ? clone(o) : null); }
        return work.get(key);
      };
      // 1) validar stock antes de tocar nada
      for (const c of ch) {
        if (c.kind !== 'edit') continue;
        const f = fresh(c.r), d = c.r.qty - c.q0;
        if (f && d > 0 && d > Number(f.q)) { alertBox('Stock insuficiente de «' + (c.r.sale.item || 'Producto') + '». Disponible: ' + Number(f.q) + '.', 'error'); st.busy = false; refresh(); return; }
      }
      const head = {
        cliente: byId('ev-cliente').value.trim() || 'Cliente de mostrador', telefono: byId('ev-tel').value.trim(),
        documento: byId('ev-doc').value.trim(), metodoPago: byId('ev-pago').value, observaciones: byId('ev-obs').value.trim()
      };
      const comp = st.rows[0].sale.comprobante || '';
      const motivo = 'Corrección de venta' + (comp ? ' ' + comp : '');
      const mueve = async (f, tipo, qty, why) => {
        if (typeof addStockMovementRecord !== 'function') return;
        try { await addStockMovementRecord(f.id, tipo, qty, why, Number(f.q)); } catch (e) { console.warn('No se pudo registrar el movimiento de stock:', e); }
      };
      const snapStock = f => { if (!savedStock.has(String(f.id))) savedStock.set(String(f.id), clone(stockAll.find(p => String(p.id) === String(f.id)))); };

      // 2) aplicar
      for (const r of st.rows) {
        const f = fresh(r), q0 = Number(r.sale.qty) || 1;
        if (r.removed) {
          savedSales.push(clone(r.sale));
          if (f) { snapStock(f); const prev = Number(f.q) || 0; f.q = prev + q0; await put('stock', f); await mueve({ id: f.id, q: prev }, 'entrada', q0, motivo + ' (producto quitado)'); }
          await del('sales', r.sale.id);
          continue;
        }
        const p0 = unitPrice(r.sale), d = r.qty - q0;
        const s = clone(r.sale); savedSales.push(clone(r.sale));
        if (f && d !== 0) { snapStock(f); const prev = Number(f.q) || 0; f.q = prev - d; await put('stock', f); await mueve({ id: f.id, q: prev }, d > 0 ? 'salida' : 'entrada', Math.abs(d), motivo); }
        if (d !== 0 || Math.abs(r.price - p0) > 1e-9) {
          s.ediciones = (s.ediciones || []).concat([{ t: Date.now(), qty: q0, precioUnit: p0, val: Number(s.val) || 0 }]).slice(-5);
          s.qty = r.qty; s.precioUnit = r.price; s.val = r.qty * r.price;
          s.precioModificado = r.price !== (Number(s.precioOriginal) || (f ? Number(f.p) : r.price));
        }
        Object.assign(s, head);
        await put('sales', s);
        if (firstId == null) firstId = s.id;
      }
      okSave = true;
    } catch (err) {
      console.error('Error corrigiendo la venta:', err);
      // revertir: ventas y stock a como estaban (las quitadas se vuelven a crear)
      for (const s of savedSales.reverse()) { try { await put('sales', s); } catch (e2) { console.error('No se pudo revertir la venta:', e2); } }
      for (const f of savedStock.values()) { try { await put('stock', f); } catch (e2) { console.error('No se pudo revertir el stock:', e2); } }
      alertBox('No se pudo guardar la corrección. La venta y el inventario quedaron como estaban.', 'error');
    }
    if (st) st.busy = false;
    if (!okSave) { refresh(); return; }
    try {
      if (typeof renderStock === 'function') await renderStock();
      if (typeof updateVentaSelect === 'function') await updateVentaSelect();
      if (typeof updateTotal === 'function') await updateTotal();
      if (typeof renderMovimientos === 'function') await renderMovimientos();
    } catch (e) { console.warn('No se pudo refrescar la vista tras corregir:', e); }
    window.closeSaleEditor();
    toast(firstId == null ? 'Venta anulada ✓' : 'Venta corregida ✓', 'success');
  };
})();
