/* Nelson App Pro · js/modules/09-ordenes-crud-busqueda.js
   Guardar/editar/duplicar ordenes y busqueda reciente
   (extraido sin cambios de index.html; el orden de carga importa) */
        // Abrir historial del cliente desde la tarjeta en Taller
        function _openClientHistoryFromTaller() {
            const nom = document.getElementById('c-nom').value.trim().toUpperCase();
            if (nom && typeof showClientHistory === 'function') {
                showClientHistory(nom);
            }
        }

        // ============ AUTOCOMPLETE CUSTOM (clientes / equipos) ============
        // Reemplaza el datalist nativo que se veía feo en WebView/APK
        let _acBlurTimer = null;

        function _acEscape(s) {
            return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        }
        function _acHighlight(text, query) {
            if (!query) return _acEscape(text);
            const t = _acEscape(text);
            const q = _acEscape(query);
            try {
                const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'i');
                return t.replace(re, '<mark>$1</mark>');
            } catch(_) { return t; }
        }
        function _acNormalize(s) {
            return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        }

        function ac_onInput(inputEl, kind) {
            if (_acBlurTimer) { clearTimeout(_acBlurTimer); _acBlurTimer = null; }
            const dropdown = document.getElementById('ac-dropdown-' + kind);
            if (!dropdown) return;
            const rawQuery = (inputEl.value || '').trim();
            const q = _acNormalize(rawQuery);
            const source = _acData[kind] || [];

            // Si no hay query, no mostrar nada (menos distracción)
            if (!q) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                return;
            }

            // Filtrar: prioridad startsWith, luego includes
            const starts = [], contains = [];
            for (const item of source) {
                const n = _acNormalize(item);
                if (n === q) continue; // exacta: ya lo tipeó
                if (n.startsWith(q)) starts.push(item);
                else if (n.includes(q)) contains.push(item);
            }
            const results = [...starts, ...contains].slice(0, 8);

            if (results.length === 0) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                return;
            }

            const icon = kind === 'cliente' ? '👤' : '🔧';
            dropdown.innerHTML = results.map(r =>
                `<div class="ac-item" onmousedown="ac_pick('${_acEscape(inputEl.id)}','${_acEscape(r).replace(/'/g,"&#39;")}','${kind}')">
                    <span class="ac-item-icon">${icon}</span>
                    <span class="ac-item-text">${_acHighlight(r, rawQuery)}</span>
                </div>`
            ).join('');
            dropdown.style.display = 'block';
            dropdown.scrollTop = 0;
        }

        function ac_pick(inputId, value, kind) {
            // decode HTML entities que insertamos arriba
            const tmp = document.createElement('textarea');
            tmp.innerHTML = value;
            const clean = tmp.value;

            const input = document.getElementById(inputId);
            if (input) {
                input.value = clean;
                // Disparar el mismo side-effect que el input nativo tendría
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const dropdown = document.getElementById('ac-dropdown-' + kind);
            if (dropdown) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; }
            // checkClient si es cliente
            if (inputId === 'c-nom' && typeof checkClient === 'function') checkClient();
            // Actualizar preview del taller (desktop)
            if (typeof updateTallerPreview === 'function') updateTallerPreview();
        }

        function ac_onBlur() {
            // Delay antes de cerrar para permitir el click/tap en un item
            _acBlurTimer = setTimeout(() => {
                document.querySelectorAll('.ac-dropdown').forEach(d => {
                    d.style.display = 'none';
                    d.innerHTML = '';
                });
                _acBlurTimer = null;
            }, 180);
        }

        // Cerrar dropdowns al tocar fuera (por si acaso)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ac-dropdown') && !e.target.closest('input')) {
                document.querySelectorAll('.ac-dropdown').forEach(d => {
                    d.style.display = 'none';
                });
            }
        });

        function calcSaldoPreview() {
            const val = Number(document.getElementById('c-val').value) || 0;
            const adelanto = Number(document.getElementById('c-adelanto').value) || 0;
            const box = document.getElementById('saldo-preview');
            const valEl = document.getElementById('saldo-preview-val');
            if (adelanto > 0 && val > 0) {
                const saldo = val - adelanto;
                valEl.innerText = '$' + Math.max(0, saldo).toLocaleString();
                valEl.className = saldo <= 0 ? 'text-emerald-400 font-black text-base' : 'text-rose-400 font-black text-base';
                box.classList.remove('hidden');
            } else {
                box.classList.add('hidden');
            }
        }

        function _shakeField(id) {
            const el = document.getElementById(id);
            if (!el) return;
            const orig = el.style.borderColor;
            el.style.transition = "border-color 0s";
            el.style.borderColor = "#f43f5e";
            el.style.animation = "shakeField 0.35s ease";
            setTimeout(() => { el.style.borderColor = orig; el.style.animation = ""; el.style.transition = ""; }, 600);
        }
        async function saveOrder() {
            const nom = document.getElementById("c-nom").value.trim().toUpperCase();
            const equ = document.getElementById("c-equ").value.trim();
            let hasError = false;
            if (!nom) { _shakeField("c-nom"); hasError = true; }
            if (!equ) { _shakeField("c-equ"); hasError = true; }
            if (hasError) return showAlert("Cliente y equipo son obligatorios.", "warning");
            const rawVal = document.getElementById("c-val").value;
            const valor = rawVal === "" ? 0 : Number(rawVal);
            if (isNaN(valor) || valor < 0) { document.getElementById("val-error").innerText = "⚠️ El valor no puede ser negativo"; return; }
            document.getElementById('val-error').innerText = "";
            const adelanto = Number(document.getElementById('c-adelanto').value) || 0;
            if (adelanto > valor && valor > 0) return showAlert("El adelanto no puede superar el valor total.", "warning");
            const orderNum = await getNextOrderNum();
            const garantia = parseInt(document.getElementById('c-garantia').value) || 0;
            const presupuesto = document.getElementById('c-presupuesto').value;
            const tecnico = document.getElementById('c-tecnico').value || '';
            const fechaEstimada = document.getElementById('c-fecha-estimada').value || '';
            const notas = document.getElementById('c-notas').value.trim();
            const origen = document.getElementById('c-origen').value || '';
            const order = {
                id: Date.now(), orderNum, nom, tel: document.getElementById('c-tel').value,
                equ: document.getElementById('c-equ').value.toUpperCase(),
                val: valor, adelanto, saldo: valor - adelanto,
                fotos: currentPhotos, fotosEntrega: [], sta: 'recibido',
                det: document.getElementById('c-fal').value.toUpperCase(),
                fecha: Date.now(), alertSent: false, garantia, presupuesto, tecnico,
                fechaEstimada, notas, origen
            };
            await put('orders', order);
            // Si hay adelanto, registrarlo como ingreso en caja
            if (adelanto > 0) {
                await put('sales', { id: Date.now() + 1, item: `Adelanto ${nom} - ${order.equ.substring(0,20)}`, val: adelanto, qty: 1, stockId: null, fecha: Date.now(), tipo: 'adelanto', ordenId: order.id });
            }
            currentPhotos = []; document.getElementById('previews').innerHTML = '';
            ['c-nom','c-equ','c-tel','c-val','c-fal','c-adelanto','c-notas','c-fecha-estimada'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('c-garantia').value = '30';
            document.getElementById('c-presupuesto').value = 'pendiente';
            document.getElementById('c-tecnico').value = '';
            document.getElementById('c-origen').value = '';
            document.getElementById('client-alert').innerText = '';
            const clientCard = document.getElementById('client-info-card');
            if (clientCard) clientCard.classList.add('hidden');
            document.getElementById('val-error').innerText = '';
            document.getElementById('saldo-preview').classList.add('hidden');
            playBeep(); closeCamera(); await updateTotal(); await updateSuggestions(); tab('ordenes');
            showToast(adelanto > 0 ? `✅ Orden registrada · Adelanto ${getCurrency()}${adelanto.toLocaleString()} guardado` : '✅ Orden registrada', 'success');
        }

        // Duplicar orden: pre-llena el formulario de Taller con los datos del cliente
        // para cuando el mismo cliente vuelve con otro equipo o el mismo equipo por otra falla
        async function duplicateOrder(id) {
            try {
                const orders = await getAll('orders');
                const src = orders.find(x => x.id === id);
                if (!src) return showAlert('Orden no encontrada', 'error');

                showConfirm(
                    `¿Crear una nueva orden para ${src.nom}?\n\nSe pre-llenará con sus datos de contacto. Puedes editar el equipo, falla y valor antes de registrar.`,
                    () => {
                        // Ir a la vista Taller
                        tab('taller');
                        // Pequeña pausa para que la vista se pinte
                        setTimeout(() => {
                            // Pre-llenar datos del cliente (no del equipo/falla)
                            const elNom = document.getElementById('c-nom');
                            const elTel = document.getElementById('c-tel');
                            const elEqu = document.getElementById('c-equ');
                            const elFal = document.getElementById('c-fal');
                            const elVal = document.getElementById('c-val');
                            const elAde = document.getElementById('c-adelanto');
                            const elOrigen = document.getElementById('c-origen');

                            if (elNom) elNom.value = src.nom || '';
                            if (elTel) elTel.value = src.tel || '';
                            // Origen: si era nuevo antes, ahora es "cliente_frecuente"
                            if (elOrigen) elOrigen.value = 'cliente_frecuente';
                            // Vaciar campos específicos del equipo (el cliente usualmente trae otro)
                            if (elEqu) elEqu.value = '';
                            if (elFal) elFal.value = '';
                            if (elVal) elVal.value = '';
                            if (elAde) elAde.value = '';

                            // Disparar el check del cliente para mostrar la tarjeta de info
                            if (typeof checkClient === 'function') checkClient();

                            // Foco en el campo de equipo (el siguiente que toca llenar)
                            if (elEqu) {
                                elEqu.focus();
                                elEqu.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }

                            showToast(`📋 Datos de ${src.nom.split(' ')[0]} precargados · Ingresa el nuevo equipo`, 'success');
                        }, 350);
                    },
                    'info'
                );
            } catch (e) {
                console.warn('[duplicateOrder]', e);
                showAlert('Error al duplicar la orden', 'error');
            }
        }

        async function editOrder(id) {
            const orders = await getAll('orders');
            const order = orders.find(x => x.id === id);
            if (!order) return;
            currentEditOrderId = id;
            document.getElementById('edit-nom').value = order.nom;
            document.getElementById('edit-tel').value = order.tel || '';
            document.getElementById('edit-equ').value = order.equ;
            document.getElementById('edit-val').value = order.val;
            document.getElementById('edit-adelanto').value = order.adelanto || 0;
            document.getElementById('edit-det').value = order.det || '';
            document.getElementById('edit-notas').value = order.notas || '';
            document.getElementById('edit-fecha-estimada').value = order.fechaEstimada || '';
            // Cargar garantía y presupuesto (campos editables nuevos)
            document.getElementById('edit-garantia').value = order.garantia !== undefined ? order.garantia : 30;
            document.getElementById('edit-presupuesto').value = order.presupuesto || 'pendiente';
            // Cargar técnicos en el select
            const tecnicos = getTecnicos();
            const sel = document.getElementById('edit-tecnico');
            sel.innerHTML = '<option value="">Sin asignar</option>' + tecnicos.map(t => `<option value="${escapeHtml(t)}" ${order.tecnico===t?'selected':''}>${escapeHtml(t)}</option>`).join('');
            // Mostrar saldo
            const saldo = (order.val||0) - (order.adelanto||0);
            const saldoBox = document.getElementById('edit-saldo-info');
            if (saldo > 0) { saldoBox.classList.remove('hidden'); document.getElementById('edit-saldo-val').innerText = '$' + saldo.toLocaleString(); }
            else saldoBox.classList.add('hidden');
            document.getElementById('modal-edit-order').classList.remove('hidden');
        }
        async function saveEditOrder() {
            const orders = await getAll('orders');
            const order = orders.find(x => x.id === currentEditOrderId);
            if (!order) return;
            const newVal = Number(document.getElementById('edit-val').value);
            const newAdelanto = Number(document.getElementById('edit-adelanto').value) || 0;
            if (isNaN(newVal) || newVal < 0) return showAlert("Valor inválido. Debe ser un número mayor o igual a 0.", "warning");
            if (newAdelanto > newVal && newVal > 0) return showAlert("El adelanto no puede superar el valor total.", "warning");
            order.nom = document.getElementById('edit-nom').value.toUpperCase();
            order.tel = document.getElementById('edit-tel').value;
            order.equ = document.getElementById('edit-equ').value.toUpperCase();
            order.val = newVal;
            order.adelanto = newAdelanto;
            order.saldo = newVal - newAdelanto;
            order.tecnico = document.getElementById('edit-tecnico').value;
            order.det = document.getElementById('edit-det').value.toUpperCase();
            order.notas = document.getElementById('edit-notas').value.trim();
            order.fechaEstimada = document.getElementById('edit-fecha-estimada').value || '';
            // Guardar garantía y presupuesto editados
            const newGarantia = parseInt(document.getElementById('edit-garantia').value);
            order.garantia = isNaN(newGarantia) ? 0 : Math.max(0, Math.min(365, newGarantia));
            order.presupuesto = document.getElementById('edit-presupuesto').value || 'pendiente';
            await put('orders', order);
            closeEditModal();
            await renderOrders();
            await updateTotal();
            showToast('Orden actualizada', 'success');
        }
        function closeEditModal() { document.getElementById('modal-edit-order').classList.add('hidden'); currentEditOrderId = null; }

        function getBusinessDaysDiff(startDate, endDate) {
            let count = 0; const current = new Date(startDate); const end = new Date(endDate);
            while (current <= end) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                current.setDate(current.getDate() + 1);
            }
            return count;
        }

        function onSearchInput() {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            // Ocultar chips de recientes mientras el usuario escribe
            const recentBox = document.getElementById('search-recent-chips');
            if (recentBox) recentBox.style.display = 'none';
            searchDebounceTimer = setTimeout(() => {
                applyFilters();
                // Guardar búsqueda en historial después de 900ms de inactividad
                _saveRecentSearch(document.getElementById('search-orders').value);
            }, 300);
        }

        // ==================== HISTORIAL DE BÚSQUEDAS RECIENTES ====================
        const _RECENT_KEY = 'nelsonapp_recent_searches';
        const _RECENT_MAX = 5;

        function _getRecentSearches() {
            try {
                const raw = localStorage.getItem(_RECENT_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch(e) { return []; }
        }

        function _saveRecentSearch(text) {
            const trimmed = (text || '').trim();
            if (trimmed.length < 2) return; // ignorar búsquedas muy cortas
            const upper = trimmed.toUpperCase();
            let list = _getRecentSearches();
            // Quitar si ya existe (para moverlo al principio)
            list = list.filter(s => s.toUpperCase() !== upper);
            // Agregar al principio
            list.unshift(trimmed);
            // Limitar a _RECENT_MAX
            list = list.slice(0, _RECENT_MAX);
            try { localStorage.setItem(_RECENT_KEY, JSON.stringify(list)); } catch(e) {}
        }

        function _clearRecentSearches() {
            try { localStorage.removeItem(_RECENT_KEY); } catch(e) {}
            _renderRecentChips();
        }
        window._clearRecentSearches = _clearRecentSearches;

        function _renderRecentChips() {
            const box = document.getElementById('search-recent-chips');
            if (!box) return;
            const list = _getRecentSearches();
            if (!list.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
            box.innerHTML = `
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">Recientes:</span>
                ${list.map(text => `
                    <button onclick="_useRecentSearch('${escapeHtml(text).replace(/'/g, "\\'")}')"
                            class="bg-slate-700/50 border border-slate-600/50 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-full active:scale-95 transition hover:bg-slate-600/50">
                        🕐 ${escapeHtml(text)}
                    </button>
                `).join('')}
                <button onclick="_clearRecentSearches()"
                        class="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-black px-2 py-1 rounded-full active:scale-95 transition"
                        title="Borrar historial">✕</button>
            `;
            box.style.display = 'flex';
        }

        window._useRecentSearch = function(text) {
            const input = document.getElementById('search-orders');
            if (input) input.value = text;
            document.getElementById('search-recent-chips').style.display = 'none';
            applyFilters();
        };

        // Mostrar recientes al hacer focus si el input está vacío
        window._onSearchFocus = function() {
            const input = document.getElementById('search-orders');
            if (input && !input.value.trim()) _renderRecentChips();
        };

        // Ocultar recientes al perder el foco (con delay para permitir click en chip)
        window._onSearchBlur = function() {
            setTimeout(() => {
                const box = document.getElementById('search-recent-chips');
                if (box) box.style.display = 'none';
            }, 200);
        };

        // Helper global: normaliza texto para búsqueda (quita acentos, espacios extras, mayúsculas)
        function _normalizeSearch(s) {
            return String(s || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
                .toUpperCase()
                .replace(/\s+/g, ' ') // colapsar espacios múltiples
                .trim();
        }
        window._normalizeSearch = _normalizeSearch;

        // Muestra sugerencias de clientes coincidentes al buscar (tocables, abren ficha)
        async function _renderClientHits(query) {
            const hits = document.getElementById('search-client-hits');
            if (!hits) return;
            const q = _normalizeSearch(query);
            if (!q || q.length < 2) { hits.style.display = 'none'; hits.innerHTML = ''; return; }

            const [orders, clientes] = await Promise.all([ getAll('orders'), getAll('clientes') ]);
            const cur = getCurrency();

            // Recolectar nombres únicos de clientes desde clientes y orders
            const nombres = new Set();
            clientes.forEach(c => { if (c.nombre && _normalizeSearch(c.nombre).includes(q)) nombres.add(c.nombre); });
            orders.forEach(o => { if (o.nom && _normalizeSearch(o.nom).includes(q)) nombres.add(o.nom); });

            const lista = [...nombres].slice(0, 5).map(nombre => {
                const clienteData = clientes.find(c => c.nombre === nombre);
                const deuda = clienteData?.deuda || 0;
                const ordenesCliente = orders.filter(o => o.nom === nombre);
                const totalOrdenes = ordenesCliente.length;
                const ordenesActivas = ordenesCliente.filter(o => o.sta !== 'entregado').length;
                const tel = clienteData?.telefono || ordenesCliente[0]?.tel || '';
                const deudaBadge = deuda > 0
                    ? `<span class="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-1 rounded-lg">💰 ${cur}${deuda.toLocaleString()}</span>`
                    : '';
                const activasBadge = ordenesActivas > 0
                    ? `<span class="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-1 rounded-lg">🔧 ${ordenesActivas} activas</span>`
                    : '';
                return `
                <button onclick="_selectClientFromSearch('${escapeHtml(nombre).replace(/'/g, "\\'")}')"
                        class="w-full text-left bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/30 p-3 rounded-2xl active:scale-95 transition flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">👤</span>
                            <span class="font-black text-sm text-white truncate">${escapeHtml(nombre)}</span>
                        </div>
                        <div class="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-2 items-center">
                            <span>📋 ${totalOrdenes} órden${totalOrdenes===1?'':'es'}</span>
                            ${tel ? `<span>📞 ${escapeHtml(tel)}</span>` : ''}
                        </div>
                        <div class="flex gap-1 mt-1 flex-wrap">${deudaBadge}${activasBadge}</div>
                    </div>
                    <span class="text-violet-400 text-lg flex-shrink-0">›</span>
                </button>`;
            }).join('');

            if (!lista) { hits.style.display = 'none'; hits.innerHTML = ''; return; }
            hits.innerHTML = `
                <div class="text-[10px] font-black uppercase tracking-wider text-violet-400 px-2 pt-1">👥 Clientes encontrados</div>
                ${lista}
            `;
            hits.style.display = 'block';
        }

        // Al tocar una tarjeta de cliente: filtra estrictamente por su nombre Y abre su ficha
        window._selectClientFromSearch = function(nombre) {
            const input = document.getElementById('search-orders');
            if (input) input.value = nombre;
            // Filtro ESTRICTO por cliente exacto (no texto libre que puede dar falsos positivos)
            filters.exactClient = nombre;
            filters.exactOrderId = null;
            filters.text = ''; // desactivamos búsqueda de texto libre
            renderOrders();
            // Ocultar tarjetas violetas y naranjas de arriba (ya escogimos)
            const ch = document.getElementById('search-client-hits');
            const oh = document.getElementById('search-order-hits');
            if (ch) { ch.style.display = 'none'; ch.innerHTML = ''; }
            if (oh) { oh.style.display = 'none'; oh.innerHTML = ''; }
            // Abrir la ficha del cliente
            showClientHistory(nombre);
        };

        // Tarjetas de órdenes encontradas por número (color naranja)
        async function _renderOrderHits(query) {
            const box = document.getElementById('search-order-hits');
            if (!box) return;
            const q = _normalizeSearch(query);
            // Solo buscar si hay texto con al menos 1 dígito
            if (!q || !/\d/.test(q)) { box.style.display = 'none'; box.innerHTML = ''; return; }

            const orders = await getAll('orders');
            const qDigits = q.replace(/[^0-9]/g, '');
            const cur = getCurrency();

            // Coincidencias por número de orden (exacto o parcial)
            const hits = orders.filter(o => {
                if (!o.orderNum) return false;
                const numStr = String(o.orderNum);
                const formatted = formatOrderNum(o.orderNum).replace(/[^0-9]/g, '');
                return numStr.includes(qDigits) || formatted.includes(qDigits);
            }).slice(0, 3);

            if (!hits.length) { box.style.display = 'none'; box.innerHTML = ''; return; }

            const staColor = {
                recibido:'#94a3b8', 'revisión':'#fbbf24', reparado:'#34d399',
                entregado:'#60a5fa', 'no-reparable':'#f87171'
            };

            box.innerHTML = `
                <div class="text-[10px] font-black uppercase tracking-wider text-orange-400 px-2 pt-1">📋 Órdenes por número</div>
                ${hits.map(o => {
                    const color = staColor[o.sta] || '#94a3b8';
                    return `
                    <button onclick="_openOrderFromSearch(${o.id}, '${escapeHtml(o.nom).replace(/'/g, "\\'")}')"
                            class="w-full text-left bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 p-3 rounded-2xl active:scale-95 transition flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-black text-orange-400 text-sm">${formatOrderNum(o.orderNum)}</span>
                                <span class="font-bold text-white text-sm truncate">${escapeHtml(o.nom)}</span>
                            </div>
                            <div class="text-[10px] text-slate-400 mt-1 truncate">🔧 ${escapeHtml(o.equ || '')}</div>
                            <div class="flex gap-2 mt-1 items-center">
                                <span class="text-[10px] font-black px-2 py-0.5 rounded-lg" style="background:${color}22;color:${color};">${o.sta || 'recibido'}</span>
                                <span class="text-[10px] text-emerald-400 font-black">${cur}${(o.val||0).toLocaleString()}</span>
                            </div>
                        </div>
                        <span class="text-orange-400 text-lg flex-shrink-0">›</span>
                    </button>`;
                }).join('')}
            `;
            box.style.display = 'block';
        }

        // Al tocar una tarjeta de orden por número: filtra solo esa orden Y abre el modal de edición
        window._openOrderFromSearch = function(orderId, nombreCliente) {
            const input = document.getElementById('search-orders');
            if (input) input.value = '#' + (orderId ? String(orderId) : nombreCliente);
            // Filtro ESTRICTO por ID de orden exacta
            filters.exactOrderId = orderId;
            filters.exactClient = null;
            filters.text = '';
            renderOrders();
            // Ocultar tarjetas de arriba
            const ch = document.getElementById('search-client-hits');
            const oh = document.getElementById('search-order-hits');
            if (ch) { ch.style.display = 'none'; ch.innerHTML = ''; }
            if (oh) { oh.style.display = 'none'; oh.innerHTML = ''; }
            // Abrir modal de edición
            if (typeof editOrder === 'function') editOrder(orderId);
        };

