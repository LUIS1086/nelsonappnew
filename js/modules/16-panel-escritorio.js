/* Nelson App Pro · js/modules/16-panel-escritorio.js
   Panel diario, sidebar, KPIs y atajos de escritorio
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== PANEL DE HOY (Taller) ====================
        function toggleDailyPanel() {
            const panel = document.getElementById('daily-panel'); if (!panel) return;
            const open = !panel.classList.contains('sp-open');
            panel.classList.toggle('sp-open', open);
            const h = panel.querySelector('.sp-head'); if (h) h.setAttribute('aria-expanded', open ? 'true' : 'false');
            try { localStorage.setItem('nn_resumen_abierto', open ? '1' : '0'); } catch (e) {}
        }

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

                const nrPend = orders.filter(o => o.sta === 'no-reparable' && o.destinoNR && !(o.destinoNR === 'devolver' ? o.devueltoNR : o.desechadoNR));
                const cur = (typeof getCurrency === 'function') ? getCurrency() : '$';
                const fmt = n => cur + Math.round(n).toLocaleString();
                const activas = orders.filter(o => !['entregado','cancelado','no-reparable'].includes(o.sta));
                const reparadas = orders.filter(o => o.sta === 'reparado');
                const porCobrar = orders.filter(o => o.sta !== 'cancelado' && (Number(o.saldo != null ? o.saldo : o.val) || 0) > 0);
                const montoCobrar = porCobrar.reduce((a, o) => a + (Number(o.saldo != null ? o.saldo : o.val) || 0), 0);
                const ico = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
                const chev = ico('<polyline points="9 18 15 12 9 6"/>');
                const kpi = (label, value, sub, action, tone) => `
                    <button type="button" class="sp-kpi${tone ? ' sp-' + tone : ''}" onclick="${action}">
                        <span class="sp-kpi-label">${label}</span>
                        <span class="sp-kpi-value">${value}</span>
                        <span class="sp-kpi-sub">${sub}</span>
                    </button>`;
                const row = (iconPath, text, count, action, tone) => `
                    <button type="button" class="sp-row sp-${tone}" onclick="${action}">
                        <span class="sp-row-ico">${ico(iconPath)}</span>
                        <span class="sp-row-txt">${text}</span>
                        <span class="sp-row-count">${count}</span>
                        <span class="sp-row-chev">${chev}</span>
                    </button>`;
                const attention = [];
                if (listos > 0) attention.push(row('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>', 'Equipos listos por avisar', listos, 'notifyAllReady()', 'ok'));
                if (vencidos > 0) attention.push(row('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', 'Órdenes con entrega vencida', vencidos, "tab('ordenes')", 'bad'));
                if (bajoMinimo > 0) attention.push(row('<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/>', 'Repuestos bajo el mínimo', bajoMinimo, 'openOrdenesCompra()', 'warn'));

                if (nrPend.length > 0) attention.push(row('<circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/>', 'No reparables por resolver', nrPend.length, "tab('ordenes')", 'warn'));
                const pendientes = listos + vencidos + bajoMinimo + nrPend.length;
                const sumEl = document.getElementById('daily-panel-sum');
                if (sumEl) sumEl.innerHTML = `<span>${activas.length} en taller</span><span class="sp-dotsep"></span>` + (pendientes > 0 ? `<span class="sp-pill">${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}</span>` : `<span class="sp-pill sp-pill-ok">Al día</span>`);
                const abierto = localStorage.getItem('nn_resumen_abierto') === '1';
                panel.classList.toggle('sp-open', abierto);
                const hd = panel.querySelector('.sp-head'); if (hd) hd.setAttribute('aria-expanded', abierto ? 'true' : 'false');

                items.innerHTML = `
                    <div class="sp-kpis">
                        ${kpi('En taller', activas.length, activas.length === 1 ? 'equipo en proceso' : 'equipos en proceso', "tab('ordenes')")}
                        ${kpi('Listos', reparadas.length, 'para entregar', "tab('ordenes')", reparadas.length ? 'ok' : '')}
                        ${kpi('Por cobrar', fmt(montoCobrar), porCobrar.length + (porCobrar.length === 1 ? ' orden con saldo' : ' órdenes con saldo'), "tab('ventas')", montoCobrar ? 'money' : '')}
                        ${kpi('Vencidos', vencidos, 'pasaron su fecha', "tab('ordenes')", vencidos ? 'bad' : '')}
                    </div>
                    <div class="sp-attn">${attention.length ? attention.join('') : `<div class="sp-clear">${ico('<polyline points="20 6 9 17 4 12"/>')}<span>Sin pendientes urgentes</span></div>`}</div>`;

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

        // Detectar si estamos en vista de escritorio (>= 1024px; por debajo se usa el layout móvil)
        function isDesktopView() { return window.matchMedia('(min-width: 1024px)').matches; }

        // --- KPIs del topbar + contadores del sidebar + badges nav mobile ---
        async function updateDesktopStats() {
            try {
                const orders = await getOrdersLite();
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
                // Abrir la venta unificada
                tab('ventas');
                if (typeof openInvoiceSaleModal === 'function') openInvoiceSaleModal();
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
            if (activeId === 'view-ventas')      label.innerText = 'Nueva venta';
            else if (activeId === 'view-taller') label.innerText = 'Guardar orden';
            else                                  label.innerText = 'Nueva orden';
        }

        // --- Overlay de atajos ---
        function showShortcutsHelp() {
            document.getElementById('shortcuts-overlay')?.classList.add('show');
        }
        function hideShortcutsHelp() {
            document.getElementById('shortcuts-overlay')?.classList.remove('show');
        }

