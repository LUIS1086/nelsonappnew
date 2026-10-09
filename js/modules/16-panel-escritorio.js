/* Nelson App Pro · js/modules/16-panel-escritorio.js
   Panel diario, sidebar, KPIs y atajos de escritorio
   (extraido sin cambios de index.html; el orden de carga importa) */
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
                const todayYMD = today.toISOString().slice(0,10);

                let todayCount = 0;
                let pendingCount = 0;  // recibido + revisión (no entregadas)
                let readyCount = 0;    // reparado (listas para entregar)
                let overdueCount = 0;  // vencidas
                const byStatus = { 'recibido':0, 'revisión':0, 'reparado':0, 'no-reparable':0 };

                for (const o of orders) {
                    const oDate = new Date(o.fecha);
                    const oYMD = oDate.toISOString().slice(0,10);
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

