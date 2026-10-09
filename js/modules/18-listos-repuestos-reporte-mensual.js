/* Nelson App Pro · js/modules/18-listos-repuestos-reporte-mensual.js
   Avisar listos, repuestos usados y reporte mensual
   (extraido sin cambios de index.html; el orden de carga importa) */
        // Avisar a todos los pendientes del filtro actual, en secuencia
        async function notifyAllPending() {
            // Obtener los que aún no han sido avisados en el filtro actual
            let list = _readyCache.slice();
            if (_readyFilter === 'saldo') {
                list = list.filter(o => (Number(o.val) || 0) - (Number(o.adelanto) || 0) > 0);
            } else if (_readyFilter === 'never') {
                list = list.filter(o => !o.lastNotified);
            }
            const pending = list.filter(o => !o.lastNotified);
            if (!pending.length) return showAlert('No hay pendientes por avisar', 'info');

            const msg = `Vas a abrir ${pending.length} WhatsApp${pending.length !== 1 ? 's' : ''} en secuencia (uno cada 1.5 segundos). Para cada cliente el mensaje saldrá pre-llenado — solo toca "Enviar" en WhatsApp.\n\n¿Continuar?`;
            showConfirm(msg, async () => {
                const btn = document.getElementById('ready-bulk-btn');
                if (btn) btn.disabled = true;
                let enviados = 0;
                for (let i = 0; i < pending.length; i++) {
                    const o = pending[i];
                    try {
                        const m = buildWhatsappMsg('listo', o);
                        const waLink = `https://wa.me/57${o.tel.replace(/\D/g, '')}?text=${encodeURIComponent(m)}`;
                        sessionStorage.setItem('_waJump', '1');
                        window.open(waLink, '_blank');
                        // Marcar como avisado
                        o.lastNotified = Date.now();
                        await put('orders', o);
                        const idx = _readyCache.findIndex(x => x.id === o.id);
                        if (idx >= 0) _readyCache[idx] = o;
                        enviados++;
                        // Pausa entre envíos (menos en el último)
                        if (i < pending.length - 1) await new Promise(r => setTimeout(r, 1500));
                    } catch(e) { console.warn('[notifyAllPending]', e); }
                }
                if (btn) btn.disabled = false;
                _renderReadyStats();
                _renderReadyChipCounts();
                _renderReadyTodayPill();
                _renderReadyBulkButton();
                _renderReadyFilter(_readyFilter);
                showToast(`${enviados} cliente${enviados !== 1 ? 's' : ''} avisado${enviados !== 1 ? 's' : ''}`, 'success');
            });
        }

        // Enviar WhatsApp y marcar como avisado
        async function sendReadyWA(id) {
            try {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === id);
                if (!o || !o.tel) return showAlert('Orden o teléfono no encontrado', 'warning');
                const msg = buildWhatsappMsg('listo', o);
                const waLink = `https://wa.me/57${o.tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                sessionStorage.setItem('_waJump', '1');
                window.open(waLink, '_blank');
                // Marcar como avisado
                o.lastNotified = Date.now();
                await put('orders', o);
                // Refrescar cache y UI
                const idx = _readyCache.findIndex(x => x.id === id);
                if (idx >= 0) _readyCache[idx] = o;
                _renderReadyChipCounts();
                _renderReadyTodayPill();
                _renderReadyBulkButton();
                _renderReadyFilter(_readyFilter);
                showToast('WhatsApp enviado · marcado como avisado', 'success');
            } catch (e) {
                console.warn('[sendReadyWA]', e);
                showAlert('Error al enviar WhatsApp', 'error');
            }
        }

        // Marcar manualmente como avisado (sin abrir WA)
        async function markReadyAsNotified(id) {
            try {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === id);
                if (!o) return;
                o.lastNotified = Date.now();
                await put('orders', o);
                const idx = _readyCache.findIndex(x => x.id === id);
                if (idx >= 0) _readyCache[idx] = o;
                _renderReadyChipCounts();
                _renderReadyTodayPill();
                _renderReadyBulkButton();
                _renderReadyFilter(_readyFilter);
                showToast('Marcado como avisado', 'success');
            } catch (e) { console.warn('[markReadyAsNotified]', e); }
        }

        // Copiar todos los números del filtro actual
        function copyAllReadyPhones() {
            let list = _readyCache.slice();
            if (_readyFilter === 'saldo') {
                list = list.filter(o => (Number(o.val) || 0) - (Number(o.adelanto) || 0) > 0);
            } else if (_readyFilter === 'never') {
                list = list.filter(o => !o.lastNotified);
            }
            const phones = list.map(o => (o.tel || '').replace(/\D/g, '')).filter(Boolean);
            if (!phones.length) return showAlert('No hay números para copiar', 'warning');
            navigator.clipboard.writeText(phones.join(', '));
            showToast(`${phones.length} número${phones.length !== 1 ? 's' : ''} copiado${phones.length !== 1 ? 's' : ''}`, 'success');
        }

        function closeReadyModal() { document.getElementById('modal-ready-list').classList.add('hidden'); }

        // ==================== INTEGRACIÓN STOCK ↔ ÓRDENES (Repuestos usados) ====================
        let _partsCurrentOrder = null;      // Orden sobre la cual estamos trabajando
        let _partsStockCache   = [];        // Snapshot del stock al abrir
        let _partsSelected     = {};        // { stockId: qty }
        let _partsOnCloseCb    = null;      // Callback opcional a ejecutar al cerrar (para continuar flow de estado)

        async function openPartsModal(orderId, onCloseCb) {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === orderId);
            if (!o) { showAlert('Orden no encontrada', 'error'); return; }
            _partsCurrentOrder = o;
            _partsOnCloseCb = onCloseCb || null;

            // Precargar repuestos ya guardados (si existen)
            _partsSelected = {};
            if (Array.isArray(o.partsUsed)) {
                o.partsUsed.forEach(p => { if (p && p.id) _partsSelected[p.id] = p.qty || 1; });
            }

            _partsStockCache = await getAll('stock');
            // Ordenar: seleccionados primero, luego con stock, luego sin stock
            _partsStockCache.sort((a, b) => {
                const aSel = _partsSelected[a.id] ? 1 : 0;
                const bSel = _partsSelected[b.id] ? 1 : 0;
                if (aSel !== bSel) return bSel - aSel;
                const aStock = (a.q || 0) > 0 ? 1 : 0;
                const bStock = (b.q || 0) > 0 ? 1 : 0;
                if (aStock !== bStock) return bStock - aStock;
                return (a.n || '').localeCompare(b.n || '');
            });

            const numLabel = o.orderNum ? `#${String(o.orderNum).padStart(4,'0')}` : `#${o.id}`;
            const sub = document.getElementById('parts-header-sub');
            if (sub) sub.textContent = `Orden ${numLabel} · ${(o.nom || '').substring(0, 22)}`;

            document.getElementById('parts-search').value = '';
            _renderPartsList();
            _updatePartsSummary();
            document.getElementById('modal-parts-used').classList.remove('hidden');
        }

        function closePartsModal() {
            document.getElementById('modal-parts-used').classList.add('hidden');
            const cb = _partsOnCloseCb;
            _partsCurrentOrder = null;
            _partsSelected = {};
            _partsStockCache = [];
            _partsOnCloseCb = null;
            if (typeof cb === 'function') cb();
        }

        function _skipPartsModal() {
            // Cerrar sin guardar cambios (respeta los partsUsed previos si había)
            closePartsModal();
        }

        function _filterPartsList() {
            _renderPartsList();
        }

        function _renderPartsList() {
            const container = document.getElementById('parts-stock-list');
            if (!container) return;
            const cur = getCurrency();
            const query = (document.getElementById('parts-search')?.value || '').trim().toLowerCase();

            let list = _partsStockCache;
            if (query) {
                list = list.filter(s =>
                    (s.n || '').toLowerCase().includes(query) ||
                    (s.code || '').toLowerCase().includes(query) ||
                    (s.cat || '').toLowerCase().includes(query)
                );
            }

            if (!list.length) {
                container.innerHTML = `<div class="parts-empty">
                    <div class="parts-empty-icon">📦</div>
                    <div class="parts-empty-text">${query ? 'Sin coincidencias' : 'No tienes repuestos en inventario'}</div>
                </div>`;
                return;
            }

            container.innerHTML = list.map(s => {
                const sel    = _partsSelected[s.id] || 0;
                const stock  = s.q || 0;
                const maxQty = Math.max(stock + sel, sel);  // si ya tenía seleccionado + stock actual
                const stockCls = stock === 0 ? 'parts-item-stock-zero' : (stock <= (s.minStock || 3) ? 'parts-item-stock-low' : 'parts-item-stock');
                const canAdd = sel < maxQty || stock === 0 && sel === 0;  // permitir agregar aunque no haya stock (por si el repuesto entró después)
                const costStr = s.cost ? `${cur}${Number(s.cost).toLocaleString()} c/u` : '';
                return `<div class="parts-item${sel > 0 ? ' parts-item-selected' : ''}">
                    <div class="parts-item-info">
                        <div class="parts-item-name">${escapeHtml(s.n || '')}</div>
                        <div class="parts-item-meta">
                            <span class="${stockCls}">📦 ${stock} disp.</span>
                            ${costStr ? `<span class="parts-item-cost">💰 ${costStr}</span>` : ''}
                            ${s.code ? `<span style="color:#64748b;">${escapeHtml(s.code)}</span>` : ''}
                        </div>
                    </div>
                    <div class="parts-item-ctrls">
                        <button class="parts-qty-btn" onclick="_partsQtyChange(${s.id}, -1)" ${sel === 0 ? 'disabled' : ''}>−</button>
                        <span class="parts-qty-num">${sel}</span>
                        <button class="parts-qty-btn" onclick="_partsQtyChange(${s.id}, 1)" ${sel >= maxQty ? 'disabled' : ''}>+</button>
                    </div>
                </div>`;
            }).join('');
        }

        function _partsQtyChange(stockId, delta) {
            const item = _partsStockCache.find(s => s.id === stockId);
            if (!item) return;
            const current = _partsSelected[stockId] || 0;
            const stock = item.q || 0;
            const max = Math.max(stock + current, current);  // respeta lo que ya había reservado
            const next = Math.max(0, Math.min(max, current + delta));
            if (next === 0) delete _partsSelected[stockId];
            else _partsSelected[stockId] = next;
            _renderPartsList();
            _updatePartsSummary();
        }

        function _updatePartsSummary() {
            const cur = getCurrency();
            const ids = Object.keys(_partsSelected);
            let totalCost = 0;
            let totalQty  = 0;
            ids.forEach(id => {
                const item = _partsStockCache.find(s => String(s.id) === String(id));
                if (!item) return;
                const q = _partsSelected[id] || 0;
                totalQty += q;
                totalCost += (Number(item.cost) || 0) * q;
            });
            const countEl = document.getElementById('parts-sum-count');
            const costEl  = document.getElementById('parts-sum-cost');
            const profEl  = document.getElementById('parts-sum-profit');
            const hintEl  = document.getElementById('parts-sum-hint');
            const badgeEl = document.getElementById('parts-btn-save-count');
            if (countEl) countEl.textContent = `${ids.length} (${totalQty} unid.)`;
            if (costEl)  costEl.textContent  = cur + totalCost.toLocaleString();
            if (badgeEl) badgeEl.textContent = ids.length;

            const orderVal = Number(_partsCurrentOrder && _partsCurrentOrder.val) || 0;
            const profit   = orderVal - totalCost;
            if (profEl) {
                profEl.textContent = cur + profit.toLocaleString();
                profEl.style.color = profit >= 0 ? '#34d399' : '#f87171';
            }
            if (hintEl) {
                if (orderVal > 0) hintEl.textContent = `${cur}${orderVal.toLocaleString()} orden − ${cur}${totalCost.toLocaleString()} repuestos`;
                else hintEl.textContent = 'Define el valor de la orden para ver la ganancia';
            }
        }

        async function _savePartsUsed() {
            if (!_partsCurrentOrder) return;
            try {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _partsCurrentOrder.id);
                if (!o) return;

                // Construir snapshot de partes seleccionadas
                const nuevosPartsUsed = [];
                Object.entries(_partsSelected).forEach(([sid, q]) => {
                    const item = _partsStockCache.find(s => String(s.id) === String(sid));
                    if (!item || !q) return;
                    nuevosPartsUsed.push({
                        id: item.id,
                        name: item.n,
                        qty: q,
                        cost: Number(item.cost) || 0,
                        price: Number(item.p) || 0
                    });
                });

                // Reconciliar stock: comparar partsUsed previos vs nuevos
                const previos = Array.isArray(o.partsUsed) ? o.partsUsed : [];
                const prevMap = {};
                previos.forEach(p => { prevMap[p.id] = p.qty || 0; });

                // Para cada stock afectado, aplicar la diferencia
                const allIds = new Set([...previos.map(p => p.id), ...nuevosPartsUsed.map(p => p.id)]);
                for (const stockId of allIds) {
                    const prevQty = prevMap[stockId] || 0;
                    const nuevo   = nuevosPartsUsed.find(p => p.id === stockId);
                    const newQty  = nuevo ? nuevo.qty : 0;
                    const diff    = newQty - prevQty;  // positivo = salida extra; negativo = devolución al stock
                    if (diff === 0) continue;

                    const stockAll = await getAll('stock');
                    const stockItem = stockAll.find(s => s.id === stockId);
                    if (!stockItem) continue;
                    stockItem.q = Math.max(0, (stockItem.q || 0) - diff);
                    await put('stock', stockItem);
                    const tipo = diff > 0 ? 'salida' : 'entrada';
                    const nota = `Orden ${o.orderNum ? '#' + String(o.orderNum).padStart(4,'0') : '#' + o.id} — ${diff > 0 ? 'uso en reparación' : 'ajuste (devolución)'}`;
                    try { await addStockMovementRecord(stockItem.id, tipo, Math.abs(diff), nota, stockItem.q + diff); } catch(e) {}
                }

                // Guardar en la orden
                o.partsUsed = nuevosPartsUsed;
                const totalCost = nuevosPartsUsed.reduce((a, b) => a + (b.cost * b.qty), 0);
                o.partsCost = totalCost;
                await put('orders', o);

                // Chat interno
                if (nuevosPartsUsed.length > 0) {
                    const resumen = nuevosPartsUsed.map(p => `${p.qty}× ${p.name}`).join(', ');
                    try { await logChatSistema(o.id, `🔧 Repuestos usados: ${resumen}`); } catch(e) {}
                }

                showToast(`✅ ${nuevosPartsUsed.length} repuesto${nuevosPartsUsed.length !== 1 ? 's' : ''} guardado${nuevosPartsUsed.length !== 1 ? 's' : ''} · stock actualizado`, 'success');
                closePartsModal();
                // Refrescar vistas
                if (typeof renderOrders === 'function') await renderOrders();
                if (typeof renderStock === 'function') await renderStock();
            } catch (e) {
                console.warn('[_savePartsUsed]', e);
                showAlert('Error al guardar los repuestos', 'error');
            }
        }


        // ==================== REPORTE MENSUAL EJECUTIVO ====================
        async function exportMonthlyReport() {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
            const endPrevMonth = startOfMonth - 1;
            const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

            const orders = await getAll('orders');
            const sales = await getAll('sales');
            const gastos = await getAll('gastos');

            // Mes actual
            const monthOrders = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) >= startOfMonth);
            const inProgress  = orders.filter(o => o.sta !== 'entregado' && o.sta !== 'no-reparable');
            const monthSales  = sales.filter(s => s.fecha >= startOfMonth && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega');
            const monthGastos = gastos.filter(g => g.fecha >= startOfMonth);

            const totalRep    = monthOrders.reduce((a,b) => a+(b.val||0), 0);
            const totalVentas = monthSales.reduce((a,b) => a+(b.val||0), 0);
            const totalIngresos = totalRep + totalVentas;
            const totalGastos = monthGastos.reduce((a,b) => a+(b.val||0), 0);
            const neto        = totalIngresos - totalGastos;
            const margen      = totalIngresos > 0 ? Math.round((neto / totalIngresos) * 100) : 0;
            const ticketProm  = monthOrders.length > 0 ? Math.round(totalRep / monthOrders.length) : 0;

            // Mes anterior para comparativa
            const prevOrders  = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) >= startPrevMonth && (o.fechaEntrega || o.fecha) <= endPrevMonth);
            const prevSales   = sales.filter(s => s.fecha >= startPrevMonth && s.fecha <= endPrevMonth && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega');
            const prevGastos  = gastos.filter(g => g.fecha >= startPrevMonth && g.fecha <= endPrevMonth);
            const prevNeto = prevOrders.reduce((a,b)=>a+(b.val||0),0) + prevSales.reduce((a,b)=>a+(b.val||0),0) - prevGastos.reduce((a,b)=>a+(b.val||0),0);
            const variacion = prevNeto !== 0 ? Math.round(((neto - prevNeto) / Math.abs(prevNeto)) * 100) : null;

            // Top items
            const itemCounts = {};
            monthSales.forEach(s => { itemCounts[s.item] = (itemCounts[s.item]||0) + s.qty; });
            const topItems = Object.entries(itemCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
            const topItemMax = topItems.length ? topItems[0][1] : 1;

            // Origen de clientes
            const origenLabels = {recomendacion:'Recomendación',redes:'Redes sociales',cliente_frecuente:'Cliente frecuente',google:'Google',local:'Pasó por local',whatsapp:'WhatsApp',otro:'Otro'};
            const origenIcons  = {recomendacion:'🗣️',redes:'📱',cliente_frecuente:'⭐',google:'🔍',local:'🏠',whatsapp:'💬',otro:'📌'};
            const origenCount = {};
            orders.filter(o => o.origen && o.fecha >= startOfMonth).forEach(o => { origenCount[o.origen] = (origenCount[o.origen]||0)+1; });
            const origenTotal = Object.values(origenCount).reduce((a,b)=>a+b,0);
            const origenRows = Object.entries(origenCount).sort((a,b)=>b[1]-a[1])
                .map(([k,v]) => {
                    const pct = Math.round(v/origenTotal*100);
                    return `<div style="margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                            <span style="font-size:12px;font-weight:700;color:#e2e8f0;">${origenIcons[k]||'📌'} ${origenLabels[k]||k}</span>
                            <span style="font-size:12px;font-weight:900;color:#60a5fa;font-variant-numeric:tabular-nums;">${v} <span style="font-size:10px;color:#64748b;font-weight:700;">(${pct}%)</span></span>
                        </div>
                        <div style="height:5px;background:rgba(15,23,42,0.8);border-radius:99px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:99px;"></div>
                        </div>
                    </div>`;
                }).join('');

            const statusCount = { recibido:0, 'revisión':0, reparado:0, entregado:0 };
            orders.forEach(o => { if(statusCount[o.sta] !== undefined) statusCount[o.sta]++; });
            const business = _safeBizConfig();
            const businessName = business.name || 'TODO REPUESTOS NELSON';
            const businessPhone = business.phone || '';
            const businessAddress = business.address || '';
            const cur = getCurrency();

            // Proporciones para barras
            const maxIngreso = Math.max(totalRep, totalVentas, totalGastos, 1);
            const pctRep    = Math.round((totalRep / maxIngreso) * 100);
            const pctVentas = Math.round((totalVentas / maxIngreso) * 100);
            const pctGastos = Math.round((totalGastos / maxIngreso) * 100);

            // Badge variación
            let variacionBadge = '';
            if (variacion !== null) {
                const isUp = variacion >= 0;
                const color = isUp ? '#10b981' : '#ef4444';
                const bg = isUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
                const bord = isUp ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)';
                const arrow = isUp ? '▲' : '▼';
                variacionBadge = `<div style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:${bg};border:1px solid ${bord};border-radius:99px;font-size:10px;font-weight:900;color:${color};letter-spacing:0.5px;">
                    <span>${arrow}</span><span>${Math.abs(variacion)}% vs mes anterior</span>
                </div>`;
            } else if (prevNeto === 0 && neto > 0) {
                variacionBadge = `<div style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.35);border-radius:99px;font-size:10px;font-weight:900;color:#60a5fa;letter-spacing:0.5px;">🆕 Primer mes con datos</div>`;
            }

            const html = `
                <div id="monthly-report-printable" style="font-family:system-ui,-apple-system,sans-serif;max-width:440px;margin:0 auto;background:linear-gradient(180deg,#0f172a 0%,#0a0e1a 100%);color:#e2e8f0;padding:0;border-radius:20px;overflow:hidden;border:1px solid rgba(96,165,250,0.15);">

                    <!-- HERO -->
                    <div style="padding:24px 22px 22px;background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 45%,#0ea5e9 100%);position:relative;overflow:hidden;">
                        <div style="position:absolute;top:-60px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(255,255,255,0.15),transparent 70%);"></div>
                        <div style="position:absolute;bottom:-40px;left:-30px;width:150px;height:150px;background:radial-gradient(circle,rgba(14,165,233,0.3),transparent 70%);"></div>
                        <div style="position:relative;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
                                <div>
                                    <div style="font-size:9px;font-weight:900;color:rgba(255,255,255,0.75);letter-spacing:3px;text-transform:uppercase;margin-bottom:2px;">Reporte ejecutivo</div>
                                    <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1.1;">${escapeHtml(businessName)}</div>
                                </div>
                                <div style="padding:5px 11px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:99px;">
                                    <span style="font-size:9px;font-weight:900;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">${monthName}</span>
                                </div>
                            </div>

                            <div style="padding:16px 18px;background:rgba(0,0,0,0.35);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
                                <div style="font-size:9px;font-weight:900;color:rgba(255,255,255,0.7);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:4px;">💎 Ganancia neta</div>
                                <div style="font-size:32px;font-weight:900;color:${neto >= 0 ? '#6ee7b7' : '#fca5a5'};font-variant-numeric:tabular-nums;letter-spacing:-1px;line-height:1;">${neto < 0 ? '-' : ''}${cur}${Math.abs(neto).toLocaleString()}</div>
                                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                                    ${variacionBadge}
                                    ${margen !== 0 ? `<div style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:rgba(255,255,255,0.75);">💹 Margen <strong style="color:#fff;">${margen}%</strong></div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="padding:18px;">

                        <!-- KPIs -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                            <div style="padding:12px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(15,23,42,0.4));border:1px solid rgba(16,185,129,0.2);border-radius:14px;">
                                <div style="font-size:8px;font-weight:900;color:#34d399;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">📈 Ingresos totales</div>
                                <div style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${totalIngresos.toLocaleString()}</div>
                            </div>
                            <div style="padding:12px;background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(15,23,42,0.4));border:1px solid rgba(239,68,68,0.2);border-radius:14px;">
                                <div style="font-size:8px;font-weight:900;color:#f87171;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">📉 Gastos del mes</div>
                                <div style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${totalGastos.toLocaleString()}</div>
                            </div>
                            <div style="padding:12px;background:linear-gradient(135deg,rgba(96,165,250,0.08),rgba(15,23,42,0.4));border:1px solid rgba(96,165,250,0.2);border-radius:14px;">
                                <div style="font-size:8px;font-weight:900;color:#60a5fa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">🎟️ Ticket promedio</div>
                                <div style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${ticketProm.toLocaleString()}</div>
                            </div>
                            <div style="padding:12px;background:linear-gradient(135deg,rgba(251,146,60,0.08),rgba(15,23,42,0.4));border:1px solid rgba(251,146,60,0.2);border-radius:14px;">
                                <div style="font-size:8px;font-weight:900;color:#fb923c;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">🔧 Órdenes entregadas</div>
                                <div style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${monthOrders.length}</div>
                            </div>
                        </div>

                        <!-- Desglose -->
                        <div style="padding:14px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:16px;margin-bottom:14px;">
                            <div style="font-size:9px;font-weight:900;color:#60a5fa;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">💰 Desglose financiero</div>
                            <div style="margin-bottom:10px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-size:11px;font-weight:700;color:#cbd5e1;">🔧 Reparaciones</span>
                                    <span style="font-size:13px;font-weight:900;color:#34d399;font-variant-numeric:tabular-nums;">${cur}${totalRep.toLocaleString()}</span>
                                </div>
                                <div style="height:6px;background:rgba(15,23,42,0.9);border-radius:99px;overflow:hidden;">
                                    <div style="width:${pctRep}%;height:100%;background:linear-gradient(90deg,#059669,#34d399);border-radius:99px;"></div>
                                </div>
                            </div>
                            <div style="margin-bottom:10px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-size:11px;font-weight:700;color:#cbd5e1;">📦 Ventas de stock</span>
                                    <span style="font-size:13px;font-weight:900;color:#34d399;font-variant-numeric:tabular-nums;">${cur}${totalVentas.toLocaleString()}</span>
                                </div>
                                <div style="height:6px;background:rgba(15,23,42,0.9);border-radius:99px;overflow:hidden;">
                                    <div style="width:${pctVentas}%;height:100%;background:linear-gradient(90deg,#0891b2,#22d3ee);border-radius:99px;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-size:11px;font-weight:700;color:#cbd5e1;">💸 Gastos operativos</span>
                                    <span style="font-size:13px;font-weight:900;color:#f87171;font-variant-numeric:tabular-nums;">-${cur}${totalGastos.toLocaleString()}</span>
                                </div>
                                <div style="height:6px;background:rgba(15,23,42,0.9);border-radius:99px;overflow:hidden;">
                                    <div style="width:${pctGastos}%;height:100%;background:linear-gradient(90deg,#dc2626,#f87171);border-radius:99px;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Operativo -->
                        <div style="padding:14px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:16px;margin-bottom:14px;">
                            <div style="font-size:9px;font-weight:900;color:#fb923c;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">📋 Estado operativo</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div style="text-align:center;padding:12px 8px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:12px;">
                                    <div style="font-size:22px;font-weight:900;color:#60a5fa;font-variant-numeric:tabular-nums;line-height:1;">${monthOrders.length}</div>
                                    <div style="font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:0.5px;margin-top:3px;text-transform:uppercase;">📦 Entregadas</div>
                                </div>
                                <div style="text-align:center;padding:12px 8px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;">
                                    <div style="font-size:22px;font-weight:900;color:#fbbf24;font-variant-numeric:tabular-nums;line-height:1;">${inProgress.length}</div>
                                    <div style="font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:0.5px;margin-top:3px;text-transform:uppercase;">⏳ En proceso</div>
                                </div>
                                <div style="text-align:center;padding:12px 8px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:12px;">
                                    <div style="font-size:22px;font-weight:900;color:#34d399;font-variant-numeric:tabular-nums;line-height:1;">${statusCount.reparado||0}</div>
                                    <div style="font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:0.5px;margin-top:3px;text-transform:uppercase;">✅ Reparados</div>
                                </div>
                                <div style="text-align:center;padding:12px 8px;background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.2);border-radius:12px;">
                                    <div style="font-size:22px;font-weight:900;color:#cbd5e1;font-variant-numeric:tabular-nums;line-height:1;">${orders.length}</div>
                                    <div style="font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:0.5px;margin-top:3px;text-transform:uppercase;">📊 Total histórico</div>
                                </div>
                            </div>
                        </div>

                        ${topItems.length ? `
                        <div style="padding:14px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:16px;margin-bottom:14px;">
                            <div style="font-size:9px;font-weight:900;color:#f97316;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">🔥 Top repuestos vendidos</div>
                            ${topItems.map(([n,c],i) => {
                                const medalColor = i===0?'#fbbf24':(i===1?'#cbd5e1':(i===2?'#d97706':'#64748b'));
                                const pct = Math.round((c / topItemMax) * 100);
                                return `<div style="margin-bottom:10px;">
                                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                                        <div style="flex-shrink:0;width:24px;height:24px;border-radius:8px;background:${medalColor}22;border:1px solid ${medalColor}55;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:${medalColor};">${i+1}</div>
                                        <div style="flex:1;min-width:0;font-size:11px;font-weight:700;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(n)}</div>
                                        <div style="flex-shrink:0;font-size:12px;font-weight:900;color:#fb923c;font-variant-numeric:tabular-nums;">${c} uds</div>
                                    </div>
                                    <div style="height:4px;background:rgba(15,23,42,0.9);border-radius:99px;overflow:hidden;margin-left:34px;">
                                        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${medalColor}66,${medalColor});border-radius:99px;"></div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>` : ''}

                        ${origenTotal > 0 ? `
                        <div style="padding:14px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:16px;margin-bottom:14px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                                <div style="font-size:9px;font-weight:900;color:#a78bfa;letter-spacing:2.5px;text-transform:uppercase;">📣 Origen de clientes</div>
                                <div style="font-size:9px;font-weight:700;color:#64748b;">${origenTotal} captados</div>
                            </div>
                            ${origenRows}
                        </div>` : ''}

                        <!-- Footer -->
                        <div style="padding:14px;background:linear-gradient(135deg,rgba(59,130,246,0.05),rgba(15,23,42,0.3));border:1px solid rgba(96,165,250,0.12);border-radius:14px;text-align:center;">
                            <div style="font-size:9px;font-weight:900;color:#60a5fa;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">🛠️ ${escapeHtml(businessName)}</div>
                            ${businessPhone ? `<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:2px;">📱 ${escapeHtml(businessPhone)}</div>` : ''}
                            ${businessAddress ? `<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:6px;">📍 ${escapeHtml(businessAddress)}</div>` : ''}
                            <div style="font-size:9px;color:#475569;font-weight:700;margin-top:6px;">Generado el ${new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric'})} · ${new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                </div>`;
            document.getElementById('monthly-report-content').innerHTML = html;
            document.getElementById('modal-monthly-report').classList.remove('hidden');
        }

