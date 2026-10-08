/* NelsonApp — 30-workshop-ux.js
 * Taller, interfaz y entregas
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== PANEL DE HOY (Taller) ====================
        async function _refreshDailyPanel() {
            const panel = document.getElementById('daily-panel');
            const items = document.getElementById('daily-panel-items');
            const dateEl = document.getElementById('daily-panel-date');
            if (!panel || !items) return;
            try {
                const now = new Date();
                const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
                const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
                if (dateEl) dateEl.textContent = `${dayNames[now.getDay()]}, ${now.getDate()} de ${monthNames[now.getMonth()]}`;

                const orders = await getAll('orders');
                const stock  = await getAll('stock');

                // 1) Listos para avisar (reparados)
                const listos = orders.filter(o => o.sta === 'reparado' && o.tel).length;

                // 2) Vencidos: órdenes no entregadas con fechaEstimada pasada
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const vencidos = orders.filter(o => {
                    if (o.sta === 'entregado' || o.sta === 'cancelado') return false;
                    if (!o.fechaEstimada) return false;
                    const fe = new Date(o.fechaEstimada).getTime();
                    return fe < todayStart;
                }).length;

                // 3) Repuestos bajo mínimo (con existencia > 0 todavía, los que están en cero no aplican tanto)
                const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
                const bajoMinimo = stock.filter(s => (s.q || 0) <= (s.minStock || threshold) && (s.q || 0) > 0).length;

                const cards = [
                    { emoji:'📢', label:'Listos', count:listos, color:'#34d399', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.25)', action:'notifyAllReady()' },
                    { emoji:'⏰', label:'Vencidos', count:vencidos, color:'#f87171', bg:'rgba(244,63,94,0.08)', border:'rgba(244,63,94,0.25)', action:"tab('ordenes')" },
                    { emoji:'📦', label:'Bajo mín.', count:bajoMinimo, color:'#fbbf24', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.25)', action:'openOrdenesCompra()' }
                ];

                items.innerHTML = cards.map(c => `
                    <div onclick="${c.action}" style="background:${c.bg};padding:10px 6px;cursor:pointer;text-align:center;border-bottom:3px solid ${c.count > 0 ? c.border : 'transparent'};transition:transform 0.15s;" ontouchstart="this.style.transform='scale(0.96)'" ontouchend="this.style.transform='scale(1)'">
                        <div style="font-size:18px;line-height:1;margin-bottom:3px;">${c.emoji}</div>
                        <div style="font-size:20px;font-weight:900;color:${c.count > 0 ? c.color : '#475569'};font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-0.5px;">${c.count}</div>
                        <div style="font-size:8.5px;font-weight:800;color:#64748b;letter-spacing:0.6px;text-transform:uppercase;margin-top:3px;">${c.label}</div>
                    </div>
                `).join('');

                // Si TODO está en 0, mostrar mensaje limpio
                const total = listos + vencidos + bajoMinimo;
                if (total === 0) {
                    items.innerHTML = `<div style="grid-column:1 / -1;background:rgba(16,185,129,0.06);padding:14px 10px;text-align:center;">
                        <div style="font-size:18px;margin-bottom:3px;">✨</div>
                        <div style="font-size:11.5px;font-weight:800;color:#34d399;letter-spacing:0.3px;">Todo al día</div>
                        <div style="font-size:9.5px;font-weight:600;color:#64748b;margin-top:2px;">Sin pendientes urgentes</div>
                    </div>`;
                }

                panel.classList.remove('hidden');
            } catch (e) {
                console.warn('[_refreshDailyPanel]', e);
                panel.classList.add('hidden');
            }
        }

        function syncSidebarCash() {
            // OPTIMIZACIÓN: salir temprano si no hay sidebar visible (móvil)
            const sideVal = document.getElementById('sidebar-cash-value');
            if (!sideVal || sideVal.offsetParent === null) return;

            // Sync caja
            const mainVal = document.getElementById('total-cash');
            if (mainVal && sideVal.innerText !== mainVal.innerText) sideVal.innerText = mainVal.innerText;
            // Sync biz names
            const bizShort = document.getElementById('business-short-name');
            const bizFull  = document.getElementById('business-name-display');
            const sideShort   = document.getElementById('sidebar-biz-short');
            const sideFull    = document.getElementById('sidebar-biz-name');
            const dtSubtitle  = document.getElementById('desktop-topbar-subtitle');
            if (bizShort && sideShort && sideShort.innerText !== bizShort.innerText) sideShort.innerText = bizShort.innerText;
            if (bizFull  && sideFull  && sideFull.innerText  !== bizFull.innerText)  sideFull.innerText  = bizFull.innerText;
            if (bizShort && dtSubtitle && dtSubtitle.innerText !== bizShort.innerText) dtSubtitle.innerText = bizShort.innerText;
            // Sync meta bar
            const metaFill = document.getElementById('meta-bar-fill');
            const metaPct  = document.getElementById('meta-bar-pct');
            const metaWrap = document.getElementById('meta-bar-wrap');
            const sideFill = document.getElementById('sidebar-meta-fill');
            const sidePct  = document.getElementById('sidebar-meta-pct');
            const sideMetaWrap = document.getElementById('sidebar-meta-wrap-desktop');
            if (metaFill && sideFill) {
                if (sideFill.style.width !== metaFill.style.width) sideFill.style.width = metaFill.style.width;
                if (sideFill.style.background !== metaFill.style.background) sideFill.style.background = metaFill.style.background;
            }
            if (metaPct  && sidePct && sidePct.innerText !== metaPct.innerText) sidePct.innerText = metaPct.innerText;
            if (sideMetaWrap && metaWrap) {
                const shouldShow = !metaWrap.classList.contains('hidden');
                const isShowing  = sideMetaWrap.style.display !== 'none';
                if (shouldShow !== isShowing) sideMetaWrap.style.display = shouldShow ? 'block' : 'none';
            }
        }
        // OPTIMIZACIÓN: cada 5s en vez de 2s, y solo cuando la pestaña está visible
        let _sidebarSyncInterval = null;
        function startSidebarSync() {
            if (_sidebarSyncInterval) return;
            _sidebarSyncInterval = setInterval(() => {
                if (document.hidden) return; // no sincronizar si la pestaña está en background
                syncSidebarCash();
            }, 5000);
        }
        startSidebarSync();

        // ==================== DESKTOP/TABLET UX ENHANCEMENTS ====================

        // Detectar si estamos en vista desktop/tablet (>= 768px)
        function isDesktopView() { return window.matchMedia('(min-width: 768px)').matches; }

        // --- KPIs del topbar + contadores del sidebar + badges nav mobile ---
        async function updateDesktopStats() {
            try {
                const orders = await getAll('orders');
                const today = new Date();
                const todayYMD = _ymdLocal(today);

                let todayCount = 0;
                let pendingCount = 0;  // recibido + revisión (no entregadas)
                let readyCount = 0;    // reparado (listas para entregar)
                let overdueCount = 0;  // vencidas
                const byStatus = { 'recibido':0, 'revisión':0, 'reparado':0, 'no-reparable':0 };

                for (const o of orders) {
                    const oDate = new Date(o.fecha);
                    const oYMD = _ymdLocal(oDate);
                    if (oYMD === todayYMD) todayCount++;

                    if (o.sta && o.sta !== 'entregado') {
                        if (byStatus[o.sta] !== undefined) byStatus[o.sta]++;

                        if (o.sta === 'recibido' || o.sta === 'revisión') pendingCount++;
                        if (o.sta === 'reparado') readyCount++;

                        // Vencidas: fecha estimada pasada
                        if (o.fechaEstimada) {
                            const deadline = new Date(o.fechaEstimada + 'T23:59:59').getTime();
                            if (deadline < Date.now()) overdueCount++;
                        }
                    }
                }

                // Total órdenes activas (no entregadas)
                const activeTotal = orders.filter(o => o.sta !== 'entregado').length;

                // Stock bajo
                const stock = await getAll('stock');
                const lowStock = stock.filter(s => (Number(s.cant) || 0) <= (Number(s.minStock) || 3)).length;

                // ========== BADGES NAV MOBILE (siempre) ==========
                const badgeOrd = document.getElementById('nav-badge-ordenes');
                if (badgeOrd) {
                    // Mostrar total activas, pero resaltar si hay vencidas
                    if (activeTotal > 0) {
                        badgeOrd.innerText = activeTotal > 99 ? '99+' : activeTotal;
                        badgeOrd.style.display = 'flex';
                        if (overdueCount > 0) {
                            badgeOrd.classList.remove('warn');
                            badgeOrd.title = `${activeTotal} órdenes activas · ${overdueCount} vencidas`;
                        } else {
                            badgeOrd.title = `${activeTotal} órdenes activas`;
                        }
                    } else {
                        badgeOrd.style.display = 'none';
                    }
                }
                const badgeStock = document.getElementById('nav-badge-stock');
                if (badgeStock) {
                    if (lowStock > 0) {
                        badgeStock.innerText = lowStock > 99 ? '99+' : lowStock;
                        badgeStock.style.display = 'flex';
                        badgeStock.title = `${lowStock} productos con stock bajo`;
                    } else {
                        badgeStock.style.display = 'none';
                    }
                }
                // Dot en "Datos" si hay backup pendiente (ejemplo simple: si hay muchas órdenes nuevas desde el último backup)
                // Por ahora lo dejamos oculto — se puede activar con lógica específica después

                // ========== KPIs + sidebar (solo si es desktop) ==========
                if (!isDesktopView()) return;

                // Top KPIs
                const elToday   = document.getElementById('topbar-kpi-today');
                const elPending = document.getElementById('topbar-kpi-pending');
                const elReady   = document.getElementById('topbar-kpi-ready');
                const elOverdue = document.getElementById('topbar-kpi-overdue');
                if (elToday)   elToday.innerText   = todayCount;
                if (elPending) elPending.innerText = pendingCount;
                if (elReady)   elReady.innerText   = readyCount;
                if (elOverdue) elOverdue.innerText = overdueCount;

                // Contador en nav "Órdenes" (sidebar)
                const navCount = document.getElementById('sidebar-count-ordenes');
                if (navCount) {
                    navCount.innerText = activeTotal;
                    navCount.style.display = activeTotal > 0 ? 'inline-flex' : 'none';
                }

                // Breakdown por estado
                const setCount = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
                setCount('sb-count-recibido', byStatus['recibido']);
                setCount('sb-count-revision', byStatus['revisión']);
                setCount('sb-count-reparado', byStatus['reparado']);
                setCount('sb-count-noreparable', byStatus['no-reparable']);

                // Stock badge en sidebar
                const stockBadge = document.getElementById('sidebar-count-stock');
                if (stockBadge) {
                    if (lowStock > 0) {
                        stockBadge.innerText = lowStock;
                        stockBadge.style.display = 'inline-flex';
                        stockBadge.style.background = 'rgba(244,63,94,0.2)';
                        stockBadge.style.color = '#f43f5e';
                        stockBadge.title = `${lowStock} productos con stock bajo`;
                    } else {
                        stockBadge.style.display = 'none';
                    }
                }
            } catch (e) { console.warn('updateDesktopStats error:', e); }
        }

        // Llamar cuando las órdenes cambien (envolver renderOrders)
        const _origRenderOrders = window.renderOrders || renderOrders;
        window.renderOrders = async function() {
            const r = await _origRenderOrders.apply(this, arguments);
            updateDesktopStats();
            return r;
        };

        // Refrescar KPIs cada minuto (para que "vencidas" se actualice con el paso del tiempo)
        setInterval(() => { if (!document.hidden) updateDesktopStats(); }, 60000);

        // --- Filtro por estado desde sidebar ---
        function filterByStatusFromSidebar(status) {
            // Ir a órdenes
            tab('ordenes');
            // Limpiar filtros de estado y marcar solo el elegido
            document.querySelectorAll('.status-filter').forEach(cb => {
                cb.checked = (cb.value === status);
            });
            // Asegurar que el panel de filtros esté visible para que el usuario vea el cambio
            const panel = document.getElementById('filter-panel');
            const arrow = document.querySelector('#filterToggleBtn .arrow');
            if (panel && !panel.classList.contains('open')) {
                panel.classList.add('open');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }
            // Aplicar
            if (typeof applyFilters === 'function') applyFilters();
        }

        // --- Acción primaria del topbar, contextual según tab activa ---
        function topbarPrimaryAction() {
            const active = document.querySelector('.app-view:not(.hidden)');
            const activeId = active ? active.id : '';
            if (activeId === 'view-taller') {
                // Ya estoy en recepción → focus primer campo
                document.getElementById('c-nom')?.focus();
            } else if (activeId === 'view-ventas') {
                // Foco en nueva venta
                tab('ventas');
                setTimeout(() => document.getElementById('v-select')?.focus(), 150);
            } else if (activeId === 'view-ordenes') {
                // Ir a crear nueva orden
                tab('taller');
                setTimeout(() => document.getElementById('c-nom')?.focus(), 200);
            } else {
                tab('taller');
                setTimeout(() => document.getElementById('c-nom')?.focus(), 200);
            }
        }

        // Actualizar label del botón primario según tab
        function updateTopbarPrimaryLabel() {
            const label = document.getElementById('topbar-primary-label');
            if (!label) return;
            const active = document.querySelector('.app-view:not(.hidden)');
            const activeId = active ? active.id : '';
            if (activeId === 'view-ventas')      label.innerText = 'NUEVA VENTA';
            else if (activeId === 'view-taller') label.innerText = 'GUARDAR ORDEN';
            else                                  label.innerText = 'NUEVA ORDEN';
        }

        // --- Overlay de atajos ---
        function showShortcutsHelp() {
            document.getElementById('shortcuts-overlay')?.classList.add('show');
        }
        function hideShortcutsHelp() {
            document.getElementById('shortcuts-overlay')?.classList.remove('show');
        }

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
        let _resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(() => {
                toggleTallerPreviewPanel();
                updateDesktopStats();
            }, 200);
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
            _copyText(phones.join(', ')).then(() => showToast(`${phones.length} número${phones.length !== 1 ? 's' : ''} copiado${phones.length !== 1 ? 's' : ''}`, 'success')).catch(() => showAlert('No se pudo copiar los números', 'warning'));
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

        function closeMonthlyReportModal() { document.getElementById('modal-monthly-report').classList.add('hidden'); }
        async function saveMonthlyReportAsImage() {
            const el = document.getElementById('monthly-report-printable');
            if (!el) return;
            try {
                const canvas = await html2canvas(el, { backgroundColor: '#0a0e1a', scale: 2, useCORS: true });
                await downloadImageCompat(canvas, `reporte_mensual_${_ymdLocal(new Date())}.png`);
            } catch(e) { showAlert('Error al generar imagen', 'error'); }
        }

        // ==================== SUGERENCIA DE DIAGNÓSTICO ====================
        async function suggestDiagnosis() {
            const falla = document.getElementById('c-fal').value.trim().toUpperCase();
            const equ = document.getElementById('c-equ').value.trim().toUpperCase();
            const box = document.getElementById('diagnosis-suggestions');
            if (falla.length < 4 && equ.length < 3) { box.style.display = 'none'; return; }
            const orders = await getAll('orders');
            const keyword = falla.length >= 4 ? falla : equ;
            const matches = orders.filter(o =>
                (o.det && o.det.includes(keyword)) || (o.equ && o.equ.includes(equ))
            ).slice(-10);
            if (!matches.length) { box.style.display = 'none'; return; }
            const freq = {};
            matches.forEach(o => { if (o.det) freq[o.det] = (freq[o.det] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,3);
            box.innerHTML = '<p class="text-[9px] text-slate-500 font-bold px-2 mb-1">💡 DIAGNÓSTICOS FRECUENTES:</p>' +
                sorted.map(([det, cnt]) => `<div class="suggestion-item" onclick="applyDiagnosis('${det.replace(/'/g,"\\'")}')">🔧 ${escapeHtml(det)} <span class="text-slate-500">(${cnt}x)</span></div>`).join('');
            box.style.display = 'block';
        }
        function applyDiagnosis(det) {
            document.getElementById('c-fal').value = det;
            document.getElementById('diagnosis-suggestions').style.display = 'none';
        }

        // ==================== MODAL COMPARACIÓN ANTES / DESPUÉS ====================
        async function openCompareModal(id) {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            if (!o) return;

            const fotosRecep   = o.fotos        || [];
            const fotosEntrega = o.fotosEntrega  || [];

            if (!fotosRecep.length && !fotosEntrega.length) {
                return showAlert('Esta orden no tiene fotos registradas.', 'info');
            }

            document.getElementById('modal-compare-title').innerText =
                `🔀 ${escapeHtml(o.equ)} — ANTES / DESPUÉS`;

            const container = document.getElementById('modal-compare-container');
            container.innerHTML = '';

            // Emparejar fotos: mostramos pares lado a lado
            const maxPairs = Math.max(fotosRecep.length, fotosEntrega.length);

            for (let i = 0; i < maxPairs; i++) {
                const row = document.createElement('div');
                row.className = 'photo-compare-grid';

                // Columna ANTES
                const colA = document.createElement('div');
                colA.className = 'compare-entrada';
                colA.innerHTML = `<div class="photo-compare-label">📸 ANTES</div>`;
                if (fotosRecep[i]) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(fotosRecep[i]);
                    img.style.cssText = 'width:100%;border-radius:12px;border:1px solid rgba(249,115,22,0.3);';
                    colA.appendChild(img);
                } else {
                    colA.innerHTML += `<div style="height:100px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px dashed rgba(255,255,255,0.1);color:#475569;font-size:11px;">Sin foto</div>`;
                }

                // Columna DESPUÉS
                const colB = document.createElement('div');
                colB.className = 'compare-salida';
                colB.innerHTML = `<div class="photo-compare-label">📷 DESPUÉS</div>`;
                if (fotosEntrega[i]) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(fotosEntrega[i]);
                    img.style.cssText = 'width:100%;border-radius:12px;border:1px solid rgba(52,211,153,0.3);';
                    colB.appendChild(img);
                } else {
                    colB.innerHTML += `<div style="height:100px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px dashed rgba(255,255,255,0.1);color:#475569;font-size:11px;">Sin foto</div>`;
                }

                row.appendChild(colA);
                row.appendChild(colB);
                container.appendChild(row);
            }

            document.getElementById('modal-compare').classList.remove('hidden');
        }

        function closeCompareModal() {
            document.getElementById('modal-compare').classList.add('hidden');
            document.getElementById('modal-compare-container').innerHTML = '';
        }

