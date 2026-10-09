/* Nelson App Pro · js/modules/14-garantias-estadisticas-filtros.js
   Garantias, estadisticas y filtros
   (extraido sin cambios de index.html; el orden de carga importa) */
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
                const fileName = `nelson_backup_${new Date().toISOString().slice(0,10)}.json`;
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

