/* Nelson App Pro · js/modules/17-taller-entrega-presupuesto-listos.js
   Vista previa taller, fotos de entrega, presupuesto y listos
   (extraido sin cambios de index.html; el orden de carga importa) */
        // --- Atajos de teclado ---
        function isTypingInInput(e) {
            const t = e.target;
            if (!t) return false;
            const tag = (t.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if (t.isContentEditable) return true;
            return false;
        }

        document.addEventListener('keydown', (e) => {
            // Solo atajos en desktop/tablet
            if (!isDesktopView()) return;

            // Esc siempre funciona (cerrar modales, limpiar búsqueda)
            if (e.key === 'Escape') {
                const overlay = document.getElementById('shortcuts-overlay');
                if (overlay && overlay.classList.contains('show')) { hideShortcutsHelp(); return; }
                // Limpiar búsqueda si está enfocada
                const search = document.getElementById('search-orders');
                if (search && document.activeElement === search && search.value) {
                    search.value = '';
                    if (typeof onSearchInput === 'function') onSearchInput();
                    return;
                }
                // Cerrar cualquier modal-custom visible
                const openModal = document.querySelector('.modal-custom:not(.hidden)');
                if (openModal) {
                    // Intentar click en botón cerrar
                    const closeBtn = openModal.querySelector('[onclick*="close"], [onclick*="hidden"]');
                    if (closeBtn) closeBtn.click();
                    else openModal.classList.add('hidden');
                }
                return;
            }

            // El resto solo fuera de inputs
            if (isTypingInInput(e)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            switch (e.key) {
                case '/':
                    e.preventDefault();
                    tab('ordenes');
                    setTimeout(() => document.getElementById('search-orders')?.focus(), 100);
                    break;
                case 'n': case 'N':
                    e.preventDefault();
                    topbarPrimaryAction();
                    break;
                case '?':
                    e.preventDefault();
                    showShortcutsHelp();
                    break;
                case '1': tab('taller'); break;
                case '2': tab('ordenes'); break;
                case '3': tab('ventas'); break;
                case '4': tab('admin'); break;
            }
        });

        // --- Preview en vivo del formulario de recepción ---
        function updateTallerPreview() {
            if (!isDesktopView()) return;
            const panel = document.getElementById('preview-card-live');
            if (!panel) return;
            const nom = (document.getElementById('c-nom')?.value || '').trim();
            const tel = (document.getElementById('c-tel')?.value || '').trim();
            const equ = (document.getElementById('c-equ')?.value || '').trim();
            const fal = (document.getElementById('c-fal')?.value || '').trim();
            const val = Number(document.getElementById('c-val')?.value || 0);
            const adel = Number(document.getElementById('c-adelanto')?.value || 0);
            const garantia = document.getElementById('c-garantia')?.value || '';
            const tecnico = document.getElementById('c-tecnico')?.value || '';
            const fechaEst = document.getElementById('c-fecha-estimada')?.value || '';
            const presupuesto = document.getElementById('c-presupuesto')?.value || 'pendiente';
            const saldo = Math.max(0, val - adel);

            // Si no hay nada, placeholder
            if (!nom && !equ && !fal && !val) {
                panel.innerHTML = `<div style="text-align:center;color:#64748b;font-size:11px;padding:40px 0;">
                    ✏️ Completa el formulario para ver la vista previa
                </div>`;
                return;
            }

            const cur = (typeof getCurrency === 'function') ? getCurrency() : '$';
            const presLabels = { pendiente:'⏳ Presup. pendiente', enviado:'📤 Enviado', aprobado:'✅ Aprobado', rechazado:'❌ Rechazado' };

            // Escape helper defensivo
            const esc = (typeof escapeHtml === 'function') ? escapeHtml : (s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));

            let html = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:16px;font-weight:900;color:#f1f5f9;line-height:1.2;">${esc(nom) || '<span style="color:#64748b;">Cliente...</span>'}</div>
                    ${tel ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">📱 ${esc(tel)}</div>` : ''}
                </div>
                <span style="font-size:9px;padding:3px 8px;border-radius:99px;background:rgba(148,163,184,0.15);color:#94a3b8;font-weight:900;letter-spacing:1px;">RECIBIDO</span>
            </div>`;

            if (equ) html += `<div style="font-size:13px;font-weight:800;color:var(--accent);margin-bottom:6px;text-transform:uppercase;">🔧 ${esc(equ)}</div>`;
            if (fal) html += `<div style="font-size:11px;color:#cbd5e1;line-height:1.4;padding:8px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:8px;">${esc(fal)}</div>`;

            const badges = [];
            if (tecnico) badges.push(`<span style="font-size:9px;background:rgba(255,255,255,0.06);color:#cbd5e1;padding:3px 7px;border-radius:99px;font-weight:700;">👷 ${esc(tecnico)}</span>`);
            if (fechaEst) {
                const fmt = new Date(fechaEst + 'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
                badges.push(`<span style="font-size:9px;background:rgba(59,130,246,0.15);color:#60a5fa;padding:3px 7px;border-radius:99px;font-weight:700;">📅 ${fmt}</span>`);
            }
            if (garantia && Number(garantia) > 0) badges.push(`<span style="font-size:9px;background:rgba(249,115,22,0.15);color:#fb923c;padding:3px 7px;border-radius:99px;font-weight:700;">🛡️ ${garantia}d</span>`);
            badges.push(`<span style="font-size:9px;padding:3px 7px;border-radius:99px;font-weight:700;${presupuesto==='aprobado'?'background:rgba(16,185,129,0.15);color:#34d399;':presupuesto==='rechazado'?'background:rgba(244,63,94,0.15);color:#fb7185;':presupuesto==='enviado'?'background:rgba(59,130,246,0.15);color:#60a5fa;':'background:rgba(148,163,184,0.12);color:#94a3b8;'}">${presLabels[presupuesto]}</span>`);
            if (badges.length) html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">${badges.join('')}</div>`;

            if (val > 0) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);">
                    <div>
                        <div style="font-size:9px;color:#64748b;font-weight:700;letter-spacing:1px;">VALOR</div>
                        <div style="font-size:15px;font-weight:900;color:#34d399;">${cur}${val.toLocaleString()}</div>
                    </div>
                    ${adel > 0 ? `<div style="text-align:right;">
                        <div style="font-size:9px;color:#64748b;font-weight:700;letter-spacing:1px;">${saldo > 0 ? 'SALDO' : 'PAGADO'}</div>
                        <div style="font-size:15px;font-weight:900;color:${saldo > 0 ? '#fb7185' : '#34d399'};">${cur}${saldo.toLocaleString()}</div>
                    </div>` : ''}
                </div>`;
            }

            panel.innerHTML = html;
        }

        // Enganchar listeners de preview a los campos del formulario de taller
        function wireTallerPreview() {
            const ids = ['c-nom','c-tel','c-equ','c-fal','c-val','c-adelanto','c-garantia','c-tecnico','c-fecha-estimada','c-presupuesto'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.dataset.previewWired) {
                    el.addEventListener('input', updateTallerPreview);
                    el.addEventListener('change', updateTallerPreview);
                    el.dataset.previewWired = '1';
                }
            });
        }

        // Mostrar/ocultar panel preview en taller según viewport
        function toggleTallerPreviewPanel() {
            const panel = document.getElementById('taller-preview-panel');
            if (!panel) return;
            if (isDesktopView()) {
                panel.classList.remove('hidden');
                panel.style.display = 'block';
                wireTallerPreview();
                updateTallerPreview();
            } else {
                panel.classList.add('hidden');
                panel.style.display = 'none';
            }
        }

        // Envolver tab() para disparar updates desktop
        const _origTab = window.tab || tab;
        window.tab = async function(t) {
            const r = await _origTab.apply(this, arguments);
            updateDesktopStats();
            updateTopbarPrimaryLabel();
            toggleTallerPreviewPanel();
            return r;
        };

        // Primer disparo al cargar + listeners globales
        window.addEventListener('resize', () => {
            toggleTallerPreviewPanel();
            updateDesktopStats();
        });

        // Inicializar tras un delay para que DB esté lista
        setTimeout(() => {
            updateDesktopStats();
            updateTopbarPrimaryLabel();
            toggleTallerPreviewPanel();
        }, 1500);

        // (Se eliminó un setInterval duplicado que llamaba updateDesktopStats cada 15s —
        // ya existe uno cada 60s más arriba, suficiente para mantener los KPIs al día)

        // ==================== FIN DESKTOP/TABLET UX ====================

        window.onload = async () => {
            await initPinSystem(); // cargar/migrar hash del PIN antes de mostrar el modal
            showPinModal();
        };

        // ==================== FOTOS DE ENTREGA ====================
        async function openDeliveryPhotosModal(orderId) {
            currentDeliveryOrderId = orderId;
            currentDeliveryPhotos = [];
            document.getElementById('delivery-photos-preview').innerHTML = '';
            document.getElementById('btn-ver-entrega').classList.add('hidden');
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === orderId);
            if (o && o.fotosEntrega && o.fotosEntrega.length > 0) {
                for (let blob of o.fotosEntrega) {
                    currentDeliveryPhotos.push(blob);
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(blob);
                    img.className = 'w-14 h-14 object-cover rounded-xl border-2 border-emerald-500 shadow-md';
                    document.getElementById('delivery-photos-preview').appendChild(img);
                }
                document.getElementById('btn-ver-entrega').classList.remove('hidden');
            }
            document.getElementById('modal-delivery-photos').classList.remove('hidden');
        }

        function verFotosEntregaDesdeModal() {
            document.getElementById('modal-delivery-photos').classList.add('hidden');
            openPhotoModal(currentDeliveryOrderId, 'entrega');
        }
        function closeDeliveryPhotosModal() {
            document.getElementById('modal-delivery-photos').classList.add('hidden');
            currentDeliveryOrderId = null;
            currentDeliveryPhotos = [];
            document.getElementById('delivery-photos-preview').innerHTML = '';
        }
        async function saveDeliveryPhotos() {
            if (!currentDeliveryOrderId) return;
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === currentDeliveryOrderId);
            if (o) { o.fotosEntrega = currentDeliveryPhotos; await put('orders', o); }
            closeDeliveryPhotosModal();
            showAlert(`${currentDeliveryPhotos.length} foto(s) de entrega guardadas.`, "success");
            await renderOrders();
        }

        // ==================== PRESUPUESTO ====================
        async function openPresupuestoModal(orderId) {
            currentPresupuestoOrderId = orderId;
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === orderId);
            if (!o) return;
            document.getElementById('presupuesto-order-info').innerText = `${escapeHtml(o.nom)} — ${escapeHtml(o.equ)}`;
            document.getElementById('presupuesto-status').value = o.presupuesto || 'pendiente';
            document.getElementById('presupuesto-valor').value = o.val || '';
            document.getElementById('modal-presupuesto').classList.remove('hidden');
        }
        function closePresupuestoModal() { document.getElementById('modal-presupuesto').classList.add('hidden'); currentPresupuestoOrderId = null; }
        async function savePresupuesto() {
            if (!currentPresupuestoOrderId) return;
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === currentPresupuestoOrderId);
            if (!o) return;
            o.presupuesto = document.getElementById('presupuesto-status').value;
            const newVal = parseFloat(document.getElementById('presupuesto-valor').value);
            if (!isNaN(newVal) && newVal >= 0) o.val = newVal;
            await put('orders', o);
            closePresupuestoModal();
            await renderOrders();
            await updateTotal();
            if (o.presupuesto === 'enviado' && o.tel) {
                showConfirm(`¿Enviar presupuesto por WhatsApp a ${o.nom}?`, () => {
                    const msg = `*TODO REPUESTOS NELSON*\nHola ${o.nom}, te enviamos el presupuesto para tu ${o.equ}.\n💰 Valor: $${o.val.toLocaleString()}\n✅ Por favor confírmanos si apruebas la reparación.`;
                    sessionStorage.setItem('_waJump','1'); window.open(`https://wa.me/57${o.tel}?text=${encodeURIComponent(msg)}`, '_blank');
                }, "info");
            }
        }

        // ==================== AVISAR LISTOS v4 (rediseño con KPIs, filtros y tracking) ====================
        let _readyCache = [];      // cache de las órdenes reparadas
        let _readyFilter = 'all';  // filtro activo

        async function notifyAllReady() {
            const orders = await getAll('orders');
            const ready = orders.filter(o => o.sta === 'reparado' && o.tel);
            if (!ready.length) return showAlert("No hay equipos en estado 'reparado' con teléfono registrado.", "info");

            // Ordenar: no avisados primero, luego por días reparado descendente
            ready.sort((a, b) => {
                const aNotified = a.lastNotified || 0;
                const bNotified = b.lastNotified || 0;
                if (!aNotified && bNotified) return -1;
                if (aNotified && !bNotified) return 1;
                // Ambos iguales en "avisado" → por fecha de reparado desc (más antiguo arriba)
                const aTime = a.fechaReparado || a.fechaEstado || a.fecha || 0;
                const bTime = b.fechaReparado || b.fechaEstado || b.fecha || 0;
                return aTime - bTime;
            });

            _readyCache = ready;
            _readyFilter = 'all';
            document.getElementById('ready-count-text').textContent = `${ready.length} equipo${ready.length !== 1 ? 's' : ''} reparado${ready.length !== 1 ? 's' : ''} esperando al cliente`;
            _renderReadyStats();
            _renderReadyChipCounts();
            _renderReadyTodayPill();
            _renderReadyBulkButton();
            _renderReadyFilter('all');
            document.getElementById('modal-ready-list').classList.remove('hidden');
        }

        // "Avisados hoy: X de Y"
        function _renderReadyTodayPill() {
            const pill = document.getElementById('ready-today-text');
            if (!pill) return;
            const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
            const todayStart = startOfDay.getTime();
            const avisadosHoy = _readyCache.filter(o => (o.lastNotified || 0) >= todayStart).length;
            if (_readyCache.length === 0) { pill.style.display = 'none'; return; }
            pill.style.display = 'inline-flex';
            pill.textContent = `📊 ${avisadosHoy} de ${_readyCache.length} avisado${avisadosHoy !== 1 ? 's' : ''} hoy`;
        }

        // Muestra/oculta el botón masivo según haya pendientes en el filtro
        function _renderReadyBulkButton() {
            const btn = document.getElementById('ready-bulk-btn');
            const count = document.getElementById('ready-bulk-count');
            if (!btn || !count) return;

            // Solo los que no han sido avisados (en el filtro actual)
            let list = _readyCache.slice();
            if (_readyFilter === 'saldo') {
                list = list.filter(o => (Number(o.val) || 0) - (Number(o.adelanto) || 0) > 0);
            } else if (_readyFilter === 'never') {
                list = list.filter(o => !o.lastNotified);
            }
            const pendientes = list.filter(o => !o.lastNotified);
            if (pendientes.length === 0) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'flex';
                count.textContent = pendientes.length;
            }
        }

        // KPIs superiores
        function _renderReadyStats() {
            const cur = getCurrency();
            const total = _readyCache.length;
            const saldoTotal = _readyCache.reduce((sum, o) => {
                const val = Number(o.val) || 0;
                const ade = Number(o.adelanto) || 0;
                return sum + Math.max(0, val - ade);
            }, 0);
            const now = Date.now();
            const diasProm = total > 0
                ? Math.round(_readyCache.reduce((sum, o) => {
                    const ref = o.fechaReparado || o.fechaEstado || o.fecha || now;
                    return sum + Math.max(0, Math.floor((now - ref) / 86400000));
                  }, 0) / total)
                : 0;
            const statsEl = document.getElementById('ready-stats');
            if (!statsEl) return;
            statsEl.innerHTML = `
                <div class="ready-stat-card">
                    <div class="ready-stat-val" style="color:#34d399;">${total}</div>
                    <div class="ready-stat-label">Listos</div>
                </div>
                <div class="ready-stat-card">
                    <div class="ready-stat-val" style="color:#fb923c;font-size:${saldoTotal >= 1000000 ? '13px' : '15px'};">${cur}${saldoTotal.toLocaleString()}</div>
                    <div class="ready-stat-label">Por cobrar</div>
                </div>
                <div class="ready-stat-card">
                    <div class="ready-stat-val" style="color:#60a5fa;">${diasProm}<span style="font-size:11px;opacity:0.7;">d</span></div>
                    <div class="ready-stat-label">Promedio</div>
                </div>
            `;
        }

        // Contadores de los chips
        function _renderReadyChipCounts() {
            const all = _readyCache.length;
            const saldo = _readyCache.filter(o => (Number(o.val) || 0) - (Number(o.adelanto) || 0) > 0).length;
            const never = _readyCache.filter(o => !o.lastNotified).length;
            const el = (id) => document.getElementById(id);
            if (el('chip-count-all'))   el('chip-count-all').textContent   = all;
            if (el('chip-count-saldo')) el('chip-count-saldo').textContent = saldo;
            if (el('chip-count-never')) el('chip-count-never').textContent = never;
        }

        // Cambia filtro activo
        function filterReadyList(filter) {
            _readyFilter = filter;
            document.querySelectorAll('#ready-filters .ready-chip').forEach(btn => {
                btn.classList.toggle('ready-chip-active', btn.dataset.filter === filter);
            });
            _renderReadyFilter(filter);
            _renderReadyBulkButton();
        }

        // Renderiza la lista filtrada
        function _renderReadyFilter(filter) {
            const cur = getCurrency();
            const container = document.getElementById('ready-list-container');
            if (!container) return;
            const now = Date.now();

            let list = _readyCache.slice();
            if (filter === 'saldo') {
                list = list.filter(o => (Number(o.val) || 0) - (Number(o.adelanto) || 0) > 0);
            } else if (filter === 'never') {
                list = list.filter(o => !o.lastNotified);
            }

            if (!list.length) {
                container.innerHTML = `
                    <div class="ready-empty">
                        <div class="ready-empty-icon">✨</div>
                        <div class="ready-empty-text">${filter === 'all' ? 'No hay equipos listos' : 'Nada en este filtro'}</div>
                        <div class="ready-empty-sub">${filter === 'never' ? 'Todos ya fueron avisados' : filter === 'saldo' ? 'Todos están pagos' : 'Marca una orden como "reparado"'}</div>
                    </div>`;
                return;
            }

            const avatarHues = [12, 35, 145, 200, 260, 320];
            container.innerHTML = list.map(o => {
                // Avatar e iniciales
                const nombre = o.nom || 'Cliente';
                const initials = nombre.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'C';
                let hashVal = 0;
                for (let i = 0; i < nombre.length; i++) hashVal = (hashVal + nombre.charCodeAt(i)) % avatarHues.length;
                const hue = avatarHues[hashVal];

                // Dinero
                const total = Number(o.val) || 0;
                const adelanto = Number(o.adelanto) || 0;
                const saldo = Math.max(0, total - adelanto);
                const pctPago = total > 0 ? Math.round((adelanto / total) * 100) : 0;

                // Días reparado
                const refDate = o.fechaReparado || o.fechaEstado || o.fecha || now;
                const diasReparado = Math.max(0, Math.floor((now - refDate) / 86400000));

                // Estado de aviso
                const lastNot = o.lastNotified || 0;
                let notifiedBadge = '';
                if (!lastNot) {
                    notifiedBadge = `<span class="ready-card-notified ready-notified-never">🔔 Nunca avisado</span>`;
                } else {
                    const diasDesde = Math.max(0, Math.floor((now - lastNot) / 86400000));
                    const texto = diasDesde === 0 ? 'hoy' : `hace ${diasDesde}d`;
                    notifiedBadge = `<span class="ready-card-notified ready-notified-done">✓ Avisado ${texto}</span>`;
                }

                // Urgencia (borde de la tarjeta)
                let urgentClass = '';
                if (!lastNot && diasReparado >= 5) urgentClass = ' ready-card-urgent';
                else if (!lastNot && diasReparado >= 2) urgentClass = ' ready-card-warm';

                // Badge de días
                let diasBadge = '';
                if (diasReparado >= 7) diasBadge = `<span class="ready-meta-days" style="color:#fb7185;">🔥 ${diasReparado}d reparado</span>`;
                else if (diasReparado >= 3) diasBadge = `<span class="ready-meta-days" style="color:#fb923c;">⏰ ${diasReparado}d reparado</span>`;
                else diasBadge = `<span class="ready-meta-days">⏰ ${diasReparado}d reparado</span>`;

                // Saldo pill
                let saldoPill;
                if (total <= 0) {
                    saldoPill = `<span class="ready-saldo-pill ready-saldo-uncosted">📝 Sin cotizar</span>`;
                } else if (saldo > 0) {
                    saldoPill = `<span class="ready-saldo-pill ready-saldo-pending">💰 Debe ${cur}${saldo.toLocaleString()}</span>`;
                } else {
                    saldoPill = `<span class="ready-saldo-pill ready-saldo-paid">✓ Pagado</span>`;
                }

                // Formato de orden
                const numLabel = o.orderNum ? `#${String(o.orderNum).padStart(4,'0')}` : `#${o.id}`;

                // Teléfono formateado (visual)
                const telDigits = (o.tel || '').replace(/\D/g, '');
                const telDisplay = telDigits.length === 10
                    ? `${telDigits.slice(0,3)} ${telDigits.slice(3,6)} ${telDigits.slice(6)}`
                    : o.tel;

                return `<div class="ready-card${urgentClass}">
                    <div class="ready-card-head">
                        <div class="ready-card-avatar" style="background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${hue},70%,40%));">${initials}</div>
                        <div class="ready-card-info">
                            <div class="ready-card-name">
                                ${escapeHtml(nombre)}
                                <span class="ready-card-ordernum">${numLabel}</span>
                            </div>
                            <div class="ready-card-equipo">🔧 ${escapeHtml(o.equ || '')}</div>
                            ${notifiedBadge}
                        </div>
                    </div>

                    <div class="ready-money-row">
                        <div>
                            <div class="ready-money-total-label">Total</div>
                            <div class="ready-money-total">${cur}${total.toLocaleString()}</div>
                        </div>
                        ${saldoPill}
                    </div>
                    ${adelanto > 0 && saldo > 0 ? `
                    <div style="margin-top:-4px;">
                        <div style="height:4px;background:rgba(15,23,42,0.7);border-radius:99px;overflow:hidden;">
                            <div style="width:${pctPago}%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:99px;"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:9.5px;font-weight:700;margin-top:3px;">
                            <span style="color:#60a5fa;">Adelanto: ${cur}${adelanto.toLocaleString()}</span>
                            <span style="color:#94a3b8;">${pctPago}% pagado</span>
                        </div>
                    </div>` : ''}

                    <div class="ready-meta">
                        <span class="ready-meta-phone">📞 ${telDisplay}</span>
                        ${diasBadge}
                    </div>

                    <div class="ready-card-actions">
                        <button onclick="callFromReady('${telDigits}')" class="ready-act-btn ready-act-call" title="Llamar">📞</button>
                        <button onclick="sendReadyWA(${o.id})" class="ready-act-btn ready-act-wa">💬 WhatsApp</button>
                        <button onclick="markReadyAsNotified(${o.id})" class="ready-act-btn ready-act-done" title="Marcar como avisado manualmente">✓</button>
                    </div>
                </div>`;
            }).join('');
        }

        // Llamar al cliente (abre el dialer del teléfono)
        function callFromReady(phone) {
            if (!phone) return showAlert('Número no disponible', 'warning');
            const prefix = phone.length === 10 ? '+57' : '+';
            window.location.href = `tel:${prefix}${phone}`;
        }

