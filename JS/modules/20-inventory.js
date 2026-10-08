/* NelsonApp — 20-inventory.js
 * Inventario, garantías y productos
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== INVENTARIO MEJORADO ====================
        let activeStockCategory = '';

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
            _resizeImage(input.files[0], 800, 0.75, 'image/jpeg').then(data => {
                const el = document.getElementById('stock-img-preview');
                if (el) el.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;">`;
                input._imgData = data;
            }).catch(() => { try { showAlert('No se pudo leer la imagen. Prueba con otra foto.', 'warning'); } catch(_) {} });
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

        async function openGarantiasModal() {
            await _loadGarantiasData();
            _garantiasFilter = '';
            _garantiasSection = 'all';
            const searchEl = document.getElementById('garantias-search');
            if (searchEl) searchEl.value = '';
            _renderGarantias();
            document.getElementById('modal-garantias').classList.remove('hidden');
        }

        function closeGarantiasModal() {
            document.getElementById('modal-garantias').classList.add('hidden');
        }

        async function _loadGarantiasData() {
            const orders = await getAll('orders');
            const now = Date.now();
            const list = [];
            orders.forEach(o => {
                // Solo equipos entregados con garantía configurada
                if (o.sta !== 'entregado') return;
                const dias = parseInt(o.garantia) || 0;
                if (dias <= 0) return;
                if (!o.fechaEntrega) return;
                const expira = o.fechaEntrega + dias * 86400000;
                const diasRestantes = Math.ceil((expira - now) / 86400000);
                // Estado: activa / porvencer / vencida (solo últimos 30 días vencidos)
                let estado;
                if (diasRestantes > 7)         estado = 'activa';
                else if (diasRestantes >= 0)   estado = 'porvencer';
                else if (diasRestantes >= -30) estado = 'vencida';
                else return; // muy viejas, no las mostramos
                list.push({
                    id:    o.id,
                    nom:   o.nom || 'Sin nombre',
                    equ:   o.equ || 'Equipo',
                    tel:   o.tel || '',
                    orderNum: o.orderNum,
                    diasGarantia: dias,
                    fechaEntrega: o.fechaEntrega,
                    fechaVencimiento: expira,
                    diasRestantes,
                    estado
                });
            });
            // Ordenar: por vencer primero (más urgentes), luego activas (las que vencen antes), luego vencidas (recientes)
            list.sort((a, b) => {
                const order = { porvencer: 0, activa: 1, vencida: 2 };
                if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado];
                return a.diasRestantes - b.diasRestantes;
            });
            _garantiasCache = list;
            // Actualizar KPIs
            const counts = { activa: 0, porvencer: 0, vencida: 0 };
            list.forEach(g => counts[g.estado]++);
            document.getElementById('gar-kpi-activas').textContent    = counts.activa;
            document.getElementById('gar-kpi-porvencer').textContent  = counts.porvencer;
            document.getElementById('gar-kpi-vencidas').textContent   = counts.vencida;
            // Subtítulo
            const sub = document.getElementById('garantias-header-sub');
            if (sub) {
                const total = list.length;
                if (total === 0) sub.textContent = 'Sin garantías registradas';
                else sub.textContent = `${total} equipo${total !== 1 ? 's' : ''} con garantía`;
            }
        }

        function _filterGarantias() {
            _garantiasFilter = (document.getElementById('garantias-search')?.value || '').toLowerCase().trim();
            _renderGarantias();
        }

        function _filterGarantiasBySection(section) {
            // Toggle: si ya está activa, volver a "all"
            _garantiasSection = (_garantiasSection === section) ? 'all' : section;
            // Marcar visualmente la KPI activa
            ['activas', 'porvencer', 'vencidas'].forEach(s => {
                const el = document.querySelector(`.garantias-kpi-card[onclick*="${s}"]`);
                if (el) el.classList.toggle('active', _garantiasSection === s);
            });
            _renderGarantias();
        }

        function _renderGarantias() {
            const container = document.getElementById('garantias-list');
            if (!container) return;
            let list = _garantiasCache;
            // Filtrar por sección
            if (_garantiasSection === 'activas')   list = list.filter(g => g.estado === 'activa');
            else if (_garantiasSection === 'porvencer') list = list.filter(g => g.estado === 'porvencer');
            else if (_garantiasSection === 'vencidas')  list = list.filter(g => g.estado === 'vencida');
            // Filtrar por búsqueda
            if (_garantiasFilter) {
                list = list.filter(g =>
                    g.nom.toLowerCase().includes(_garantiasFilter) ||
                    g.equ.toLowerCase().includes(_garantiasFilter)
                );
            }
            if (list.length === 0) {
                container.innerHTML = `<div class="garantia-empty">
                    <div class="garantia-empty-icon">🛡️</div>
                    <div class="garantia-empty-text">${_garantiasFilter ? 'Sin coincidencias' : 'No hay garantías en esta categoría'}</div>
                </div>`;
                return;
            }
            // Agrupar por sección si está en modo 'all'
            if (_garantiasSection === 'all') {
                const grouped = { porvencer: [], activa: [], vencida: [] };
                list.forEach(g => grouped[g.estado].push(g));
                let html = '';
                if (grouped.porvencer.length > 0) {
                    html += `<div class="garantias-section-label">⏰ Por vencer (próximos 7 días)</div>`;
                    html += grouped.porvencer.map(_garantiaCard).join('');
                }
                if (grouped.activa.length > 0) {
                    html += `<div class="garantias-section-label">✅ Garantía activa</div>`;
                    html += grouped.activa.map(_garantiaCard).join('');
                }
                if (grouped.vencida.length > 0) {
                    html += `<div class="garantias-section-label">❌ Vencidas (último mes)</div>`;
                    html += grouped.vencida.map(_garantiaCard).join('');
                }
                container.innerHTML = html;
            } else {
                container.innerHTML = list.map(_garantiaCard).join('');
            }
        }

        function _garantiaCard(g) {
            const cls = g.estado === 'porvencer' ? 'garantia-card-soon'
                      : g.estado === 'vencida'   ? 'garantia-card-expired'
                      : 'garantia-card-active';
            const iconBg = g.estado === 'porvencer' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                         : g.estado === 'vencida'   ? 'linear-gradient(135deg,#64748b,#475569)'
                         : 'linear-gradient(135deg,#10b981,#059669)';
            const icon = g.estado === 'porvencer' ? '⏰'
                       : g.estado === 'vencida'   ? '❌'
                       : '✅';
            // Texto de días
            let diasTxt, diasColor, diasBg;
            if (g.diasRestantes < 0) {
                diasTxt = `Venció hace ${Math.abs(g.diasRestantes)}d`;
                diasColor = '#fca5a5'; diasBg = 'rgba(244,63,94,0.15)';
            } else if (g.diasRestantes === 0) {
                diasTxt = 'Vence hoy';
                diasColor = '#fbbf24'; diasBg = 'rgba(245,158,11,0.2)';
            } else if (g.diasRestantes === 1) {
                diasTxt = 'Vence mañana';
                diasColor = '#fbbf24'; diasBg = 'rgba(245,158,11,0.2)';
            } else if (g.diasRestantes <= 7) {
                diasTxt = `Vence en ${g.diasRestantes} días`;
                diasColor = '#fbbf24'; diasBg = 'rgba(245,158,11,0.15)';
            } else {
                diasTxt = `Quedan ${g.diasRestantes} días`;
                diasColor = '#6ee7b7'; diasBg = 'rgba(16,185,129,0.12)';
            }
            // Fecha vencimiento formato corto
            const expDate = new Date(g.fechaVencimiento);
            const fechaTxt = `${String(expDate.getDate()).padStart(2,'0')}/${String(expDate.getMonth()+1).padStart(2,'0')}/${expDate.getFullYear()}`;
            const numLabel = g.orderNum ? `#${String(g.orderNum).padStart(4,'0')}` : '';
            return `<div class="garantia-card ${cls}" onclick="_openOrderFromGarantia(${g.id})">
                <div class="garantia-icon" style="background:${iconBg};">${icon}</div>
                <div class="garantia-info">
                    <div class="garantia-equipo">${escapeHtml(g.equ)}</div>
                    <div class="garantia-cliente">👤 ${escapeHtml(g.nom)}${numLabel ? ' · <span style="color:#64748b;">' + numLabel + '</span>' : ''}</div>
                    <div class="garantia-meta">
                        <span class="garantia-dias-pill" style="color:${diasColor};background:${diasBg};">${diasTxt}</span>
                        <span style="color:#64748b;font-weight:600;">📅 ${fechaTxt}</span>
                        <span style="color:#64748b;font-weight:600;">🛡️ ${g.diasGarantia}d total</span>
                    </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
            </div>`;
        }

        async function _openOrderFromGarantia(orderId) {
            // Cerrar el modal de garantías y abrir las notas/chat de la orden
            closeGarantiasModal();
            // Ir a la vista órdenes y resaltar
            tab('ordenes');
            // Pequeña pausa y abrimos el chat de la orden
            setTimeout(() => {
                if (typeof openOrderChat === 'function') openOrderChat(orderId);
            }, 250);
        }

        async function openStatsModal() {
            const now = new Date();
            const cur = getCurrency();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
            const endOfPrevMonth = startOfMonth - 1;
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const monthShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

            // Subtítulo del header
            const headerSub = document.getElementById('stats-header-month');
            if (headerSub) headerSub.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

            const orders = await getAll('orders');
            const sales  = await getAll('sales');

            // ===== Filtros temporales =====
            const monthOrders = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) >= startOfMonth);
            const prevMonthOrders = orders.filter(o => {
                const t = o.fechaEntrega || o.fecha || 0;
                return o.sta === 'entregado' && t >= startOfPrevMonth && t <= endOfPrevMonth;
            });
            const newThisMonth = orders.filter(o => (o.fecha || 0) >= startOfMonth).length;
            const inProgress = orders.filter(o => o.sta !== 'entregado' && o.sta !== 'cancelado').length;
            const monthSales = sales.filter(s => s.fecha >= startOfMonth && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega');
            const prevMonthSales = sales.filter(s => s.fecha >= startOfPrevMonth && s.fecha <= endOfPrevMonth && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega');

            // ===== Ingresos del mes (reparaciones + ventas de repuestos) =====
            const monthIngresosRep = monthOrders.reduce((a,b) => a + (b.val || 0), 0);
            const monthIngresosVen = monthSales.reduce((a,b) => a + (b.val || 0), 0);
            const monthIngresos = monthIngresosRep + monthIngresosVen;
            const prevIngresosRep = prevMonthOrders.reduce((a,b) => a + (b.val || 0), 0);
            const prevIngresosVen = prevMonthSales.reduce((a,b) => a + (b.val || 0), 0);
            const prevIngresos = prevIngresosRep + prevIngresosVen;

            document.getElementById('stats-hero-ingresos').textContent = cur + monthIngresos.toLocaleString();
            _renderStatTrend('stats-hero-ingresos-trend', monthIngresos, prevIngresos, monthShort[((now.getMonth()-1)+12)%12]);

            // ===== Ticket promedio =====
            const ticketProm = monthOrders.length > 0 ? Math.round(monthIngresosRep / monthOrders.length) : 0;
            const prevTicket = prevMonthOrders.length > 0 ? Math.round(prevIngresosRep / prevMonthOrders.length) : 0;
            document.getElementById('stats-hero-ticket').textContent = cur + ticketProm.toLocaleString();
            _renderStatTrend('stats-hero-ticket-trend', ticketProm, prevTicket, monthShort[((now.getMonth()-1)+12)%12]);

            // ===== Mini stats =====
            document.getElementById('stat-orders').textContent = monthOrders.length;
            document.getElementById('stat-sales').textContent = monthSales.length;
            document.getElementById('stat-in-progress').textContent = inProgress;
            document.getElementById('stat-new-this-month').textContent = newThisMonth;

            // ===== Distribución por estado (todas las órdenes activas, no solo las del mes) =====
            const statusEl = document.getElementById('stats-status-list');
            if (statusEl) {
                // Estados en orden lógico del flujo
                const statusDef = [
                    { key: 'recibido',     label: 'Recibido',     emoji: '📥', color: '#3b82f6' },
                    { key: 'revisión',     label: 'En revisión',  emoji: '🔍', color: '#fb923c' },
                    { key: 'reparando',    label: 'Reparando',    emoji: '🔧', color: '#f59e0b' },
                    { key: 'reparado',     label: 'Listo',        emoji: '✅', color: '#10b981' },
                    { key: 'entregado',    label: 'Entregado',    emoji: '📦', color: '#94a3b8' },
                    { key: 'no-reparable', label: 'No reparable', emoji: '🚫', color: '#f43f5e' }
                ];
                const counts = {};
                statusDef.forEach(s => counts[s.key] = 0);
                orders.forEach(o => {
                    if (o.sta && counts[o.sta] !== undefined) counts[o.sta]++;
                });
                // El máximo se calcula sobre todos para que las barras sean comparables
                const maxCount = Math.max(...Object.values(counts), 1);
                statusEl.innerHTML = statusDef
                    .filter(s => counts[s.key] > 0 || s.key === 'recibido' || s.key === 'reparado') // siempre mostrar recibido y listo aunque sean 0
                    .map(s => {
                        const c = counts[s.key];
                        const pct = Math.round((c / maxCount) * 100);
                        return `<div class="stats-status-row">
                            <div class="stats-status-row-head">
                                <span class="stats-status-name"><span class="stats-status-name-emoji">${s.emoji}</span>${s.label}</span>
                                <span class="stats-status-count" style="color:${c > 0 ? s.color : '#475569'}">${c}</span>
                            </div>
                            <div class="stats-status-bar-track">
                                <div class="stats-status-bar-fill" style="width:${pct}%;background:${s.color};"></div>
                            </div>
                        </div>`;
                    }).join('');
                // Subtítulo con total
                const subEl = document.getElementById('stats-status-sub');
                if (subEl) subEl.textContent = `${orders.length} en total`;
            }

            // ===== Ganancia real (usa partsUsed cuando existe) =====
            const profitCard = document.getElementById('stats-profit-card');
            if (profitCard) {
                const ordersWithParts = monthOrders.filter(o => Array.isArray(o.partsUsed) && o.partsUsed.length > 0);
                if (ordersWithParts.length === 0) {
                    // No hay datos de repuestos usados → ocultar la tarjeta
                    profitCard.classList.add('hidden');
                } else {
                    profitCard.classList.remove('hidden');
                    // Ingresos solo de las órdenes QUE tienen partsUsed (justo para el cálculo real)
                    const ingresosConParts = ordersWithParts.reduce((a,b) => a + (b.val || 0), 0);
                    const costoTotal = ordersWithParts.reduce((acc, o) => {
                        return acc + o.partsUsed.reduce((s, p) => s + ((p.cost || 0) * (p.qty || 0)), 0);
                    }, 0);
                    const gananciaNeta = ingresosConParts - costoTotal;
                    const margenPct = ingresosConParts > 0 ? Math.round((gananciaNeta / ingresosConParts) * 100) : 0;

                    document.getElementById('stats-profit-ingresos').textContent = cur + ingresosConParts.toLocaleString();
                    document.getElementById('stats-profit-costos').textContent = '−' + cur + costoTotal.toLocaleString();
                    document.getElementById('stats-profit-neto').textContent = cur + gananciaNeta.toLocaleString();

                    const marginEl = document.getElementById('stats-profit-margin');
                    if (marginEl) {
                        marginEl.className = 'stats-profit-margin' + (margenPct < 20 ? ' bad' : margenPct < 40 ? ' warn' : '');
                        const emoji = margenPct >= 50 ? '🚀' : margenPct >= 30 ? '💪' : margenPct >= 15 ? '⚠️' : '🔴';
                        marginEl.textContent = `${emoji} Margen ${margenPct}%`;
                    }
                    const hintEl = document.getElementById('stats-profit-hint');
                    if (hintEl) {
                        const pendientes = monthOrders.length - ordersWithParts.length;
                        hintEl.textContent = pendientes > 0
                            ? `Basado en ${ordersWithParts.length} de ${monthOrders.length} órdenes. ${pendientes} sin registrar repuestos.`
                            : `Basado en las ${ordersWithParts.length} órdenes del mes.`;
                    }
                }
            }

            // ===== Tendencia 6 meses =====
            const trendData = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const startMs = d.getTime();
                const endMs = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime() - 1;
                const ordMs = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) >= startMs && (o.fechaEntrega || o.fecha) <= endMs);
                const venMs = sales.filter(s => s.fecha >= startMs && s.fecha <= endMs && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega');
                const total = ordMs.reduce((a,b) => a + (b.val || 0), 0) + venMs.reduce((a,b) => a + (b.val || 0), 0);
                trendData.push({ label: monthShort[d.getMonth()], total, current: i === 0 });
            }
            const maxTrend = Math.max(...trendData.map(t => t.total), 1);
            const trendEl = document.getElementById('stats-trend-chart');
            if (trendEl) {
                trendEl.innerHTML = trendData.map(t => {
                    const h = Math.max(3, Math.round((t.total / maxTrend) * 70));
                    const valStr = t.total >= 1000000 ? (t.total/1000000).toFixed(1)+'M' : (t.total >= 1000 ? Math.round(t.total/1000)+'k' : t.total);
                    return `<div class="stats-trend-bar-col${t.current ? ' current' : ''}">
                        <div class="stats-trend-bar-wrap">
                            <div class="stats-trend-bar${t.current ? ' current' : ''}" style="height:${h}%;"></div>
                        </div>
                        <div class="stats-trend-label">${t.label}</div>
                        <div class="stats-trend-val">${t.total ? cur + valStr : '—'}</div>
                    </div>`;
                }).join('');
            }

            // ===== Top 3 repuestos con % del total =====
            const itemCounts = {};
            monthSales.forEach(s => itemCounts[s.item] = (itemCounts[s.item] || 0) + (s.qty || 1));
            const sortedItems = Object.entries(itemCounts).sort((a,b) => b[1] - a[1]).slice(0,3);
            const totalUnits = Object.values(itemCounts).reduce((a,b) => a + b, 0);
            const topMax = sortedItems[0] ? sortedItems[0][1] : 1;
            const topEl = document.getElementById('stat-top-items');
            if (topEl) {
                topEl.innerHTML = sortedItems.length
                    ? sortedItems.map(([name, count], i) => {
                        const pct = totalUnits > 0 ? Math.round(count / totalUnits * 100) : 0;
                        const widthPct = Math.round(count / topMax * 100);
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                        return `<div class="stats-bar-row stats-bar-top">
                            <div class="stats-bar-fill" style="width:${widthPct}%;"></div>
                            <div class="stats-bar-content">
                                <span class="stats-bar-label"><span class="stats-bar-rank">${medal}</span>${escapeHtml(name || 'Sin nombre')}</span>
                                <span class="stats-bar-value">${count} <span class="stats-bar-pct">${pct}%</span></span>
                            </div>
                        </div>`;
                    }).join('')
                    : '<div class="stats-empty">Sin ventas este mes</div>';
            }

            // ===== Técnicos con medallas y tiempo promedio =====
            const tecMap = {};
            orders.filter(o => o.sta === 'entregado' && o.tecnico && o.fechaEntrega && o.fecha)
                .forEach(o => {
                    if (!tecMap[o.tecnico]) tecMap[o.tecnico] = [];
                    tecMap[o.tecnico].push(Math.round((o.fechaEntrega - o.fecha) / 86400000));
                });
            const tecStats = Object.entries(tecMap)
                .map(([tec, dias]) => ({
                    tec,
                    prom: Math.round(dias.reduce((a,b) => a+b, 0) / dias.length * 10) / 10,
                    total: dias.length
                }))
                .sort((a,b) => a.prom - b.prom);
            const tecEl = document.getElementById('stat-tecnicos');
            if (tecEl) {
                tecEl.innerHTML = tecStats.length
                    ? tecStats.map((t, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👷';
                        return `<div class="stats-tec-row">
                            <div class="stats-tec-medal">${medal}</div>
                            <div class="stats-tec-info">
                                <div class="stats-tec-name">${escapeHtml(t.tec)}</div>
                                <div class="stats-tec-sub">${t.total} orden${t.total !== 1 ? 'es' : ''} entregada${t.total !== 1 ? 's' : ''}</div>
                            </div>
                            <div>
                                <span class="stats-tec-metric">${t.prom}</span><span class="stats-tec-metric-unit">d prom.</span>
                            </div>
                        </div>`;
                    }).join('')
                    : '<div class="stats-empty">Asigna técnicos a las órdenes para ver este reporte</div>';
            }

            // ===== Origen de clientes con barras horizontales =====
            const origenLabels = {recomendacion:'🗣️ Recomendación', redes:'📱 Redes sociales', cliente_frecuente:'⭐ Frecuente', google:'🔍 Google', local:'🏠 Pasó por el local', whatsapp:'💬 WhatsApp', otro:'📌 Otro'};
            const origenCount = {};
            orders.filter(o => o.origen).forEach(o => { origenCount[o.origen] = (origenCount[o.origen] || 0) + 1; });
            const totalOrigen = Object.values(origenCount).reduce((a,b) => a+b, 0);
            const sortedOrigen = Object.entries(origenCount).sort((a,b) => b[1] - a[1]);
            const maxOrigen = sortedOrigen[0] ? sortedOrigen[0][1] : 1;
            const origenEl = document.getElementById('stat-origen');
            if (origenEl) {
                origenEl.innerHTML = sortedOrigen.length > 0
                    ? sortedOrigen.map(([k, v]) => {
                        const pct = totalOrigen > 0 ? Math.round(v / totalOrigen * 100) : 0;
                        const widthPct = Math.round(v / maxOrigen * 100);
                        return `<div class="stats-bar-row">
                            <div class="stats-bar-fill" style="width:${widthPct}%;"></div>
                            <div class="stats-bar-content">
                                <span class="stats-bar-label">${origenLabels[k] || k}</span>
                                <span class="stats-bar-value">${v} <span class="stats-bar-pct">${pct}%</span></span>
                            </div>
                        </div>`;
                    }).join('')
                    : '<div class="stats-empty">Registra "¿Cómo nos conoció?" al crear órdenes</div>';
            }

            document.getElementById('modal-stats').classList.remove('hidden');
        }

        // Helper: calcula y pinta el trend vs mes anterior
        function _renderStatTrend(elId, current, previous, prevLabel) {
            const el = document.getElementById(elId);
            if (!el) return;
            if (previous === 0 && current === 0) {
                el.innerHTML = '<span class="stats-trend-flat">— Sin datos previos</span>';
                return;
            }
            if (previous === 0) {
                el.innerHTML = `<span class="stats-trend-up">▲ Nuevo · 0 en ${prevLabel}</span>`;
                return;
            }
            const diff = current - previous;
            const pct = Math.round((diff / previous) * 100);
            if (Math.abs(pct) < 2) {
                el.innerHTML = `<span class="stats-trend-flat">≈ Similar a ${prevLabel}</span>`;
            } else if (pct > 0) {
                el.innerHTML = `<span class="stats-trend-up">▲ ${pct}% vs ${prevLabel}</span>`;
            } else {
                el.innerHTML = `<span class="stats-trend-down">▼ ${Math.abs(pct)}% vs ${prevLabel}</span>`;
            }
        }
        function closeStatsModal() { document.getElementById('modal-stats').classList.add('hidden'); }

        function toggleFilters() { document.getElementById('filter-panel').classList.toggle('open'); document.getElementById('filterToggleBtn').classList.toggle('open'); }
        function applyFilters() {
            filters = {
                text: document.getElementById('search-orders').value.toUpperCase(),
                dateFrom: document.getElementById('filter-date-from').value ? new Date(document.getElementById('filter-date-from').value).getTime() : null,
                dateTo: document.getElementById('filter-date-to').value ? new Date(document.getElementById('filter-date-to').value).getTime() + 86399999 : null,
                statuses: Array.from(document.querySelectorAll('.status-filter:checked')).map(cb=>cb.value),
                tecnico: document.getElementById('filter-tecnico')?.value || '',
                // Filtros estrictos (se resetean con cada nueva escritura, activados por tarjetas)
                exactClient: null,
                exactOrderId: null
            };
            renderOrders();
        }
        function clearFilters() {
            document.getElementById('search-orders').value='';
            document.getElementById('filter-date-from').value='';
            document.getElementById('filter-date-to').value='';
            document.querySelectorAll('.status-filter').forEach(cb=>cb.checked=false);
            const ft = document.getElementById('filter-tecnico'); if(ft) ft.value='';
            applyFilters();
        }
        // Cache de autocomplete (reemplaza los datalist removidos)
        let _acData = { cliente: [], equipo: [] };

        async function updateSuggestions() {
            const orders = await getAll('orders');
            const cl = [...new Set(orders.map(o=>o.nom).filter(Boolean))];
            const eq = [...new Set(orders.map(o=>o.equ).filter(Boolean))];
            _acData.cliente = cl;
            _acData.equipo  = eq;
            // search-suggestions todavía es un datalist nativo — el buscador de órdenes lo usa
            const searchList = document.getElementById('search-suggestions');
            if (searchList) searchList.innerHTML = [...cl,...eq].map(s=>`<option value="${escapeHtml(s)}">`).join('');
        }

        async function exportData() {
            try {
                const loading = document.createElement('div'); loading.innerHTML = '<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[4000]"><div class="bg-slate-800 p-6 rounded-2xl text-center"><div class="loading-spinner mx-auto"></div><p class="mt-2 text-sm">Exportando...</p></div></div>'; document.body.appendChild(loading);
                const orders = await getAll('orders'); const stock = await getAll('stock'); const sales = await getAll('sales'); const gastos = await getAll('gastos'); const clientes = await getAll('clientes'); const payments = await getAll('payments'); const calificaciones = await getAll('calificaciones'); const stockHistory = await getAll('stockHistory'); const orderChat = await getAll('orderChat'); const paymentPlans = await getAll('paymentPlans');

                const exportOrders = [];
                for(let o of orders) {
                    const fotos = await blobsToB64(o.fotos || []);
                    const fotosEntrega = await blobsToB64(o.fotosEntrega || []);
                    exportOrders.push({...o, fotos, fotosEntrega});
                }

                const jsonStr = JSON.stringify({orders:exportOrders, stock, sales, gastos, clientes, payments, calificaciones, stockHistory, orderChat, paymentPlans});
                const fileName = `nelson_backup_${_ymdLocal(new Date())}.json`;
                loading.remove();

                if (navigator.share && navigator.canShare) {
                    try {
                        const file = new File([jsonStr], fileName, { type: 'application/json' });
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: 'Respaldo Nelson App' });
                            showAlert("Respaldo listo para guardar o compartir.", "success");
                            return;
                        }
                    } catch(shareErr) {
                        if (shareErr.name !== 'AbortError') console.warn('Share API falló:', shareErr);
                    }
                }

                try {
                    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
                    const a = document.createElement('a');
                    a.href = dataUri;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    showAlert("Exportación completada. Revisa tus descargas.", "success");
                    return;
                } catch(e2) { console.warn('data URI falló:', e2); }

                showExportFallback(jsonStr, fileName);

            } catch(e) {
                document.querySelectorAll('.fixed.inset-0.bg-black\\/70').forEach(el => el.remove());
                showAlert("Error al exportar: " + e.message, "error");
            }
        }

        function showExportFallback(jsonStr, fileName) {
            const existing = document.getElementById('modal-export-fallback');
            if (existing) existing.remove();
            const modal = document.createElement('div');
            modal.id = 'modal-export-fallback';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';
            modal.innerHTML = `
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:24px;width:100%;max-width:400px;overflow:hidden;">
                    <div style="background:linear-gradient(to right,#f97316,#ea580c);padding:16px;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="color:white;font-weight:900;font-size:16px;">📤 GUARDAR RESPALDO</h3>
                        <button onclick="document.getElementById('modal-export-fallback').remove()" style="color:white;background:rgba(0,0,0,0.3);width:32px;height:32px;border-radius:50%;font-weight:bold;font-size:16px;">✕</button>
                    </div>
                    <div style="padding:20px;space-y:12px;">
                        <p style="color:#94a3b8;font-size:12px;margin-bottom:12px;">Elige cómo guardar tu respaldo <strong style="color:#f97316;">${fileName}</strong>:</p>
                        <button onclick="exportViaShare('${encodeURIComponent(jsonStr)}','${fileName}')" style="width:100%;background:#10b981;color:white;padding:14px;border-radius:12px;font-weight:900;font-size:13px;margin-bottom:8px;display:block;">📨 COMPARTIR / ENVIAR POR WHATSAPP</button>
                        <button onclick="exportViaCopy('${encodeURIComponent(jsonStr)}')" style="width:100%;background:#3b82f6;color:white;padding:14px;border-radius:12px;font-weight:900;font-size:13px;margin-bottom:8px;display:block;">📋 COPIAR AL PORTAPAPELES</button>
                        <p style="color:#475569;font-size:10px;text-align:center;margin-top:8px;">Puedes pegar el contenido en un archivo .txt y renombrarlo a .json</p>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        async function exportViaShare(encodedJson, fileName) {
            try {
                const jsonStr = decodeURIComponent(encodedJson);
                const file = new File([jsonStr], fileName, { type: 'application/json' });
                await navigator.share({ files: [file], title: 'Respaldo Nelson App' });
                document.getElementById('modal-export-fallback')?.remove();
            } catch(e) { showAlert('No se pudo compartir: ' + e.message, 'error'); }
        }

        async function exportViaCopy(encodedJson) {
            try {
                const jsonStr = decodeURIComponent(encodedJson);
                await _copyText(jsonStr);
                showAlert('✅ Contenido copiado al portapapeles. Pégalo en un archivo .json para guardarlo.', 'success');
                document.getElementById('modal-export-fallback')?.remove();
            } catch(e) { showAlert('No se pudo copiar: ' + e.message, 'error'); }
        }

        async function blobsToB64(blobs) {
            if (!blobs || !blobs.length) return [];
            return Promise.all(blobs.map(b => {
                if (typeof b === 'string') return b;
                return new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(b); });
            }));
        }

        function b64toBlob(b64) {
            try {
                const [header, data] = b64.split(',');
                const mime = header.match(/:(.*?);/)[1];
                const binary = atob(data);
                const arr = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                return new Blob([arr], { type: mime });
            } catch(e) { return null; }
        }

        // ── Validación de respaldos: descarta registros con tipos inválidos ──
        // Si el archivo viene corrupto o modificado, evita meter basura en IndexedDB.
        function _validateBackup(data) {
            if (!data || typeof data !== 'object') return { ok:false, msg:'Archivo vacío o inválido' };
            if (!Array.isArray(data.orders)) return { ok:false, msg:'No tiene órdenes (formato Nelson incorrecto)' };
            // Filtros: cada registro debe tener id numérico y campos críticos del tipo correcto
            const validOrder = (o) => o && typeof o === 'object' && (typeof o.id === 'number' || typeof o.id === 'string') && typeof o.nom === 'string' && typeof o.equ === 'string';
            const validNum   = (x) => x && typeof x === 'object' && (typeof x.id === 'number' || typeof x.id === 'string') && (typeof x.val === 'number' || typeof x.val === 'undefined');
            const validKeyed = (x) => x && typeof x === 'object' && (typeof x.id === 'number' || typeof x.id === 'string');
            data.orders        = data.orders.filter(validOrder);
            data.stock         = Array.isArray(data.stock) ? data.stock.filter(validKeyed) : [];
            data.sales         = Array.isArray(data.sales) ? data.sales.filter(validNum) : [];
            data.gastos        = Array.isArray(data.gastos) ? data.gastos.filter(validNum) : [];
            data.clientes      = Array.isArray(data.clientes) ? data.clientes.filter(c => c && typeof c === 'object' && typeof c.nombre === 'string') : [];
            data.payments      = Array.isArray(data.payments) ? data.payments.filter(validKeyed) : [];
            data.calificaciones= Array.isArray(data.calificaciones) ? data.calificaciones.filter(validKeyed) : [];
            data.stockHistory  = Array.isArray(data.stockHistory) ? data.stockHistory.filter(validKeyed) : [];
            data.orderChat     = Array.isArray(data.orderChat) ? data.orderChat.filter(validKeyed) : [];
            data.paymentPlans  = Array.isArray(data.paymentPlans) ? data.paymentPlans.filter(validKeyed) : [];
            return { ok:true, data };
        }

        // Copia de seguridad automática ANTES de reemplazar los datos al restaurar/importar.
        // Va a Drive si hay sesión y red; si no, se descarga como archivo en el dispositivo.
        async function _preRestoreSnapshot() {
            try {
                const names = ['orders','stock','sales','gastos','clientes','payments','calificaciones','stockHistory','orderChat','paymentPlans'];
                const [orders, stock, sales, gastos, clientes, payments, calificaciones, stockHistory, orderChat, paymentPlans] = await Promise.all(names.map(n => getAll(n)));
                // Base vacía (instalación nueva): no hay nada que proteger
                if (!orders.length && !stock.length && !sales.length && !gastos.length && !clientes.length) return { ok: true, where: 'skip' };

                const exportOrders = [];
                for (const o of orders) exportOrders.push({ ...o, fotos: await blobsToB64(o.fotos || []), fotosEntrega: await blobsToB64(o.fotosEntrega || []) });
                const jsonStr = JSON.stringify({ orders: exportOrders, stock, sales, gastos, clientes, payments, calificaciones, stockHistory, orderChat, paymentPlans, date: new Date().toISOString(), snapshot: 'pre-restore' });
                const d = new Date();
                const stamp = _ymdLocal(d) + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
                const fileName = `nelson_backup_prerestore_${stamp}.json`;
                const blob = new Blob([jsonStr], { type: 'application/json' });

                // 1) Drive (si hay sesión y red)
                if (localStorage.getItem('driveEmail') && navigator.onLine && await _driveEnsureFresh() && driveToken) {
                    try {
                        showDriveProgress(fileName);
                        updateDriveProgress(0, 0, blob.size, 'Guardando copia de seguridad antes de restaurar...');
                        const folderId = await ensureDriveFolder();
                        if (!folderId) throw new Error('sin carpeta en Drive');
                        const form = new FormData();
                        form.append('metadata', new Blob([JSON.stringify({ name: fileName, parents: [folderId] })], { type: 'application/json' }));
                        form.append('file', blob);
                        const res = await uploadToDriveWithProgress('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', 'POST', form, driveToken,
                            (pct, loaded, total) => updateDriveProgress(pct, loaded, total, 'Guardando copia de seguridad...'));
                        if (!res || !res.id) throw new Error('Drive no confirmó el archivo');
                        updateDriveProgress(100, blob.size, blob.size, '✓ Copia de seguridad guardada');
                        hideDriveProgress(500);
                        await new Promise(r => setTimeout(r, 550));
                        driveApplyRetention(folderId);
                        return { ok: true, where: 'drive', fileName };
                    } catch (e) {
                        hideDriveProgress();
                        console.warn('[Restore] Copia previa a Drive falló, se descargará local:', e.message);
                    }
                }

                // 2) Respaldo local: descarga del archivo
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 60000);
                return { ok: true, where: 'local', fileName };
            } catch (e) {
                return { ok: false, reason: e.message || 'error desconocido' };
            }
        }

        async function importData(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if(!file) return;
            // Límite de tamaño: respaldos > 100MB son sospechosos
            if (file.size > 100 * 1024 * 1024) {
                showAlert("❌ Archivo demasiado grande (>100MB). ¿Estás seguro que es un respaldo Nelson?", "error"); return;
            }
            let data;
            try {
                const text = await file.text();
                data = JSON.parse(text);
            } catch(err) {
                showAlert("❌ El archivo no es un JSON válido.", "error"); return;
            }
            const v = _validateBackup(data);
            if (!v.ok) { showAlert("❌ " + v.msg, "error"); return; }
            data = v.data;
            const summary = `Órdenes: ${data.orders.length} · Inventario: ${data.stock.length} · Ventas: ${data.sales.length} · Clientes: ${data.clientes.length}`;
            const _runImport = async () => {
                try {
                    await clearStore('orders'); await clearStore('stock'); await clearStore('sales');
                    await clearStore('gastos'); await clearStore('clientes'); await clearStore('payments');
                    await clearStore('stockHistory'); await clearStore('orderChat');
                    await clearStore('paymentPlans'); await clearStore('calificaciones');
                    for(let o of data.orders) {
                        const fotos = [];
                        if(o.fotos && Array.isArray(o.fotos)) {
                            for(let b64 of o.fotos) { if(typeof b64==='string'&&b64.startsWith('data:')){ const blob=b64toBlob(b64); if(blob) fotos.push(blob); } }
                        }
                        const fotosEntrega = [];
                        if(o.fotosEntrega && Array.isArray(o.fotosEntrega)) {
                            for(let b64 of o.fotosEntrega) { if(typeof b64==='string'&&b64.startsWith('data:')){ const blob=b64toBlob(b64); if(blob) fotosEntrega.push(blob); } }
                        }
                        await put('orders', {...o, fotos, fotosEntrega});
                    }
                    for(let s of data.stock) await put('stock', _normStock(s));
                    for(let s of data.sales) await put('sales', s);
                    for(let g of data.gastos) await put('gastos', g);
                    for(let c of data.clientes) await put('clientes', c);
                    for(let p of data.payments) await put('payments', p);
                    for(let c of data.calificaciones) await put('calificaciones', c);
                    for(let h of data.stockHistory) await put('stockHistory', h);
                    for(let m of data.orderChat) await put('orderChat', m);
                    for(let p of data.paymentPlans) await put('paymentPlans', p);
                    // Limpiar campos duplicados y normalizar tipos por si el backup era viejo
                    await _migrateStockFields();
                    await updateTotal(); await updateSuggestions(); await renderCartera();
                    showAlert("✅ Importación exitosa. La app se recargará.", "success", () => location.reload());
                } catch(err) { showAlert("Error al importar: " + err.message, "error"); }
            };
            showConfirm(`¿Importar este respaldo?\n\n${summary}\n\nSe reemplazará TODA la información actual.\nAntes se guardará una copia de seguridad de tus datos actuales.`, async () => {
                const snap = await _preRestoreSnapshot();
                if (snap.ok) {
                    if (snap.where === 'local') showToast('Copia de seguridad descargada en tu dispositivo', 'info');
                    await _runImport();
                } else {
                    showConfirm(`No se pudo crear la copia de seguridad previa (${snap.reason}).\n\n¿Restaurar de todos modos? Se perderán los datos actuales.`, _runImport);
                }
            });
        }

        // Escáner de código de barras
        async function scanBarcode() {
            if (!(await window._ensureBarcodeDetector())) {
                showAlert("Tu navegador no soporta escaneo de códigos. Usa la búsqueda manual.", "warning");
                return;
            }
            cameraMode = 'barcode';
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                const video = document.getElementById('video'); video.srcObject = stream; await video.play();
                document.getElementById('camera-modal').classList.remove('hidden');
                const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code'] });
                const interval = setInterval(async () => {
                    if (!video.videoWidth) return;
                    const barcodes = await detector.detect(video);
                    if (barcodes.length > 0) {
                        clearInterval(interval);
                        closeCamera();
                        const code = barcodes[0].rawValue;
                        const stock = await getAll('stock');
                        const product = stock.find(p => p.barcode === code || p.n.includes(code));
                        if (product) {
                            showAlert(`Producto encontrado: ${product.n}\nStock actual: ${product.q} unidades`, "success");
                            document.getElementById('stock-search').value = product.n;
                            renderStock();
                        } else {
                            showConfirm(`Código ${code} no registrado.\n¿Deseas agregarlo como nuevo producto?`, () => {
                                document.getElementById('stock-modal-id').value = '';
                                document.getElementById('stock-modal-name').value = code.toUpperCase();
                                document.getElementById('stock-modal-price').value = '';
                                document.getElementById('stock-modal-qty').value = '0';
                                document.getElementById('stock-modal-title').innerText = 'NUEVO REPUESTO';
                                document.getElementById('modal-stock-form').classList.remove('hidden');
                            }, "info");
                        }
                    }
                }, 1000);
            } catch(e) { showAlert("Error al iniciar cámara: " + e.message, "error"); }
        }

        // Swipe entre tabs — DESACTIVADO
        // Razón: en una app de trabajo con 4 modos muy distintos (formulario, lista,
        // transaccional, config), el swipe horizontal genera cambios accidentales
        // mientras scrolleás vertical. Es preferible la navegación explícita con los
        // botones de abajo (mobile), el sidebar (desktop/tablet) o los atajos 1-4.

        function tab(t) {
            // ═══ PASO 1: actualización visual INSTANTÁNEA (sin esperas) ═══
            // La animación del botón y el cambio de vista deben ser inmediatos
            if (cameraMode !== 'entrega') closeCamera();
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${t}`).classList.remove('hidden');
            // Sync nav bar inferior mobile
            document.querySelectorAll('nav.bottom-nav-mobile .nav-btn').forEach(b => b.classList.remove('nav-active'));
            const mobileBtn = document.getElementById(`btn-${t}`);
            if (mobileBtn) mobileBtn.classList.add('nav-active');
            // Sync sidebar
            ['taller','ordenes','ventas','admin'].forEach(name => {
                const sEl = document.getElementById(`sidebar-btn-${name}`);
                if (sEl) sEl.classList.toggle('active', name === t);
            });
            // Sync desktop topbar title
            const tabTitles = { taller:'Nueva Recepción', ordenes:'Órdenes', ventas:'Caja & Inventario', admin:'Datos & Config' };
            const dtTitle = document.getElementById('desktop-topbar-title');
            if (dtTitle) dtTitle.innerText = tabTitles[t] || 'NELSON';
            window.scrollTo(0,0);

            // ═══ PASO 2: renderizados pesados en segundo plano (no bloqueantes) ═══
            // Dejamos que el navegador pinte primero, luego cargamos los datos
            requestAnimationFrame(() => {
                setTimeout(async () => {
                    try {
                        if (t === 'ordenes') {
                            await renderOrders();
                        } else if (t === 'ventas') {
                            // Paralelizar las 4 cargas en vez de secuencial
                            await Promise.all([
                                renderStock(),
                                renderMovimientos(),
                                updateVentaSelect(),
                                renderCartera()
                            ]);
                        } else if (t === 'taller') {
                            _refreshDailyPanel();
                        }
                        syncSidebarCash();
                    } catch(e) { console.warn('[tab async render]', e); }
                }, 0);
            });
        }

