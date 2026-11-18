/* Nelson App Pro · js/modules/10-ordenes-lista-estados-whatsapp.js
   Lista de ordenes, factura, estados y WhatsApp
   (extraido sin cambios de index.html; el orden de carga importa) */
        async function renderOrders() {
            // Identificador de renderizado: evita que una búsqueda/pestaña anterior
            // siga agregando tarjetas mientras ya se está mostrando otra vista.
            const renderId = (window.__nelsonOrdersRenderId || 0) + 1;
            window.__nelsonOrdersRenderId = renderId;
            // Retirar el paginador anterior incluso si la nueva búsqueda queda vacía.
            const previousMoreButton = document.getElementById('nelson-orders-load-more');
            if (previousMoreButton) previousMoreButton.remove();
            // Diagnóstico opt-in: abrir la URL con ?perf=1. Solo registra tiempos y
            // cantidades; nunca nombres, teléfonos, órdenes ni fotografías.
            const perfEnabled = new URLSearchParams(window.location.search).has('perf');
            const perfStart = performance.now();
            // Si no hay búsqueda activa (ni texto, ni cliente exacto, ni orden exacta), limpiar hits de arriba
            if (!filters.text && !filters.exactClient && !filters.exactOrderId) {
                const hits = document.getElementById('search-client-hits');
                const box = document.getElementById('search-order-hits');
                if (hits) { hits.style.display = 'none'; hits.innerHTML = ''; }
                if (box)  { box.style.display  = 'none'; box.innerHTML  = ''; }
            } else if (filters.text && !filters.exactClient && !filters.exactOrderId) {
                // Solo mostrar hits cuando hay texto libre (no cuando ya elegimos uno exacto)
                _renderClientHits(filters.text);
                _renderOrderHits(filters.text);
            }

            const cur = getCurrency();
            let orders = typeof getOrderListSummaries === 'function' ? await getOrderListSummaries() : await getAll('orders');
            if (perfEnabled) console.info('[NelsonApp perf] lectura órdenes', { ms: Math.round(performance.now() - perfStart), count: orders.length });
            if (renderId !== window.__nelsonOrdersRenderId) return;

            // FILTROS ESTRICTOS (tienen prioridad sobre texto libre)
            if (filters.exactOrderId) {
                orders = orders.filter(o => o.id === filters.exactOrderId);
            } else if (filters.exactClient) {
                const target = _normalizeSearch(filters.exactClient);
                orders = orders.filter(o => _normalizeSearch(o.nom) === target);
            } else if (filters.text) {
                const q = _normalizeSearch(filters.text);
                orders = orders.filter(o =>
                    _normalizeSearch(o.nom).includes(q) ||
                    _normalizeSearch(o.equ).includes(q) ||
                    _normalizeSearch(o.det).includes(q) ||
                    _normalizeSearch(o.tel).includes(q) ||
                    _normalizeSearch(o.tecnico).includes(q) ||
                    formatOrderNum(o.orderNum || 0).includes(q) ||
                    String(o.orderNum || '').includes(q) ||
                    (o.orderNum && formatOrderNum(o.orderNum).replace(/[^0-9]/g,'').includes(q.replace(/[^0-9]/g,'')))
                );
            }
            if (filters.dateFrom) orders = orders.filter(o => o.fecha >= filters.dateFrom);
            if (filters.dateTo) orders = orders.filter(o => o.fecha <= filters.dateTo);
            if (filters.statuses.length) orders = orders.filter(o => filters.statuses.includes(o.sta));
            if (filters.tecnico) orders = orders.filter(o => (o.tecnico||'') === filters.tecnico);
            orders.sort((a,b) => b.fecha - a.fecha);
            const today = new Date();
            const container = document.getElementById('orders-list');
            if (!orders.length) {
                container.innerHTML = `<div class="nn-empty">
                    <div class="nn-empty-icon">🧰</div>
                    <div class="nn-empty-title">Aún no hay órdenes</div>
                    <div class="nn-empty-text">Registra la primera recepción y aparecerá aquí con su estado y saldo.</div>
                    <button type="button" class="nn-empty-btn" onclick="tab('taller')">Nueva recepción</button>
                </div>`;
                return;
            }
            // Renderizado por lotes pequeños. Con respaldos grandes, construir cientos
            // de tarjetas en una sola tarea bloqueaba el hilo principal del navegador.
            const ORDERS_INITIAL = 12;
            const ORDERS_BATCH = 4;
            const firstOrdersBatch = orders.slice(0, ORDERS_INITIAL);
            let nextOrderIndex = firstOrdersBatch.length;

            const renderOrderCard = (o) => {
                const canEditValue = (o.sta === 'reparado' || o.sta === 'entregado');
                const daysInShop = getBusinessDaysDiff(new Date(o.fecha), today);
                const isOverdue = daysInShop >= 60 && o.sta !== 'entregado';
                const numLabel = o.orderNum ? formatOrderNum(o.orderNum) : '#????';

                let garantiaBadge = '';
                if (o.sta === 'entregado' && o.garantia > 0 && o.fechaEntrega) {
                    const expDate = new Date(o.fechaEntrega + o.garantia * 86400000);
                    const isVencida = new Date() > expDate;
                    garantiaBadge = `<span class="garantia-badge ${isVencida ? 'garantia-vencida' : ''}">🛡️ GAR. ${isVencida ? 'VENCIDA' : o.garantia+'d'}</span>`;
                } else if (o.garantia > 0 && o.sta !== 'entregado') {
                    garantiaBadge = `<span class="garantia-badge" style="background:rgba(249,115,22,0.2);color:#f97316;">🛡️ ${o.garantia}d al entregar</span>`;
                }

                const presColors = { pendiente: 'text-slate-400 bg-slate-700/40', enviado: 'text-blue-400 bg-blue-500/20', aprobado: 'text-emerald-400 bg-emerald-500/20', rechazado: 'text-rose-400 bg-rose-500/20' };
                const presLabels = { pendiente: 'Presup. pendiente', enviado: 'Presup. enviado', aprobado: 'Presup. aprobado', rechazado: 'Presup. rechazado' };
                const presBadge = `<button onclick="openPresupuestoModal(${o.id})" class="presupuesto-badge ${presColors[o.presupuesto||'pendiente']} px-2 py-1">${presLabels[o.presupuesto||'pendiente']}</button>`;

                const deliveryPhotoCount = o.fotosEntrega ? o.fotosEntrega.length : 0;

                const tecnicoBadge = o.tecnico ? `<span class="text-[9px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full font-bold">👷 ${escapeHtml(o.tecnico)}</span>` : '';
                const adelanto = Number(o.adelanto) || 0;
                const saldo = Number(o.saldo != null ? o.saldo : o.val) || 0;

                // Días en estado actual
                const fechaEstado = o.fechaEstado || o.fecha;
                const daysInStatus = getBusinessDaysDiff(new Date(fechaEstado), today);
                const staColors = { recibido:'text-slate-400', 'revisión':'text-yellow-400', reparado:'text-emerald-400', entregado:'text-blue-400', 'no-reparable':'text-red-400' };
                const fechaEstBadge = (() => {
                    if (!o.fechaEstimada || o.sta === 'entregado') return '';
                    const deadlineTs = new Date(o.fechaEstimada + 'T23:59:59').getTime();
                    const diffDays   = Math.ceil((deadlineTs - Date.now()) / 86400000);
                    const fmtDate    = new Date(o.fechaEstimada + 'T00:00:00').toLocaleDateString('es-ES', {day:'2-digit', month:'short'});
                    if (diffDays < 0)   return `<span class="deadline-badge deadline-late">⚠️ VENCIDA hace ${Math.abs(diffDays)}d · ${fmtDate}</span>`;
                    if (diffDays === 0) return `<span class="deadline-badge deadline-today">🔴 ¡ENTREGA HOY! · ${fmtDate}</span>`;
                    if (diffDays <= 2)  return `<span class="deadline-badge deadline-warn">🟡 ${diffDays}d para entrega · ${fmtDate}</span>`;
                    return                      `<span class="deadline-badge deadline-ok">🟢 ${diffDays}d para entrega · ${fmtDate}</span>`;
                })();
                const notasBadge = o.notas
                    ? `<div class="text-[10px] bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1 mt-1 text-yellow-300 font-bold">🔒 ${escapeHtml(o.notas)}</div>` : '';
                const origenLabels = {recomendacion:'🗣️ Recomendación',redes:'📱 Redes',cliente_frecuente:'⭐ Frecuente',google:'🔍 Google',local:'🏠 Local',whatsapp:'💬 WhatsApp',otro:'📌 Otro'};
                const origenBadge = o.origen && origenLabels[o.origen]
                    ? `<span class="text-[9px] bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full font-bold">${origenLabels[o.origen]}</span>` : '';
                // Badge de repuestos usados (integración stock ↔ órdenes)
                const partsUsedBadge = (Array.isArray(o.partsUsed) && o.partsUsed.length > 0)
                    ? `<span onclick="event.stopPropagation();openPartsModal(${o.id})" title="Ver/editar repuestos usados" style="cursor:pointer;display:inline-flex;align-items:center;gap:3px;font-size:9px;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3);color:#67e8f9;padding:2px 7px;border-radius:99px;font-weight:800;">🔧 ${o.partsUsed.reduce((a,b) => a + (b.qty||0), 0)} rep.</span>`
                    : '';

                // Avatar con iniciales
                const nameInitials = (o.nom || 'C').split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'C';
                const avatarHues = [12, 35, 145, 200, 260, 320];
                let hashVal = 0;
                for (let i = 0; i < (o.nom || '').length; i++) hashVal = (hashVal + (o.nom || '').charCodeAt(i)) % avatarHues.length;
                const avatarHue = avatarHues[hashVal];

                // Status meta
                const statusMeta = {
                    recibido:       { accent:'#94a3b8', glow:'rgba(148,163,184,0.15)', icon:'📥' },
                    'revisión':     { accent:'#fbbf24', glow:'rgba(251,191,36,0.18)',  icon:'🔍' },
                    reparado:       { accent:'#34d399', glow:'rgba(52,211,153,0.18)',  icon:'✅' },
                    entregado:      { accent:'#60a5fa', glow:'rgba(96,165,250,0.18)',  icon:'📦' },
                    'no-reparable': { accent:'#f87171', glow:'rgba(248,113,113,0.18)', icon:'🚫' },
                };
                const sm = statusMeta[o.sta] || statusMeta.recibido;
                const cardAccent = isOverdue ? '#ef4444' : sm.accent;
                const cardGlow = isOverdue ? 'rgba(239,68,68,0.2)' : sm.glow;

                // Progreso de pago
                const totalVal = Number(o.val) || 0;
                const pagadoVal = Math.max(0, totalVal - saldo);
                const pctPagado = totalVal > 0 ? Math.min(100, Math.round((pagadoVal / totalVal) * 100)) : 0;
                const saldoStatus = saldo <= 0 && totalVal > 0
                    ? { label: 'Pagado', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' }
                    : adelanto > 0
                        ? { label: `Parcial ${pctPagado}%`, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' }
                        : { label: 'Pendiente', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)' };

                const nrBadge = (o.sta === 'no-reparable' && o.destinoNR) ? (() => {
                    const dev = o.destinoNR === 'devolver';
                    const hecho = dev ? o.devueltoNR : o.desechadoNR;
                    const f = d => new Date(d).toLocaleDateString('es-ES', {day:'2-digit', month:'short'});
                    return `<div class="nr-box${hecho ? ' nr-done' : ''}"><span class="nr-dot"></span><span class="nr-txt">${hecho ? (dev ? 'Devuelto al cliente' : 'Desechado') + ' · ' + f(hecho) : (dev ? 'El cliente recoge el equipo' : 'El cliente lo deja para desechar')}</span>${hecho ? '' : `<button type="button" class="nr-act" onclick="marcarDestinoNR(${o.id})">${dev ? 'Marcar entregado' : 'Marcar desechado'}</button>`}</div>`;
                })() : '';
                const _oi = (k) => { const P = {
                    wa:'<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
                    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
                    print:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
                    link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
                    note:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>',
                    copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
                    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
                    trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
                    chev:'<polyline points="6 9 12 15 18 9"/>' };
                    return `<svg class="oc-ico" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k]}</svg>`; };
                return `<div class="card order-card-pro" style="position:relative;padding:0;overflow:hidden;content-visibility:auto;contain-intrinsic-size:auto 420px;border-left:4px solid ${cardAccent};box-shadow:0 4px 12px rgba(0,0,0,0.2),0 0 0 1px ${cardGlow};">
                    <div style="position:absolute;top:-40px;right:-40px;width:140px;height:140px;background:radial-gradient(circle,${cardGlow},transparent 70%);pointer-events:none;"></div>

                    <!-- HEADER: avatar + cliente + estado -->
                    <div style="position:relative;padding:14px 14px 10px;display:flex;align-items:flex-start;gap:12px;">
                        <div onclick="editOrder(${o.id})" style="flex-shrink:0;width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,hsl(${avatarHue},70%,55%),hsl(${avatarHue},70%,40%));display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:#fff;box-shadow:0 4px 12px hsla(${avatarHue},70%,50%,0.35);cursor:pointer;letter-spacing:-0.5px;">${nameInitials}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
                                <span class="order-num" style="font-size:10px;">${numLabel}</span>
                                ${garantiaBadge}
                            </div>
                            <h3 onclick="editOrder(${o.id})" style="font-size:17px;font-weight:900;color:#f1f5f9;cursor:pointer;line-height:1.2;margin:0;display:flex;align-items:center;gap:6px;" class="hover:text-orange-400">
                                ${escapeHtml(o.nom)} <span style="font-size:11px;opacity:0.5;">✏️</span>
                            </h3>
                            <p style="font-size:13px;color:#fb923c;font-weight:700;margin:3px 0 0;line-height:1.25;">${escapeHtml(o.equ)}</p>
                            ${(tecnicoBadge || origenBadge || partsUsedBadge) ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${tecnicoBadge}${origenBadge}${partsUsedBadge}</div>` : ''}
                        </div>
                        <div style="flex-shrink:0;" id="sta-wrap-${o.id}">
                            ${(()=>{
                                const cfg = {
                                    recibido:      {bg:'#1e293b', color:'#94a3b8', icon:'📥'},
                                    'revisión':    {bg:'#3d1f00', color:'#fbbf24', icon:'🔍'},
                                    reparado:      {bg:'#052e16', color:'#4ade80', icon:'✅'},
                                    entregado:     {bg:'#0c1a2e', color:'#60a5fa', icon:'📦'},
                                    'no-reparable':{bg:'#2a0a0a', color:'#f87171', icon:'🚫'},
                                };
                                const c = cfg[o.sta] || cfg.recibido;
                                return `<button onclick="toggleStaMenu(${o.id},event)" style="background:${c.bg};color:${c.color};border:1px solid ${c.color}44;border-radius:11px;padding:6px 10px;font-size:10px;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;min-width:98px;justify-content:space-between;text-transform:uppercase;letter-spacing:0.5px;">
                                    <span class="oc-sta">${o.sta}</span><span style="font-size:8px;opacity:0.6;">▼</span>
                                </button>
                                <div id="sta-menu-${o.id}" style="display:none;position:absolute;right:14px;top:48px;z-index:200;background:#1e293b;border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.7);min-width:140px;">
                                    ${Object.entries(cfg).map(([k,v])=>`
                                    <div onclick="closeStaMenu(${o.id});updateSta(${o.id},'${k}')"
                                        style="padding:10px 14px;font-size:11px;font-weight:800;color:${v.color};cursor:pointer;background:${o.sta===k?v.bg+'99':'transparent'};border-bottom:1px solid rgba(255,255,255,0.06);"
                                        onmouseenter="this.style.background='${v.bg}'" onmouseleave="this.style.background='${o.sta===k?v.bg+'99':'transparent'}'">
                                        ${v.icon} ${k}
                                    </div>`).join('')}
                                </div>`;
                            })()}
                        </div>
                    </div>

                    <div style="padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                        <span style="font-size:11px;color:#64748b;font-weight:700;">${new Date(o.fecha).toLocaleDateString('es-ES', {day:'2-digit',month:'short'})}</span>
                        <span style="font-size:11px;color:${isOverdue ? '#f87171':'#64748b'};font-weight:${isOverdue?'900':'700'};">· ${daysInShop}d en taller</span>
                        <span style="font-size:11px;font-weight:800;" class="${staColors[o.sta]||'text-slate-400'}">· ${daysInStatus}d en ${o.sta}</span>
                    </div>
                    ${fechaEstBadge ? `<div style="padding:0 14px 10px;">${fechaEstBadge}</div>` : ''}
                    ${nrBadge ? `<div style="padding:0 14px 10px;">${nrBadge}</div>` : ''}
                    ${notasBadge ? `<div style="padding:0 14px 10px;">${notasBadge}</div>` : ''}

                    <div style="margin:0 14px 10px;padding:11px 12px;background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.04);border-left:3px solid ${cardAccent};border-radius:10px;font-size:12.5px;color:#cbd5e1;line-height:1.4;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">${escapeHtml(o.det||'Sin detalle')}</div>

                    <!-- DINERO -->
                    <div style="margin:0 14px 12px;padding:12px;background:linear-gradient(135deg,rgba(16,185,129,0.05),rgba(15,23,42,0.5));border:1px solid rgba(16,185,129,0.12);border-radius:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;">
                            <div>
                                <div style="font-size:9px;font-weight:900;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;">Total</div>
                                ${canEditValue
                                    ? `<button onclick="editOrderValue(${o.id})" style="font-size:18px;font-weight:900;color:#34d399;background:transparent;border:none;padding:0;cursor:pointer;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${totalVal.toLocaleString()} <span style="font-size:10px;opacity:0.6;">✏️</span></button>`
                                    : `<div style="font-size:18px;font-weight:900;color:#34d399;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${totalVal.toLocaleString()}</div>`}
                            </div>
                            <div style="padding:3px 10px;border-radius:99px;background:${saldoStatus.bg};border:1px solid ${saldoStatus.border};color:${saldoStatus.color};font-size:9px;font-weight:900;letter-spacing:1px;">${saldoStatus.label}</div>
                        </div>
                        ${(adelanto > 0 || saldo > 0) && totalVal > 0 ? `
                        <div style="height:6px;background:rgba(15,23,42,0.7);border-radius:99px;overflow:hidden;margin-bottom:6px;">
                            <div style="width:${pctPagado}%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:99px;transition:width 0.3s ease;"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;">
                            <span style="color:#60a5fa;">Adelanto: ${cur}${adelanto.toLocaleString()}</span>
                            <span style="color:${saldo > 0 ? '#f87171' : '#34d399'};">Saldo: ${cur}${saldo.toLocaleString()}</span>
                        </div>` : ''}
                    </div>

                    <div style="padding:0 14px 10px;display:flex;gap:6px;flex-wrap:wrap;">
                        ${presBadge}
                        ${(o.fotos?.length || 0) > 0
                            ? `<button onclick="openPhotoModal(${o.id})" title="Ver las fotos de recepción o agregar otra" style="flex:1;min-width:110px;padding:7px 10px;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.2);border-radius:10px;font-size:10px;font-weight:800;color:#cbd5e1;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">${o.fotos.length} fotos recepción</button>`
                            : `<button onclick="openPhotoModal(${o.id})" title="Esta orden no tiene fotos de recepción: toca para tomarlas ahora" style="flex:1;min-width:110px;padding:7px 10px;background:rgba(251,146,60,0.14);border:1px solid rgba(251,146,60,0.45);border-radius:10px;font-size:10px;font-weight:900;color:#fdba74;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">Sin fotos · tomar</button>`}
                        <button onclick="${deliveryPhotoCount > 0 ? `openPhotoModal(${o.id},'entrega')` : `openDeliveryPhotosModal(${o.id})`}" style="flex:1;min-width:110px;padding:7px 10px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);border-radius:10px;font-size:10px;font-weight:800;color:#34d399;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">${deliveryPhotoCount} fotos entrega</button>
                    </div>
                    ${(o.fotos?.length > 0 && deliveryPhotoCount > 0) ? `<div style="padding:0 14px 10px;"><button onclick="openCompareModal(${o.id})" style="width:100%;padding:8px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:10px;font-size:10px;font-weight:900;color:#c4b5fd;cursor:pointer;letter-spacing:1px;text-transform:uppercase;" class="active:scale-95 transition">🔀 Comparar antes / después</button></div>` : ''}

                    <div class="oc-acts" role="group" aria-label="Acciones de la orden">
                        <button type="button" class="oc-btn" onclick="sendWA(${o.id})" title="Elige un mensaje listo (recepción, presupuesto, listo, cobro…) y lo envía por WhatsApp">${_oi('wa')}<span>WhatsApp</span></button>
                        ${o.tel ? `<a class="oc-btn" href="tel:${escapeHtml(String(o.tel).replace(/\D/g,''))}" title="Llama al cliente desde este teléfono">${_oi('phone')}<span>Llamar</span></a>` : `<button type="button" class="oc-btn oc-off" onclick="showAlert('Esta orden no tiene teléfono registrado. Edítala para agregarlo.','warning')" title="Esta orden no tiene teléfono">${_oi('phone')}<span>Llamar</span></button>`}
                        <button type="button" class="oc-btn" onclick="printInvoice(${o.id})" title="Genera el recibo/factura de esta orden para imprimir o compartir">${_oi('print')}<span>Imprimir</span></button>
                    </div>
                    <details class="oc-more">
                        <summary><span>Más acciones</span>${_oi('chev')}</summary>
                        <div class="oc-more-grid">
                            <button type="button" class="oc-btn oc-sm" onclick="openSeguimiento(${o.id})" title="Enlace y QR para que el cliente vea el estado de su equipo">${_oi('link')}<span>Seguimiento</span></button>
                            <button type="button" class="oc-btn oc-sm" onclick="openOrderChat(${o.id})" title="Notas internas del taller: el cliente no las ve">${_oi('note')}<span>Notas</span></button>
                            <button type="button" class="oc-btn oc-sm" onclick="duplicateOrder(${o.id})" title="Crea una orden nueva con los datos de este cliente">${_oi('copy')}<span>Duplicar</span></button>
                            <button type="button" class="oc-btn oc-sm" onclick="showClientHistory('${escapeHtml(o.nom || '').replace(/'/g, '&#39;')}')" title="Abre la ficha del cliente: órdenes, pagos y deuda">${_oi('user')}<span>Cliente</span></button>
                            <button type="button" class="oc-btn oc-sm oc-danger" onclick="delOrder(${o.id})" title="Elimina esta orden de forma permanente (pide confirmación)">${_oi('trash')}<span>Eliminar</span></button>
                        </div>
                    </details>
                </div>`;
            };

            // Pintar una primera página pequeña para que la navegación responda rápido.
            if (renderId !== window.__nelsonOrdersRenderId) return;
            container.innerHTML = firstOrdersBatch.map(renderOrderCard).join('');
            if (perfEnabled) console.info('[NelsonApp perf] render inicial', { ms: Math.round(performance.now() - perfStart), rendered: firstOrdersBatch.length, total: orders.length });

            // Paginación bajo demanda: no crear cientos/miles de tarjetas en el DOM
            // de una sola vez. Cada clic añade un lote pequeño y mantiene la UI receptiva.
            const appendNextOrdersBatch = () => {
                if (renderId !== window.__nelsonOrdersRenderId || !container.isConnected) return;
                const batchStartedAt = performance.now();
                const batch = orders.slice(nextOrderIndex, nextOrderIndex + ORDERS_BATCH);
                if (!batch.length) return;
                const htmlContainer = document.createElement('div');
                htmlContainer.innerHTML = batch.map(renderOrderCard).join('');
                const batchFragment = document.createDocumentFragment();
                while (htmlContainer.firstChild) batchFragment.appendChild(htmlContainer.firstChild);
                // Una sola inserción DOM por lote: reduce recalculados de estilo/layout.
                container.appendChild(batchFragment);
                nextOrderIndex += batch.length;
                if (perfEnabled) console.info('[NelsonApp perf] lote de órdenes', { ms: Math.round(performance.now() - batchStartedAt), batch: batch.length, rendered: nextOrderIndex, total: orders.length });
                if (nextOrderIndex >= orders.length) {
                    const more = document.getElementById('nelson-orders-load-more');
                    if (more) more.remove();
                }
            };
            if (nextOrderIndex < orders.length) {
                const more = document.createElement('button');
                more.id = 'nelson-orders-load-more';
                more.type = 'button';
                more.className = 'w-full my-4 px-4 py-3 rounded-xl font-bold text-sm';
                more.style.cssText = 'background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.35);color:#fb923c;';
                more.textContent = `Cargar más órdenes (${orders.length - nextOrderIndex} restantes)`;
                more.addEventListener('click', () => {
                    if (renderId !== window.__nelsonOrdersRenderId) return;
                    more.disabled = true;
                    appendNextOrdersBatch();
                    if (nextOrderIndex < orders.length) {
                        more.textContent = `Cargar más órdenes (${orders.length - nextOrderIndex} restantes)`;
                        more.disabled = false;
                    }
                });
                container.insertAdjacentElement('afterend', more);
            }
        }

        // printInvoice usando datos del negocio y config de documentos
        async function printInvoice(id) {
            const cur = getCurrency();
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            if (!o) return;
            const numLabel   = o.orderNum ? formatOrderNum(o.orderNum) : '#' + o.id;
            const business   = _safeBizConfig();
            const garantiaMsg = localStorage.getItem('garantiaMsg') || 'Garantía cubre solo la falla reparada, no daños por mal uso.';
            const garantiaTexto = (o.garantia > 0)
                ? `<p style="margin:2px 0;"><strong>GARANTÍA:</strong> ${o.garantia} días</p>`
                : '';
            const footerMsg = business.footer || '¡Gracias por su confianza!';
            const logoHtml  = localStorage.getItem('businessLogo')
                ? `<img src="${localStorage.getItem('businessLogo')}" style="width:60px;height:60px;object-fit:contain;margin:0 auto 8px;display:block;border-radius:8px;">`
                : '';
            document.getElementById('invoice-modal-content').innerHTML = `
                <div id="invoice-printable" data-order-id="${o.id}" style="font-family:monospace;max-width:340px;margin:0 auto;background:white;color:black;padding:20px;">
                    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;">
                        ${logoHtml}
                        <h2 style="margin:0;font-size:16px;">${escapeHtml(String(business.name || 'TODO REPUESTOS NELSON'))}</h2>
                        ${business.nit ? `<p style="margin:2px 0;font-size:11px;">NIT: ${business.nit}</p>` : ''}
                        ${business.address ? `<p style="margin:2px 0;font-size:11px;">${business.address}</p>` : ''}
                        ${business.phone  ? `<p style="margin:2px 0;font-size:11px;">Tel: ${escapeHtml(String(business.phone ?? ''))}</p>` : ''}
                    </div>
                    <div style="margin-bottom:15px;font-size:13px;">
                        <p style="margin:3px 0;"><strong>FACTURA No:</strong> ${numLabel}</p>
                        <p style="margin:3px 0;"><strong>FECHA:</strong> ${new Date(o.fechaEntrega || o.fecha).toLocaleString('es-ES')}</p>
                        <p style="margin:3px 0;"><strong>CLIENTE:</strong> ${escapeHtml(o.nom)}</p>
                        <p style="margin:3px 0;"><strong>EQUIPO:</strong> ${escapeHtml(o.equ)}</p>
                        <p style="margin:3px 0;"><strong>DETALLE:</strong> ${escapeHtml(o.det || 'Revisión general')}</p>
                        ${garantiaTexto}
                    </div>
                    <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:10px 0;margin:10px 0;text-align:right;">
                        <strong style="font-size:16px;">TOTAL: ${cur}${o.val.toLocaleString()}</strong>
                    </div>
                    ${o.garantia > 0 ? `<div style="font-size:9px;color:#555;margin:10px 0;padding:8px;border:1px dashed #ccc;border-radius:4px;">⚠️ ${escapeHtml(String(garantiaMsg ?? ''))}</div>` : ''}
                    <div style="text-align:center;font-size:10px;margin-top:16px;color:#666;">${escapeHtml(String(footerMsg ?? ''))}</div>
                </div>`;
            document.getElementById('modal-invoice').classList.remove('hidden');
        }

        function closeInvoiceModal() {
            document.getElementById('modal-invoice').classList.add('hidden');
        }

        // ==================== REPORTE MENSUAL MEJORADO

        function saveInvoiceAsImage() {
            const el = document.getElementById('invoice-printable');
            html2canvas(el, { scale: 2, backgroundColor: '#ffffff' }).then(async canvas => {
                await downloadImageCompat(canvas, 'factura_nelson.png');
            }).catch(() => showAlert("No se pudo guardar la imagen.", "error"));
        }

        // ── No reparable: destino del equipo ─────────────────────────────
        function _pedirDestinoNoReparable(o) {
            return new Promise(resolve => {
                const prev = document.getElementById('nr-sheet'); if (prev) prev.remove();
                const wrap = document.createElement('div');
                wrap.id = 'nr-sheet'; wrap.className = 'nr-overlay';
                wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', 'Destino del equipo no reparable');
                const ic = d => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
                wrap.innerHTML = `<div class="nr-panel">
                    <div class="nr-title">Equipo no reparable</div>
                    <div class="nr-sub">¿Qué pasará con el equipo de <strong>${escapeHtml(o.nom || 'el cliente')}</strong>?</div>
                    <button type="button" class="nr-opt" data-dest="devolver">
                        <span class="nr-opt-ico">${ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>')}</span>
                        <span class="nr-opt-txt"><span class="nr-opt-name">Se lo lleva el cliente</span><span class="nr-opt-desc">Queda pendiente de entrega al cliente</span></span>
                    </button>
                    <button type="button" class="nr-opt" data-dest="desechar">
                        <span class="nr-opt-ico">${ic('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>')}</span>
                        <span class="nr-opt-txt"><span class="nr-opt-name">Lo deja para desechar</span><span class="nr-opt-desc">El cliente autoriza que el taller lo deseche</span></span>
                    </button>
                    <button type="button" class="nr-cancel" data-cancel="1">Cancelar</button>
                </div>`;
                const done = v => { document.removeEventListener('keydown', onKey); wrap.remove(); resolve(v); };
                const onKey = e => { if (e.key === 'Escape') done(null); };
                wrap.addEventListener('click', e => {
                    if (e.target === wrap || e.target.closest('[data-cancel]')) return done(null);
                    const b = e.target.closest('[data-dest]'); if (b) done(b.dataset.dest);
                });
                document.addEventListener('keydown', onKey);
                document.body.appendChild(wrap);
            });
        }

        async function marcarDestinoNR(id) {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            if (!o || !o.destinoNR) return;
            const dev = o.destinoNR === 'devolver';
            showConfirm(dev ? '¿Confirmas que el equipo ya se le entregó al cliente?' : '¿Confirmas que el equipo ya fue desechado?', async () => {
                if (dev) o.devueltoNR = Date.now(); else o.desechadoNR = Date.now();
                await put('orders', o);
                await logChatSistema(o.id, dev ? 'Equipo no reparable entregado al cliente' : 'Equipo no reparable desechado');
                await renderOrders();
                if (typeof _refreshDailyPanel === 'function') _refreshDailyPanel();
            }, 'info');
        }

        async function updateSta(id, newSta) {
            const orders = await getAll('orders');
            const o = orders.find(x=>x.id===id);
            if(!o) return;
            const oldSta = o.sta;
            if (oldSta === newSta) return;

            // Confirmación si baja de estado (ej: entregado → recibido)
            const staOrder = ['recibido','revisión','reparado','entregado','no-reparable'];
            const isDowngrade = staOrder.indexOf(newSta) < staOrder.indexOf(oldSta);
            if (isDowngrade) {
                showConfirm(`¿Cambiar estado de "${oldSta}" a "${newSta}"? Esto puede afectar la caja.`, async () => {
                    await _doUpdateSta(o, newSta, oldSta);
                }, 'warning');
                // Restaurar el select visualmente mientras confirma
                await renderOrders();
                return;
            }
            await _doUpdateSta(o, newSta, oldSta);
        }

        async function _doUpdateSta(o, newSta, oldSta) {
            // No reparable: preguntar qué pasará con el equipo (lo recoge el cliente o lo deja para desechar)
            let _destNR = null;
            if (newSta === 'no-reparable' && oldSta !== 'no-reparable') {
                _destNR = await _pedirDestinoNoReparable(o);
                if (!_destNR) { await renderOrders(); return; }
            }
            if (oldSta === 'no-reparable' && newSta !== 'no-reparable') {
                delete o.destinoNR; delete o.fechaDestinoNR; delete o.devueltoNR; delete o.desechadoNR;
            }
            o.sta = newSta;
            o.fechaEstado = Date.now();
            // Guardar marca específica al entrar en "reparado" — se usa en el modal Avisar Listos
            if (newSta === 'reparado') o.fechaReparado = Date.now();

            if (newSta === 'entregado' && oldSta !== 'entregado') {
                // Modo entrega rápida con cobro
                await _entregaRapida(o);
                return;
            }

            // Si se marca como "no reparable": poner valor en 0 y saldo en 0 automáticamente
            if (newSta === 'no-reparable' && oldSta !== 'no-reparable') {
                o.val = 0;
                o.saldo = 0;
                o.destinoNR = _destNR; o.fechaDestinoNR = Date.now();
                delete o.devueltoNR; delete o.desechadoNR;
                // Si había adelanto registrado, avisar al usuario
                if (o.adelanto && o.adelanto > 0) {
                    showToast(`⚠️ Hay un adelanto de ${getCurrency()}${o.adelanto.toLocaleString()} que debes devolver al cliente`, 'warning');
                }
            }

            await put('orders', o);
            if (_destNR) await logChatSistema(o.id, _destNR === 'devolver' ? 'Equipo no reparable: el cliente lo recoge' : 'Equipo no reparable: el cliente lo deja para desechar');

            // Registrar cambio de estado en el chat interno
            const staEmojis = { recibido:'📥', 'revisión':'🔍', reparado:'✅', entregado:'📦', 'no-reparable':'🚫' };
            await logChatSistema(o.id, `Estado cambiado: ${staEmojis[oldSta]||'•'} ${oldSta} → ${staEmojis[newSta]||'•'} ${newSta}`);

            // ✨ INTEGRACIÓN STOCK ↔ ÓRDENES: al pasar a "reparado" (primera vez) sugerir registrar repuestos usados
            // Solo si: (a) es transición hacia reparado, (b) no tiene partsUsed todavía, (c) hay stock disponible
            if (newSta === 'reparado' && oldSta !== 'reparado' && !Array.isArray(o.partsUsed)) {
                try {
                    const stockAll = await getAll('stock');
                    if (stockAll.length > 0) {
                        // Pequeña pausa para que el renderOrders termine primero
                        setTimeout(() => {
                            showConfirm(
                                `¿Registrar los repuestos usados en esta orden?\n\nEsto descontará automáticamente del inventario y calculará la ganancia real.`,
                                () => openPartsModal(o.id),
                                'info'
                            );
                        }, 400);
                    }
                } catch (e) { console.warn('[partsUsed hint]', e); }
            }

            await updateTotal(); await renderOrders(); await renderCartera();

            // Aviso automático WA al pasar a "reparado"
            if (newSta === 'reparado' && o.tel) {
                setTimeout(() => _mostrarAvisoReparado(o), 400);
            }
        }

        function _mostrarAvisoReparado(o) {
            const msg = buildWhatsappMsg('listo', o);
            const num = o.tel.replace(/\D/g, '');
            const prefix = num.startsWith('57') ? '' : '57';
            const waLink = `https://wa.me/${prefix}${num}?text=${encodeURIComponent(msg)}`;
            const modal = document.createElement('div');
            modal.id = 'modal-aviso-reparado';
            modal.className = 'js-modal-bottom-sheet';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.85);display:flex;justify-content:center;padding:16px;';
            modal.innerHTML = `<div style="background:#111827;border:1px solid rgba(16,185,129,0.3);border-radius:24px;width:100%;max-width:400px;overflow:hidden;margin-bottom:90px;">
                <div style="background:linear-gradient(to right,#059669,#10b981);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
                    <div><p style="color:white;font-weight:900;font-size:14px;">✅ EQUIPO REPARADO</p><p style="color:rgba(255,255,255,0.8);font-size:11px;">${escapeHtml(o.nom)} · ${escapeHtml(o.equ)}</p></div>
                    <button onclick="document.getElementById('modal-aviso-reparado').remove()" style="color:white;background:rgba(0,0,0,0.3);width:28px;height:28px;border-radius:50%;font-size:14px;">✕</button>
                </div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
                    <p style="color:#94a3b8;font-size:12px;text-align:center;">¿Avisar al cliente que su equipo está listo?</p>
                    <button onclick="sessionStorage.setItem('_waJump','1');window.open('${waLink}','_blank');document.getElementById('modal-aviso-reparado').remove();" style="background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);color:#6ee7b7;padding:14px;border-radius:14px;font-weight:900;font-size:13px;">
                        💬 SÍ, AVISAR POR WHATSAPP
                    </button>
                    <button onclick="document.getElementById('modal-aviso-reparado').remove()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#64748b;padding:12px;border-radius:14px;font-weight:700;font-size:12px;">
                        Después
                    </button>
                </div>
            </div>`;
            document.body.appendChild(modal);
        }

        async function _entregaRapida(o) {
            const saldoPendiente = Number(o.saldo != null ? o.saldo : o.val) || 0;
            const cur = getCurrency();
            const modal = document.createElement('div');
            modal.id = 'modal-entrega-rapida';
            modal.className = 'js-modal-bottom-sheet';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.88);display:flex;justify-content:center;padding:16px;';
            modal.innerHTML = `<div style="background:#111827;border:1px solid rgba(59,130,246,0.3);border-radius:24px;width:100%;max-width:400px;overflow:hidden;margin-bottom:90px;">
                <div style="background:linear-gradient(to right,#2563eb,#3b82f6);padding:14px 16px;">
                    <p style="color:white;font-weight:900;font-size:15px;">🎉 ENTREGA DE EQUIPO</p>
                    <p style="color:rgba(255,255,255,0.8);font-size:11px;">${escapeHtml(o.nom)} · ${escapeHtml(o.equ)}</p>
                </div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;">
                        <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:4px;"><span>Valor total:</span><span style="color:#fff;font-weight:900;">${cur}${o.val.toLocaleString()}</span></div>
                        <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:4px;"><span>Adelanto:</span><span style="color:#60a5fa;font-weight:900;">${cur}${(Number(o.adelanto)||0).toLocaleString()}</span></div>
                        <div style="display:flex;justify-content:space-between;font-size:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;margin-top:4px;"><span style="color:#94a3b8;">Saldo a cobrar:</span><span style="color:${saldoPendiente > 0 ? '#f87171' : '#34d399'};font-weight:900;font-size:16px;">${cur}${saldoPendiente.toLocaleString()}</span></div>
                    </div>
                    ${saldoPendiente > 0 ? `
                    <div>
                        <label style="font-size:10px;color:#64748b;font-weight:700;">COBRO AL ENTREGAR</label>
                        <input type="number" id="entrega-cobro" placeholder="${cur}${saldoPendiente.toLocaleString()}" value="${saldoPendiente}" style="background:#1e2235;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;color:#fff;font-size:16px;font-weight:900;text-align:center;width:100%;margin-top:6px;">
                    </div>` : '<p style="color:#34d399;text-align:center;font-weight:900;font-size:13px;">✅ Pagado completo</p>'}
                    <button onclick="_confirmarEntrega(${o.id}, ${saldoPendiente})" style="background:linear-gradient(to right,#2563eb,#3b82f6);color:white;padding:14px;border-radius:14px;font-weight:900;font-size:13px;">
                        ✅ CONFIRMAR ENTREGA
                    </button>
                    <button onclick="document.getElementById('modal-entrega-rapida').remove()" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#64748b;padding:10px;border-radius:14px;font-size:12px;font-weight:700;">
                        Cancelar
                    </button>
                </div>
            </div>`;
            document.body.appendChild(modal);
        }

        async function _confirmarEntrega(orderId, saldoPendiente) {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === orderId);
            if (!o) return;
            const cobro = saldoPendiente > 0 ? (Number(document.getElementById('entrega-cobro')?.value) || 0) : 0;
            o.sta = 'entregado';
            o.fechaEntrega = Date.now();
            o.fechaEstado = Date.now();
            o.saldo = Math.max(0, saldoPendiente - cobro);
            // Registrar cobro en caja si cobró algo
            if (cobro > 0) {
                await put('sales', { id: Date.now() + 2, item: `Cobro entrega ${o.nom} - ${o.equ.substring(0,20)}`, val: cobro, qty: 1, stockId: null, fecha: Date.now(), tipo: 'cobro_entrega', ordenId: orderId });
            }
            // Si queda saldo, registrar deuda; si pagó todo, limpiar deuda existente
            if (o.saldo > 0) {
                await updateClientDebt(o.nom, o.saldo);
            } else {
                // Pago completo — asegurarse que no quede deuda registrada
                let client = await getOne('clientes', o.nom);
                if (client && client.deuda > 0) { client.deuda = 0; await put('clientes', client); }
            }
            await put('orders', o);
            document.getElementById('modal-entrega-rapida')?.remove();
            await updateTotal(); await renderOrders(); await renderCartera();
            showToast(cobro > 0 ? `✅ Entregado · Cobrado ${getCurrency()}${cobro.toLocaleString()}${o.saldo > 0 ? ` · Saldo ${getCurrency()}${o.saldo.toLocaleString()}` : ''}` : '✅ Equipo entregado', 'success');
            // Ofrecer WhatsApp si tiene tel
            if (o.tel) setTimeout(() => _mostrarAvisoReparado({ ...o, sta: 'entregado' }), 400);
        }
        async function editOrderValue(id) {
            editOrder(id);
        }
        async function delOrder(id) { showConfirm("¿Eliminar esta orden permanentemente?", async () => { await del('orders', id); await updateTotal(); await renderOrders(); }); }
        function sendWA(id) {
            getAll('orders').then(orders => {
                const o = orders.find(x => x.id === id);
                if (!o) return;
                if (!o.tel) return showAlert('Esta orden no tiene WhatsApp registrado.', 'warning');
                // Mostrar selector de tipo de mensaje
                const modal = document.createElement('div');
                modal.id = 'modal-wa-pick';
                modal.className = 'js-modal-bottom-sheet';
                modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;justify-content:center;padding:16px;';
                modal.innerHTML = `<div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:24px 24px 24px 24px;width:100%;max-width:400px;overflow:hidden;margin-bottom:80px;">
                    <div style="background:linear-gradient(to right,#16a34a,#15803d);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
                        <div><p style="color:white;font-weight:900;font-size:14px;">💬 ENVIAR WHATSAPP</p><p style="color:rgba(255,255,255,0.7);font-size:10px;">${escapeHtml(o.nom)} · ${escapeHtml(String(o.tel ?? ''))}</p></div>
                        <button onclick="document.getElementById('modal-wa-pick').remove()" style="color:white;background:rgba(0,0,0,0.3);width:28px;height:28px;border-radius:50%;font-size:14px;">✕</button>
                    </div>
                    <div style="padding:16px;display:flex;flex-direction:column;gap:10px;max-height:72vh;overflow-y:auto;">
                        <button onclick="waPickSend('recepcion',${id})" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">📥 Mensaje de recepción<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Confirmar que recibiste el equipo</span></button>
                        <button onclick="waPickSend('revision',${id})" style="background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);color:#fde68a;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">🔍 En revisión<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Equipo siendo diagnosticado</span></button>
                        <button onclick="waPickSend('presupuesto',${id})" style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#c4b5fd;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">💼 Enviar presupuesto<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Informar valor de la reparación</span></button>
                        <button onclick="waPickSend('listo',${id})" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#6ee7b7;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">✅ Equipo listo para recoger<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Avisar que la reparación terminó</span></button>
                        <button onclick="waPickSend('garantia',${id})" style="background:rgba(20,184,166,0.12);border:1px solid rgba(20,184,166,0.3);color:#5eead4;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">🛡️ Recordatorio de garantía<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Informar días de garantía activos</span></button>
                        <button onclick="waPickSend('norepara',${id})" style="background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.3);color:#fdba74;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">⚠️ No tiene reparación<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Equipo sin solución o sin repuesto</span></button>
                        <button onclick="waPickSend('retraso',${id})" style="background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.2);color:#cbd5e1;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">⏳ Aviso de retraso<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Pedir más tiempo para la reparación</span></button>
                        <button onclick="waPickSend('cobro',${id})" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;padding:14px;border-radius:14px;font-weight:900;font-size:12px;text-align:left;">💸 Recordatorio de pago<br><span style="font-weight:400;font-size:10px;opacity:0.7;">Recordar saldo pendiente</span></button>
                    </div>
                </div>`;
                document.body.appendChild(modal);
            });
        }
        async function waPickSend(type, id) {
            document.getElementById('modal-wa-pick')?.remove();
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            if (!o) return;
            const msg = buildWhatsappMsg(type, o);
            const num = o.tel.replace(/\D/g, '');
            const prefix = num.startsWith('57') ? '' : '57';
            // Marcar que salimos hacia WhatsApp para forzar repaint al volver
            sessionStorage.setItem('_waJump', '1');
            window.open(`https://wa.me/${prefix}${num}?text=${encodeURIComponent(msg)}`, '_blank');
        }

