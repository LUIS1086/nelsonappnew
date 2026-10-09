/* Nelson App Pro · js/modules/13-ventas-precios-caja.js
   Ventas, selector de producto, editor de precios y caja
   (extraido sin cambios de index.html; el orden de carga importa) */
        async function updateVentaSelect() {
            const stock = await getAll('stock');
            document.getElementById('v-select').innerHTML =
                '<option value="">-- Seleccionar producto --</option>' +
                stock.filter(s => s.q > 0).sort((a,b)=>a.n.localeCompare(b.n))
                     .map(s=>`<option value="${s.id}">${escapeHtml(s.n)} · ${s.q} uds · ${getCurrency()}${s.p.toLocaleString()}</option>`)
                     .join('');
            // Si había un producto seleccionado visualmente pero ya no existe, limpiar label
            const sel = document.getElementById('v-select');
            const lbl = document.getElementById('v-select-label');
            if (sel && lbl && sel.value) {
                const still = stock.find(s => String(s.id) === String(sel.value) && s.q > 0);
                if (!still) {
                    sel.value = '';
                    lbl.innerText = '-- Seleccionar producto --';
                    lbl.style.color = '#94a3b8';
                    // Limpiar estado del precio y ocultar tarjeta
                    customSalePrice = null;
                    if (typeof hidePriceCard === 'function') hidePriceCard();
                }
            }
        }

        // ============ SELECTOR CUSTOM DE PRODUCTO (bottom sheet) ============
        function openProductPicker() {
            const modal = document.getElementById('modal-product-picker');
            if (!modal) return;
            document.getElementById('pp-search').value = '';
            modal.classList.remove('hidden');
            renderProductPicker();
            // Focus al search con leve delay para que se vea la animación
            setTimeout(() => document.getElementById('pp-search')?.focus(), 280);
        }
        function closeProductPicker() {
            const modal = document.getElementById('modal-product-picker');
            if (modal) modal.classList.add('hidden');
        }

        function _ppNormalize(s) {
            return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        }

        async function renderProductPicker() {
            const stock = await getAll('stock');
            const list = document.getElementById('pp-list');
            if (!list) return;
            const q = _ppNormalize((document.getElementById('pp-search')?.value || '').trim());
            const cur = getCurrency();

            // Filtrar por búsqueda (todos, con y sin stock)
            let matched = stock;
            if (q) {
                matched = matched.filter(s =>
                    _ppNormalize(s.n).includes(q) ||
                    _ppNormalize(s.code || '').includes(q)
                );
            }
            const withStock    = matched.filter(s => (Number(s.q) || 0) > 0).sort((a,b) => String(a.n||'').localeCompare(String(b.n||'')));
            const withoutStock = matched.filter(s => (Number(s.q) || 0) <= 0).sort((a,b) => String(a.n||'').localeCompare(String(b.n||'')));

            if (withStock.length === 0 && withoutStock.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#64748b;">
                    <div style="font-size:38px;opacity:0.4;margin-bottom:10px;">📭</div>
                    <div style="font-size:13px;font-weight:700;">${q ? 'Sin resultados para tu búsqueda' : 'No hay productos en el inventario'}</div>
                    <div style="font-size:11px;color:#475569;margin-top:6px;">${q ? 'Prueba con otro nombre o código' : 'Agrega productos desde Caja → Inventario'}</div>
                </div>`;
                return;
            }

            const renderItem = (s, disabled) => {
                const qNum = Number(s.q) || 0;
                const outOfStock = qNum <= 0;
                const low = qNum > 0 && qNum <= (Number(s.minStock) || 3);
                const stockColor = outOfStock ? '#64748b' : (low ? '#fb923c' : '#34d399');
                const stockBg    = outOfStock ? 'rgba(100,116,139,0.12)' : (low ? 'rgba(249,115,22,0.15)' : 'rgba(16,185,129,0.12)');
                const stockBord  = outOfStock ? 'rgba(100,116,139,0.25)' : (low ? 'rgba(249,115,22,0.3)' : 'rgba(16,185,129,0.25)');
                const stockLabel = outOfStock ? 'AGOTADO' : `${qNum} uds${low ? ' · BAJO' : ''}`;
                const onClick = disabled ? '' : `onclick="pickProduct(${s.id})"`;
                const cursorStyle = disabled ? 'cursor:not-allowed;opacity:0.55;' : 'cursor:pointer;';
                return `<button type="button" ${onClick} style="width:100%;text-align:left;margin:6px 0;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;${cursorStyle}display:flex;align-items:center;gap:12px;transition:all 0.15s ease;">
                    <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05));border:1px solid rgba(16,185,129,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📦</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:800;color:#f1f5f9;line-height:1.2;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:0.2px;">${escapeHtml(s.n || 'Sin nombre')}</div>
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <span style="font-size:14px;font-weight:900;color:#34d399;font-variant-numeric:tabular-nums;">${cur}${(Number(s.p)||0).toLocaleString()}</span>
                            <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;background:${stockBg};color:${stockColor};border:1px solid ${stockBord};">${stockLabel}</span>
                            ${s.code ? `<span style="font-size:10px;color:#64748b;font-family:monospace;">#${escapeHtml(s.code)}</span>` : ''}
                        </div>
                    </div>
                    <div style="color:#475569;font-size:14px;flex-shrink:0;">${disabled ? '' : '›'}</div>
                </button>`;
            };

            let html = withStock.map(s => renderItem(s, false)).join('');

            if (withoutStock.length > 0) {
                html += `<div style="padding:16px 4px 6px;font-size:9px;font-weight:900;color:#475569;letter-spacing:2.5px;text-transform:uppercase;border-top:1px solid rgba(255,255,255,0.04);margin-top:10px;">Sin stock (${withoutStock.length})</div>`;
                html += withoutStock.map(s => renderItem(s, true)).join('');
            }

            list.innerHTML = html;
        }

        async function pickProduct(id) {
            const stock = await getAll('stock');
            const item = stock.find(s => s.id === id);
            if (!item) { closeProductPicker(); return; }
            // Sincronizar con el select oculto para que processSale siga funcionando
            const sel = document.getElementById('v-select');
            if (sel) sel.value = String(item.id);
            // Label del botón selector
            const lbl = document.getElementById('v-select-label');
            if (lbl) {
                const cur = getCurrency();
                lbl.innerHTML = `<span style="color:#f1f5f9;">${escapeHtml(item.n)}</span> <span style="color:#64748b;font-weight:700;font-size:11px;">· ${item.q} uds</span>`;
                lbl.style.color = '';
            }
            // Reset cualquier override previo y mostrar tarjeta de precio
            customSalePrice = null;
            showPriceCard(item);
            updatePriceCardTotal();
            closeProductPicker();
            setTimeout(() => document.getElementById('v-qty')?.focus(), 200);
        }

        // ============ TARJETA DE PRECIO DEL PRODUCTO SELECCIONADO ============
        function showPriceCard(item) {
            const card = document.getElementById('v-price-card');
            const amount = document.getElementById('v-price-card-amount');
            const strike = document.getElementById('v-price-card-strike');
            const savings = document.getElementById('v-price-card-savings');
            const label = document.getElementById('v-price-card-label');
            const editBtn = document.getElementById('v-price-edit-btn');
            if (!card || !amount) return;
            const cur = getCurrency();
            const origP = Number(item.p) || 0;
            const hasOverride = customSalePrice !== null && customSalePrice !== origP;
            const shown = hasOverride ? customSalePrice : origP;
            amount.innerText = cur + shown.toLocaleString();

            if (hasOverride) {
                // Mostrar precio original tachado + badge de ahorro/recargo
                strike.classList.remove('hidden');
                strike.innerText = cur + origP.toLocaleString();
                savings.classList.remove('hidden');
                const diff = shown - origP;
                if (diff < 0) {
                    const pct = origP > 0 ? Math.round((diff / origP) * -100) : 0;
                    savings.innerHTML = `<span>💸</span> Rebaja ${cur}${Math.abs(diff).toLocaleString()} · ${pct}%`;
                    savings.style.background = 'rgba(248,113,113,0.12)';
                    savings.style.borderColor = 'rgba(248,113,113,0.3)';
                    savings.style.color = '#f87171';
                } else {
                    savings.innerHTML = `<span>↑</span> Recargo ${cur}${diff.toLocaleString()}`;
                    savings.style.background = 'rgba(52,211,153,0.12)';
                    savings.style.borderColor = 'rgba(52,211,153,0.3)';
                    savings.style.color = '#34d399';
                }
                label.innerText = 'PRECIO AJUSTADO PARA ESTA VENTA';
                label.style.color = '#fb923c';
                amount.style.color = '#fb923c';
                card.style.borderColor = 'rgba(251,146,60,0.35)';
                card.style.background = 'linear-gradient(135deg,rgba(251,146,60,0.10) 0%,rgba(15,23,42,0.4) 100%)';
                if (editBtn) editBtn.innerHTML = '<span style="font-size:14px;">✏️</span><span>Cambiar</span>';
            } else {
                strike.classList.add('hidden');
                savings.classList.add('hidden');
                label.innerText = 'PRECIO UNITARIO';
                label.style.color = '#34d399';
                amount.style.color = '#f1f5f9';
                card.style.borderColor = 'rgba(16,185,129,0.22)';
                card.style.background = 'linear-gradient(135deg,rgba(16,185,129,0.10) 0%,rgba(15,23,42,0.4) 100%)';
                if (editBtn) editBtn.innerHTML = '<span style="font-size:14px;">✏️</span><span>Editar</span>';
            }
            card.classList.remove('hidden');
            card.style.display = '';
        }

        function hidePriceCard() {
            const card = document.getElementById('v-price-card');
            if (card) { card.classList.add('hidden'); card.style.display = 'none'; }
            const tp = document.getElementById('v-total-preview');
            if (tp) { tp.classList.add('hidden'); tp.style.display = 'none'; }
        }

        async function updatePriceCardTotal() {
            const sel = document.getElementById('v-select');
            const qtyEl = document.getElementById('v-qty');
            const tp = document.getElementById('v-total-preview');
            const tpAmount = document.getElementById('v-total-preview-amount');
            if (!sel || !qtyEl || !tp || !tpAmount) return;
            if (!sel.value) { tp.classList.add('hidden'); tp.style.display = 'none'; return; }
            const qty = parseInt(qtyEl.value);
            if (!qty || qty <= 0) { tp.classList.add('hidden'); tp.style.display = 'none'; return; }
            const stock = await getAll('stock');
            const item = stock.find(s => String(s.id) === String(sel.value));
            if (!item) return;
            const origP = Number(item.p) || 0;
            const unit = (customSalePrice !== null) ? customSalePrice : origP;
            const cur = getCurrency();
            tpAmount.innerText = cur + (unit * qty).toLocaleString();
            tp.classList.remove('hidden');
            tp.style.display = '';
        }

        // ============ EDITOR DE PRECIO (modal bottom-sheet) ============
        async function openPriceEditor() {
            const sel = document.getElementById('v-select');
            if (!sel || !sel.value) return;
            const stock = await getAll('stock');
            const item = stock.find(s => String(s.id) === String(sel.value));
            if (!item) return;
            const origP = Number(item.p) || 0;
            const cur = getCurrency();
            // Poblar UI del modal
            document.getElementById('pe-product-name').innerText = item.n || 'Producto';
            document.getElementById('pe-currency').innerText = cur;
            document.getElementById('pe-original').innerText = cur + origP.toLocaleString();
            const input = document.getElementById('pe-input');
            // Si ya hay override activo, precargarlo; si no, usar el precio original como punto de partida
            const starting = (customSalePrice !== null) ? customSalePrice : origP;
            input.value = starting;
            input.dataset.origP = String(origP);
            updatePriceEditorPreview();
            // Abrir modal
            const modal = document.getElementById('modal-price-editor');
            modal.classList.remove('hidden');
            setTimeout(() => { input.focus(); input.select(); }, 280);
        }

        function closePriceEditor() {
            const modal = document.getElementById('modal-price-editor');
            if (modal) modal.classList.add('hidden');
        }

        function clearPriceEditorInput() {
            const input = document.getElementById('pe-input');
            if (input) { input.value = ''; updatePriceEditorPreview(); input.focus(); }
        }

        function onPriceEditorInput() {
            const wrap = document.getElementById('pe-input-wrap');
            if (wrap) wrap.classList.add('pe-focused');
            updatePriceEditorPreview();
        }

        function updatePriceEditorPreview() {
            const input = document.getElementById('pe-input');
            const newEl = document.getElementById('pe-new');
            const card = document.getElementById('pe-new-card');
            const diffLine = document.getElementById('pe-diff-line');
            const applyBtn = document.getElementById('pe-apply-btn');
            if (!input || !newEl || !diffLine) return;
            const cur = getCurrency();
            const origP = Number(input.dataset.origP) || 0;
            const val = parseFloat(input.value);
            if (isNaN(val) || val < 0) {
                newEl.innerText = cur + '0';
                diffLine.innerHTML = '<span style="color:#64748b;">Ingresa un precio válido</span>';
                if (applyBtn) { applyBtn.style.opacity = '0.5'; applyBtn.style.pointerEvents = 'none'; }
                return;
            }
            if (applyBtn) { applyBtn.style.opacity = '1'; applyBtn.style.pointerEvents = ''; }
            newEl.innerText = cur + val.toLocaleString();
            const diff = val - origP;
            if (diff < 0) {
                const pct = origP > 0 ? Math.round((diff / origP) * -100) : 0;
                diffLine.innerHTML = `<span style="color:#f87171;">💸 Rebaja de <strong>${cur}${Math.abs(diff).toLocaleString()}</strong> · ${pct}% menos</span>`;
                newEl.style.color = '#f87171';
                if (card) { card.style.borderColor = 'rgba(248,113,113,0.35)'; card.style.background = 'linear-gradient(135deg,rgba(248,113,113,0.12),rgba(248,113,113,0.04))'; }
            } else if (diff > 0) {
                const pct = origP > 0 ? Math.round((diff / origP) * 100) : 0;
                diffLine.innerHTML = `<span style="color:#34d399;">↑ Recargo de <strong>${cur}${diff.toLocaleString()}</strong> · ${pct}% más</span>`;
                newEl.style.color = '#34d399';
                if (card) { card.style.borderColor = 'rgba(52,211,153,0.35)'; card.style.background = 'linear-gradient(135deg,rgba(52,211,153,0.12),rgba(52,211,153,0.04))'; }
            } else {
                diffLine.innerHTML = `<span style="color:#94a3b8;">Mismo precio del inventario</span>`;
                newEl.style.color = '#fb923c';
                if (card) { card.style.borderColor = 'rgba(251,146,60,0.3)'; card.style.background = 'linear-gradient(135deg,rgba(251,146,60,0.12),rgba(251,146,60,0.04))'; }
            }
            // Pulso sutil al cambiar
            if (card) { card.classList.remove('pe-pulse'); void card.offsetWidth; card.classList.add('pe-pulse'); }
        }

        function applyPriceDiscount(pct) {
            const input = document.getElementById('pe-input');
            if (!input) return;
            const origP = Number(input.dataset.origP) || 0;
            const discounted = Math.round(origP * (1 - pct/100));
            input.value = discounted;
            updatePriceEditorPreview();
        }

        function roundPriceTo(step) {
            const input = document.getElementById('pe-input');
            if (!input) return;
            const cur = parseFloat(input.value);
            if (isNaN(cur)) {
                const origP = Number(input.dataset.origP) || 0;
                input.value = Math.floor(origP / step) * step;
            } else {
                input.value = Math.floor(cur / step) * step;
            }
            updatePriceEditorPreview();
        }

        function adjustPriceBy(delta) {
            const input = document.getElementById('pe-input');
            if (!input) return;
            let cur = parseFloat(input.value);
            if (isNaN(cur)) cur = Number(input.dataset.origP) || 0;
            const next = Math.max(0, cur + delta);
            input.value = next;
            updatePriceEditorPreview();
        }

        function resetPriceEditor() {
            const input = document.getElementById('pe-input');
            if (!input) return;
            const origP = Number(input.dataset.origP) || 0;
            input.value = origP;
            updatePriceEditorPreview();
        }

        async function applyPriceEditor() {
            const input = document.getElementById('pe-input');
            if (!input) return;
            const val = parseFloat(input.value);
            if (isNaN(val) || val < 0) return showAlert('Ingresa un precio válido', 'warning');
            const origP = Number(input.dataset.origP) || 0;
            // Si queda igual al original, lo tratamos como "sin override"
            customSalePrice = (val === origP) ? null : val;
            // Refrescar tarjeta
            const sel = document.getElementById('v-select');
            if (sel && sel.value) {
                const stock = await getAll('stock');
                const item = stock.find(s => String(s.id) === String(sel.value));
                if (item) showPriceCard(item);
            }
            updatePriceCardTotal();
            closePriceEditor();
            if (navigator.vibrate) { try { navigator.vibrate(15); } catch(e){} }
        }

        // Cerrar picker / editor al presionar Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const pe = document.getElementById('modal-price-editor');
                if (pe && !pe.classList.contains('hidden')) { closePriceEditor(); return; }
                const m = document.getElementById('modal-product-picker');
                if (m && !m.classList.contains('hidden')) closeProductPicker();
            }
        });

        async function processSale() {
            const id  = document.getElementById('v-select').value;
            const qty = parseInt(document.getElementById('v-qty').value);
            if (!id || isNaN(qty) || qty <= 0) return showAlert('Selecciona un producto e ingresa una cantidad válida.', 'warning');
            const stock = await getAll('stock');
            const item  = stock.find(x => x.id == id);
            if (!item || qty > item.q) return showAlert('Stock insuficiente para esta cantidad.', 'error');

            // Precio personalizado para esta venta (no modifica el inventario)
            const origP = Number(item.p) || 0;
            const priceOverridden = (customSalePrice !== null && customSalePrice !== origP);
            const unitPrice = priceOverridden ? customSalePrice : origP;

            const prevQ = item.q;
            item.q -= qty;
            await put('stock', item); // Solo se descuenta stock — el precio del producto (item.p) NO se toca
            const saleRecord = {
                id: _uid(),
                item: item.n,
                val: unitPrice * qty,
                qty,
                stockId: item.id,
                fecha: Date.now()
            };
            if (priceOverridden) {
                saleRecord.precioUnit = unitPrice;
                saleRecord.precioOriginal = origP;
                saleRecord.precioModificado = true;
            }
            await put('sales', saleRecord);
            const motivoMov = priceOverridden
                ? `Venta (precio ajustado: ${getCurrency()}${unitPrice.toLocaleString()} c/u)`
                : 'Venta';
            await addStockMovementRecord(item.id, 'salida', qty, motivoMov, prevQ);
            playBeep();
            await renderStock(); await updateVentaSelect(); await updateTotal();
            // Reset completo del formulario de venta
            document.getElementById('v-qty').value = '';
            const sel = document.getElementById('v-select'); if (sel) sel.value = '';
            const lbl = document.getElementById('v-select-label');
            if (lbl) { lbl.innerText = '-- Seleccionar producto --'; lbl.style.color = '#94a3b8'; }
            customSalePrice = null;
            hidePriceCard();
        }
        async function annulSale(id) {
            showConfirm('¿Anular esta venta y devolver al stock?', async () => {
                const sales = await getAll('sales');
                const sale  = sales.find(s => s.id === id);
                if (!sale) return;
                const stock = await getAll('stock');
                const item  = stock.find(i => i.id === sale.stockId);
                if (item) {
                    const prevQ = item.q;
                    item.q += sale.qty;
                    await put('stock', item);
                    await addStockMovementRecord(item.id, 'entrada', sale.qty, 'Anulación de venta', prevQ);
                }
                await del('sales', id);
                await renderStock(); await updateVentaSelect(); await updateTotal();
            });
        }

        // CAJA
        function showCierreConfirmModal() {
            const total = document.getElementById('modal-caja-total')?.innerText || '$0';
            document.getElementById('cierre-monto-preview').innerText = total;
            document.getElementById('modal-confirm').classList.remove('hidden');
            closeCajaModal();
        }
        function closeConfirmModal() { document.getElementById('modal-confirm').classList.add('hidden'); }
        async function openCajaModal() {
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const orders = await getAll('orders'); const sales = await getAll('sales'); const gastos = await getAll('gastos');
            const cur = getCurrency();
            const tOrders = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) > lastCierre).reduce((a,b) => a + (b.val||0), 0);
            const tSales = sales.filter(v => v.fecha > lastCierre && v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega').reduce((a,b) => a + (b.val||0), 0);
            const tGastos = gastos.filter(g => g.fecha > lastCierre).reduce((a,b) => a + (b.val||0), 0);
            document.getElementById('modal-caja-ingresos').innerText = 'Ingresos: ' + cur + (tOrders + tSales).toLocaleString();
            document.getElementById('modal-caja-gastos').innerText = 'Gastos: ' + cur + tGastos.toLocaleString();
            document.getElementById('modal-caja-total').innerText = cur + (tOrders + tSales - tGastos).toLocaleString();
            const dailyData = {};
            const processItem = (item, dateField, isGasto=false) => { const d = new Date(item[dateField]); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; if(!dailyData[key]) dailyData[key] = { display: d.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }), total: 0 }; isGasto ? dailyData[key].total -= (item.val||0) : dailyData[key].total += (item.val||0); };
            orders.filter(o=>o.sta==='entregado').forEach(o=>processItem(o, o.fechaEntrega ? 'fechaEntrega' : 'fecha'));
            sales.filter(v => v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega').forEach(v=>processItem(v,'fecha'));
            gastos.forEach(g=>processItem(g,'fecha',true));
            const list = document.getElementById('daily-income-list');
            const keys = Object.keys(dailyData).sort((a,b)=>b.localeCompare(a));
            list.innerHTML = keys.length ? keys.map(k=>`<div class="flex justify-between bg-white/5 p-3 rounded-xl"><span>${dailyData[k].display}</span><span class="font-black ${dailyData[k].total>=0?'text-emerald-400':'text-rose-400'}">${cur}${dailyData[k].total.toLocaleString()}</span></div>`).join('') : '<div class="text-center py-6 text-slate-500">No hay registros diarios</div>';
            document.getElementById('modal-caja').classList.remove('hidden');
        }
        function closeCajaModal() { document.getElementById('modal-caja').classList.add('hidden'); }
        function executeCierreCaja() { localStorage.setItem('lastCierreCaja', Date.now()); updateTotal(); closeConfirmModal(); showAlert("Caja reiniciada correctamente.", "success"); }

        // ════════════════════════════════════════════════════════════════════════
        // MODAL GARANTÍAS — Vista visual de equipos con garantía activa
        // ════════════════════════════════════════════════════════════════════════
        let _garantiasCache = [];   // Snapshot de garantías al abrir
        let _garantiasFilter = '';  // Búsqueda
        let _garantiasSection = 'all'; // 'all' | 'activas' | 'porvencer' | 'vencidas'

