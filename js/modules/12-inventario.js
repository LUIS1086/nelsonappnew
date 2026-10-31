/* Nelson App Pro · js/modules/12-inventario.js
   Inventario, movimientos y reporte de stock
   (extraido sin cambios de index.html; el orden de carga importa) */
        async function renderStock() {
            // Una sola lectura del stock (antes se llamaba getAll 3 veces seguidas)
            const allStock = await getAll('stock');
            let stock = allStock.slice();
            const st   = (document.getElementById('stock-search')?.value || '').toLowerCase();
            const sort = document.getElementById('stock-sort')?.value || 'name';
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;

            if (st) stock = stock.filter(s =>
                s.n.toLowerCase().includes(st) ||
                (s.code || '').toLowerCase().includes(st) ||
                (s.cat  || '').toLowerCase().includes(st) ||
                (s.supplier || '').toLowerCase().includes(st) ||
                (s.supplierPhone || '').toLowerCase().includes(st)
            );

            if (activeStockCategory) stock = stock.filter(s => (s.cat || '') === activeStockCategory);

            stock.sort((a, b) => {
                if (sort === 'name')       return a.n.localeCompare(b.n);
                if (sort === 'stock-low')  return a.q - b.q;
                if (sort === 'stock-high') return b.q - a.q;
                if (sort === 'price-high') return b.p - a.p;
                if (sort === 'category')   return (a.cat||'').localeCompare(b.cat||'');
                return 0;
            });

            renderCategoryChips(allStock);

            const totalVal = allStock.reduce((a,b) => a + (b.p * b.q), 0);
            const lowCount = allStock.filter(s => s.q <= (s.minStock || threshold) && s.q > 0).length;
            const outCount = allStock.filter(s => s.q === 0).length;
            const sumEl = document.getElementById('stock-summary-text');
            if (sumEl) sumEl.innerHTML =
                `${allStock.length} productos · <span class="text-emerald-400 font-bold">${getCurrency()}${totalVal.toLocaleString()}</span>` +
                (lowCount ? ` · <span class="text-amber-400 font-bold">⚠️ ${lowCount} bajo mínimo</span>` : '') +
                (outCount ? ` · <span class="text-rose-400 font-bold">❌ ${outCount} agotados</span>` : '');

            const c = document.getElementById('stock-list');
            if (!stock.length) {
                c.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">📦 Sin repuestos que coincidan</div>';
                return;
            }

            const catIcons = {
                'Motores ventilador':'🌀','Motores licuadora':'⚙️','Acoples Samurái':'🔩',
                'Élices':'🌊','Empaques olla':'🍲','Cuchillas licuadora':'🔪',
                'Cuadrantes':'📐','Acoples Oster':'🔩','Suiches':'🔘',
                'Tapones olla':'🔒','Otros':'📦'
            };

            // RENDERIZADO PROGRESIVO: primero pintamos los primeros 40 items (respuesta inmediata),
            // y si hay más, los agregamos en un segundo paso (no bloquea la UI)
            const INITIAL_RENDER = 40;
            const firstBatch = stock.slice(0, INITIAL_RENDER);
            const remaining  = stock.slice(INITIAL_RENDER);

            const renderItem = (s) => {
                const minSt   = s.minStock || threshold;
                const isLow   = s.q <= minSt && s.q > 0;
                const isOut   = s.q === 0;
                const margin  = s.cost > 0 && s.p > 0 ? Math.round(((s.p - s.cost) / s.cost) * 100) : null;
                const catIcon = catIcons[s.cat] || '📦';
                const imgHtml = s.img
                    ? `<img src="${s.img}" class="stock-thumb" loading="lazy" alt="${escapeHtml(s.n)}">`
                    : `<div class="stock-thumb stock-thumb-empty" aria-hidden="true">${catIcon}</div>`;
                const stockState = isOut ? 'agotado' : isLow ? 'bajo' : 'normal';
                const statusBadge = isOut
                    ? '<span class="stock-state stock-state-out">Agotado</span>'
                    : isLow ? '<span class="stock-state stock-state-low">Stock bajo</span>' : '';
                const supplierLine = (s.supplier || s.supplierPhone)
                    ? `<div class="stock-supplier"><span>Proveedor</span><strong>${escapeHtml(s.supplier || 'Contacto guardado')}</strong>${s.supplierPhone ? `<small>${escapeHtml(s.supplierPhone)}</small>` : ''}</div>`
                    : '<div class="stock-supplier stock-supplier-empty">Sin proveedor asignado</div>';

                return `<article class="stock-row stock-row-${stockState}">
                    <div class="stock-row-main">
                        ${imgHtml}
                        <div class="stock-product-info">
                            <div class="stock-product-title"><h4>${escapeHtml(s.n)}</h4>${statusBadge}</div>
                            <div class="stock-product-meta">${s.code ? `<span class="stock-code">${escapeHtml(s.code)}</span>` : ''}${s.cat ? `<span>${escapeHtml(s.cat)}</span>` : ''}</div>
                            ${supplierLine}
                        </div>
                        <div class="stock-quantity">
                            <span class="stock-quantity-label">Disponible</span>
                            <strong>${s.q}</strong><span class="stock-unit">uds</span>
                            <div class="stock-stepper" role="group" aria-label="Ajustar cantidad de ${escapeHtml(s.n)}">
                                <button type="button" onclick="modQty(${s.id},-1)" aria-label="Restar una unidad">−</button>
                                <button type="button" onclick="modQty(${s.id},1)" aria-label="Agregar una unidad">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="stock-row-footer">
                        <div class="stock-prices"><span class="stock-price-main">${getCurrency()}${Number(s.p || 0).toLocaleString()}</span><span class="stock-price-label">Precio de venta</span>
                            ${s.cost > 0 ? `<span class="stock-price-cost">Costo ${getCurrency()}${Number(s.cost).toLocaleString()}</span>` : ''}
                            ${margin !== null ? `<span class="stock-margin ${margin < 0 ? 'stock-margin-negative' : ''}">${margin >= 0 ? '+' : ''}${margin}% margen</span>` : ''}
                        </div>
                        <div class="stock-row-actions" role="group" aria-label="Acciones para ${escapeHtml(s.n)}">
                            ${(s.supplier || s.supplierPhone) ? `<button type="button" class="stock-action stock-action-contact" onclick="pedirAProveedor(${s.id})" title="Contactar al proveedor por WhatsApp">WhatsApp</button>` : ''}
                            <button type="button" class="stock-action" onclick="openStockHistory(${s.id})" title="Ver historial de movimientos" aria-label="Historial">📋</button>
                            <button type="button" class="stock-action" onclick="editStockItem(${s.id})" title="Editar producto" aria-label="Editar">✎</button>
                            <button type="button" class="stock-action stock-action-delete" onclick="deleteStockItem(${s.id})" title="Eliminar producto" aria-label="Eliminar">×</button>
                        </div>
                    </div>
                </article>`;
            };

            // Pintar el primer batch YA
            c.innerHTML = firstBatch.map(renderItem).join('');

            // Si hay más items, agregarlos en un segundo paso después del primer paint
            if (remaining.length > 0) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        const fragment = document.createElement('div');
                        fragment.innerHTML = remaining.map(renderItem).join('');
                        // Agregar al final en un solo append (más rápido que insertar uno por uno)
                        while (fragment.firstChild) c.appendChild(fragment.firstChild);
                    }, 0);
                });
            }
        }

        function renderCategoryChips(allStock) {
            const cats = [...new Set(allStock.map(s => s.cat).filter(Boolean))].sort();
            const wrap = document.getElementById('category-filter-wrap');
            if (!wrap) return;
            const catIcons = {
                'Motores ventilador':'🌀','Motores licuadora':'⚙️','Acoples Samurái':'🔩',
                'Élices':'🌊','Empaques olla':'🍲','Cuchillas licuadora':'🔪',
                'Cuadrantes':'📐','Acoples Oster':'🔩','Suiches':'🔘',
                'Tapones olla':'🔒','Otros':'📦'
            };
            const chips = [{ label: 'Todos', val: '' }, ...cats.map(c => ({ label: `${catIcons[c]||'📦'} ${c}`, val: c }))];
            wrap.innerHTML = chips.map(ch =>
                `<button onclick="setCategoryFilter('${ch.val}')" class="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full border transition ${activeStockCategory === ch.val ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800/60 border-white/10 text-slate-400'}">${ch.label}</button>`
            ).join('');
            if (cats.length === 0) wrap.innerHTML = '';
        }

        function setCategoryFilter(cat) {
            activeStockCategory = cat;
            renderStock();
        }

        async function modQty(id, delta) {
            const stock = await getAll('stock');
            const item  = stock.find(x => x.id === id);
            if (!item) return;
            const prev = item.q;
            item.q = Math.max(0, item.q + delta);
            await put('stock', item);
            await addStockMovementRecord(id, delta > 0 ? 'entrada' : 'salida', Math.abs(delta), 'Ajuste manual', prev);
            await renderStock();
            await updateVentaSelect();
        }

        function previewStockImg(input) {
            if (!input.files || !input.files[0]) return;
            const reader = new FileReader();
            reader.onload = e => {
                const el = document.getElementById('stock-img-preview');
                if (el) el.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                input._imgData = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }

        function calcMargen() {
            const cost  = parseFloat(document.getElementById('stock-modal-cost')?.value) || 0;
            const price = parseFloat(document.getElementById('stock-modal-price')?.value) || 0;
            const el    = document.getElementById('stock-margen-info');
            if (!el) return;
            if (cost > 0 && price > 0) {
                const margin = Math.round(((price - cost) / cost) * 100);
                const profit = price - cost;
                el.classList.remove('hidden');
                el.innerHTML = `Ganancia: ${getCurrency()}${profit.toLocaleString()} · Margen: ${margin >= 0 ? '+' : ''}${margin}%`;
                el.className = `${margin >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} border rounded-xl px-3 py-2 text-xs text-center font-bold`;
            } else {
                el.classList.add('hidden');
            }
        }

        function addStockItem() { openStockModal(null); }
        async function editStockItem(id) {
            const stock = await getAll('stock');
            const item  = stock.find(x => x.id === id);
            if (item) openStockModal(item);
        }

        function openStockModal(item) {
            document.getElementById('stock-modal-title').innerText = item ? 'EDITAR REPUESTO' : 'NUEVO REPUESTO';
            document.getElementById('stock-modal-id').value          = item ? item.id  : '';
            document.getElementById('stock-modal-name').value        = item ? item.n   : '';
            document.getElementById('stock-modal-code').value        = item ? (item.code || '') : '';
            document.getElementById('stock-modal-category').value    = item ? (item.cat  || '') : '';
            document.getElementById('stock-modal-price').value       = item ? item.p   : '';
            document.getElementById('stock-modal-cost').value        = item ? (item.cost || '') : '';
            document.getElementById('stock-modal-qty').value         = item ? item.q   : '';
            document.getElementById('stock-modal-min').value         = item ? (item.minStock || '') : '';
            document.getElementById('stock-modal-supplier').value    = item ? (item.supplier || '') : '';
            document.getElementById('stock-modal-supplier-phone').value = item ? (item.supplierPhone || '') : '';
            document.getElementById('stock-modal-notes').value       = item ? (item.notes || '') : '';
            const prev = document.getElementById('stock-img-preview');
            if (prev) prev.innerHTML = item?.img ? `<img src="${item.img}" style="width:100%;height:100%;object-fit:cover;">` : '🔧';
            const imgInput = document.getElementById('stock-modal-img');
            if (imgInput) imgInput._imgData = item?.img || null;
            calcMargen();
            document.getElementById('modal-stock-form').classList.remove('hidden');
        }

        function closeStockModal() { document.getElementById('modal-stock-form').classList.add('hidden'); }

        async function saveStockItem() {
            const id       = document.getElementById('stock-modal-id').value;
            const n        = document.getElementById('stock-modal-name').value.trim().toUpperCase();
            const p        = parseFloat(document.getElementById('stock-modal-price').value);
            const q        = parseInt(document.getElementById('stock-modal-qty').value);
            const cost     = parseFloat(document.getElementById('stock-modal-cost').value) || 0;
            const code     = document.getElementById('stock-modal-code').value.trim().toUpperCase();
            const cat      = document.getElementById('stock-modal-category').value;
            const minStock = parseInt(document.getElementById('stock-modal-min').value) || 0;
            const supplier = document.getElementById('stock-modal-supplier').value.trim();
            const supplierPhone = document.getElementById('stock-modal-supplier-phone').value.trim();
            const notes    = document.getElementById('stock-modal-notes').value.trim();
            const imgInput = document.getElementById('stock-modal-img');
            const img      = imgInput?._imgData || (id ? (await getAll('stock')).find(s=>s.id==id)?.img : null) || null;

            if (!n)              return showAlert('Ingresa el nombre del repuesto.', 'warning');
            if (isNaN(p) || p<0) return showAlert('Precio de venta inválido.', 'warning');
            if (isNaN(q) || q<0) return showAlert('Cantidad inválida.', 'warning');

            const isNew  = !id;
            const prevQ  = isNew ? 0 : ((await getAll('stock')).find(s=>s.id==parseInt(id))?.q || 0);
            const itemData = { id: id ? parseInt(id) : Date.now(), n, p, q, cost, code, cat, minStock, supplier, supplierPhone, notes, img };
            await put('stock', itemData);

            if (!isNew && q !== prevQ) {
                const diff = q - prevQ;
                await addStockMovementRecord(itemData.id, diff > 0 ? 'entrada' : 'salida', Math.abs(diff), 'Edición manual', prevQ);
            } else if (isNew && q > 0) {
                await addStockMovementRecord(itemData.id, 'entrada', q, 'Stock inicial', 0);
            }

            closeStockModal();
            await renderStock();
            await updateVentaSelect();
            showToast(isNew ? `✅ ${n} agregado al inventario` : `✅ ${n} actualizado`, 'success');
        }

        async function deleteStockItem(id) {
            showConfirm('¿Eliminar este producto del inventario?', async () => {
                await del('stock', id);
                const hist = await getAll('stockHistory');
                for (const h of hist.filter(h => h.stockId === id)) await del('stockHistory', h.id);
                await renderStock();
                await updateVentaSelect();
            });
        }

        async function addStockMovementRecord(stockId, type, qty, note, prevQty) {
            await put('stockHistory', {
                id: Date.now() + Math.random(),
                stockId, type, qty, note,
                prevQty, newQty: prevQty + (type === 'salida' ? -qty : qty),
                fecha: Date.now()
            });
        }

        async function openStockHistory(id) {
            const stock = await getAll('stock');
            const item  = stock.find(s => s.id === id);
            if (!item) return;
            document.getElementById('stock-history-name').innerText = item.n;
            document.getElementById('stock-modal-id').value = id;
            document.getElementById('modal-stock-history').dataset.stockId = id;
            await renderStockHistory(id);
            document.getElementById('modal-stock-history').classList.remove('hidden');
        }

        async function renderStockHistory(id) {
            const hist = await getAll('stockHistory');
            const movs = hist.filter(h => h.stockId === id).sort((a,b) => b.fecha - a.fecha).slice(0, 30);
            const el   = document.getElementById('stock-history-list');
            if (!movs.length) { el.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Sin movimientos registrados</p>'; return; }
            el.innerHTML = movs.map(m => {
                const isEntry = m.type === 'entrada';
                const isAdj   = m.type === 'ajuste';
                const color   = isEntry ? 'text-emerald-400' : isAdj ? 'text-blue-400' : 'text-rose-400';
                const icon    = isEntry ? '⬆️' : isAdj ? '🔄' : '⬇️';
                const sign    = isEntry ? '+' : '-';
                const fecha   = new Date(m.fecha).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                return `<div class="flex justify-between items-center bg-slate-800/30 p-2.5 rounded-xl">
                    <div>
                        <p class="text-xs font-bold">${icon} ${m.note || m.type}</p>
                        <p class="text-[10px] text-slate-500">${fecha} · ${m.prevQty} → ${m.newQty} uds</p>
                    </div>
                    <p class="text-sm font-black ${color}">${sign}${m.qty}</p>
                </div>`;
            }).join('');
        }

        async function saveStockMovement() {
            const modal   = document.getElementById('modal-stock-history');
            const stockId = parseInt(modal.dataset.stockId);
            const type    = document.getElementById('stock-mov-type').value;
            const qty     = parseInt(document.getElementById('stock-mov-qty').value);
            const note    = document.getElementById('stock-mov-note').value.trim() || type;
            if (!stockId || isNaN(qty) || qty <= 0) return showAlert('Ingresa una cantidad válida.', 'warning');
            const stock = await getAll('stock');
            const item  = stock.find(s => s.id === stockId);
            if (!item) return;
            const prevQ = item.q;
            if (type === 'salida') {
                if (qty > item.q) return showAlert(`Solo hay ${item.q} unidades disponibles.`, 'warning');
                item.q -= qty;
            } else if (type === 'ajuste') {
                item.q = qty;
            } else {
                item.q += qty;
            }
            await put('stock', item);
            await addStockMovementRecord(stockId, type, qty, note, prevQ);
            await renderStockHistory(stockId);
            await renderStock();
            await updateVentaSelect();
            document.getElementById('stock-mov-qty').value  = '';
            document.getElementById('stock-mov-note').value = '';
            showToast(`Movimiento registrado: ${type} ${qty} uds`, 'success');
        }

        function closeStockHistoryModal() { document.getElementById('modal-stock-history').classList.add('hidden'); }

        async function openStockReport() {
            const stock = await getAll('stock');
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            if (!stock.length) { showAlert('No hay productos en el inventario.', 'info'); return; }

            const totalItems    = stock.length;
            const totalValVenta = stock.reduce((a,b) => a + b.p * b.q, 0);
            const totalValCosto = stock.reduce((a,b) => a + (b.cost||0) * b.q, 0);
            const totalProfit   = totalValVenta - totalValCosto;
            const lowStock      = stock.filter(s => s.q <= (s.minStock || threshold) && s.q > 0);
            const outStock      = stock.filter(s => s.q === 0);

            const byCat = {};
            stock.forEach(s => {
                const cat = s.cat || 'Sin categoría';
                if (!byCat[cat]) byCat[cat] = { count: 0, qty: 0, val: 0 };
                byCat[cat].count++;
                byCat[cat].qty += s.q;
                byCat[cat].val += s.p * s.q;
            });

            const cur = getCurrency();
            document.getElementById('stock-report-content').innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-slate-800/60 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Productos</p>
                        <p class="text-2xl font-black text-white">${totalItems}</p>
                    </div>
                    <div class="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Valor en venta</p>
                        <p class="text-lg font-black text-emerald-400">${cur}${totalValVenta.toLocaleString()}</p>
                    </div>
                    ${totalValCosto > 0 ? `
                    <div class="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Valor invertido</p>
                        <p class="text-lg font-black text-rose-400">${cur}${totalValCosto.toLocaleString()}</p>
                    </div>
                    <div class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Ganancia potencial</p>
                        <p class="text-lg font-black text-blue-400">${cur}${totalProfit.toLocaleString()}</p>
                    </div>` : ''}
                </div>
                ${outStock.length ? `<div class="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                    <p class="text-xs font-black text-rose-400 mb-2">❌ AGOTADOS (${outStock.length})</p>
                    ${outStock.map(s=>`<p class="text-xs text-slate-300">• ${s.n}</p>`).join('')}
                </div>` : ''}
                ${lowStock.length ? `<div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p class="text-xs font-black text-amber-400 mb-2">⚠️ BAJO MÍNIMO (${lowStock.length})</p>
                    ${lowStock.map(s=>`<p class="text-xs text-slate-300">• ${s.n} — <strong>${s.q}</strong> uds</p>`).join('')}
                </div>` : ''}
                <div>
                    <p class="text-[10px] text-slate-400 font-black uppercase mb-2">Por categoría</p>
                    <div class="space-y-2">
                        ${Object.entries(byCat).sort((a,b)=>b[1].val-a[1].val).map(([cat, d]) =>
                            `<div class="flex justify-between items-center bg-slate-800/40 px-3 py-2 rounded-xl">
                                <div><p class="text-xs font-bold">${cat}</p><p class="text-[10px] text-slate-500">${d.count} prod · ${d.qty} uds</p></div>
                                <p class="text-xs font-black text-emerald-400">${cur}${d.val.toLocaleString()}</p>
                            </div>`
                        ).join('')}
                    </div>
                </div>`;
            document.getElementById('modal-stock-report').classList.remove('hidden');
        }

