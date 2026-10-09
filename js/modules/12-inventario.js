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
                (s.supplier || '').toLowerCase().includes(st)
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
                    ? `<img src="${s.img}" class="w-10 h-10 rounded-xl object-cover flex-shrink-0" loading="lazy">`
                    : `<div class="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center text-lg flex-shrink-0">${catIcon}</div>`;
                const statusBar = isOut
                    ? `<div class="h-1 rounded-full bg-rose-500 mt-1" style="width:100%"></div>`
                    : isLow
                    ? `<div class="h-1 rounded-full bg-amber-400 mt-1" style="width:${Math.min(100,(s.q/minSt)*100)}%"></div>`
                    : `<div class="h-1 rounded-full bg-emerald-500/40 mt-1" style="width:${Math.min(100,(s.q/Math.max(s.q,minSt*2))*100)}%"></div>`;

                return `<div class="flex items-center gap-3 p-3 rounded-xl border transition ${isOut ? 'bg-rose-500/5 border-rose-500/20' : isLow ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/30 border-white/5'} active:scale-[0.99]">
                    ${imgHtml}
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                            <p class="font-black text-sm truncate uppercase">${escapeHtml(s.n)}</p>
                            ${isOut ? '<span class="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-black flex-shrink-0">AGOTADO</span>' : isLow ? '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-black flex-shrink-0">BAJO</span>' : ''}
                        </div>
                        ${s.code ? `<p class="text-[10px] text-slate-500 font-mono">${s.code}</p>` : ''}
                        <div class="flex items-center gap-2 mt-0.5">
                            <p class="text-emerald-400 text-xs font-black">${getCurrency()}${s.p.toLocaleString()}</p>
                            ${s.cost > 0 ? `<p class="text-slate-500 text-[10px]">costo: ${getCurrency()}${s.cost.toLocaleString()}</p>` : ''}
                            ${margin !== null ? `<p class="text-[10px] font-bold ${margin>=0?'text-emerald-400':'text-rose-400'}">${margin>=0?'+':''}${margin}%</p>` : ''}
                        </div>
                        ${statusBar}
                    </div>
                    <div class="flex flex-col items-end gap-2 flex-shrink-0">
                        <div class="flex items-center gap-1 bg-slate-900/60 rounded-full px-1 py-0.5">
                            <button onclick="modQty(${s.id},-1)" class="w-7 h-7 rounded-full bg-slate-700 text-sm font-black active:scale-90 transition">−</button>
                            <span class="font-black text-sm w-8 text-center">${s.q}</span>
                            <button onclick="modQty(${s.id},1)" class="w-7 h-7 rounded-full bg-orange-600/60 text-sm font-black active:scale-90 transition">+</button>
                        </div>
                        <div class="flex gap-1">
                            <button onclick="openQRItemModal(${s.id})" class="text-violet-400 text-xs bg-violet-500/10 w-7 h-7 rounded-lg flex items-center justify-center hidden" title="Generar etiqueta QR">🏷️</button>
                            <button onclick="openStockHistory(${s.id})" class="text-blue-400 text-xs bg-blue-500/10 w-7 h-7 rounded-lg flex items-center justify-center" title="Historial">📋</button>
                            <button onclick="editStockItem(${s.id})" class="text-slate-400 text-xs bg-slate-700/40 w-7 h-7 rounded-lg flex items-center justify-center">✏️</button>
                            <button onclick="deleteStockItem(${s.id})" class="text-rose-400 text-xs bg-rose-500/10 w-7 h-7 rounded-lg flex items-center justify-center">🗑️</button>
                        </div>
                    </div>
                </div>`;
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
            const notes    = document.getElementById('stock-modal-notes').value.trim();
            const imgInput = document.getElementById('stock-modal-img');
            const img      = imgInput?._imgData || (id ? (await getAll('stock')).find(s=>s.id==id)?.img : null) || null;

            if (!n)              return showAlert('Ingresa el nombre del repuesto.', 'warning');
            if (isNaN(p) || p<0) return showAlert('Precio de venta inválido.', 'warning');
            if (isNaN(q) || q<0) return showAlert('Cantidad inválida.', 'warning');

            const isNew  = !id;
            const prevQ  = isNew ? 0 : ((await getAll('stock')).find(s=>s.id==parseInt(id))?.q || 0);
            const itemData = { id: id ? parseInt(id) : Date.now(), n, p, q, cost, code, cat, minStock, supplier, notes, img };
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

