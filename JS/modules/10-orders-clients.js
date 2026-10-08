/* NelsonApp — 10-orders-clients.js
 * Clientes, órdenes, búsqueda, facturación y pagos
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== CLIENTES Y DEUDA ====================
        async function updateClientDebt(nombre, amount, isPayment = false) {
            let client = await getOne('clientes', nombre);
            if (!client) client = { nombre, deuda: 0, telefono: '' };
            if (isPayment) client.deuda -= amount;
            else client.deuda += amount;
            if (client.deuda < 0) client.deuda = 0;
            await put('clientes', client);
        }
        async function recordPayment() {
            if (!currentClientHistory) return;
            const amount = parseFloat(document.getElementById('payment-amount').value);
            if (isNaN(amount) || amount <= 0) return showAlert("Monto inválido. Ingresa un valor mayor a 0.", "warning");
            await updateClientDebt(currentClientHistory, amount, true);
            await put('payments', { id: _uid(), cliente: currentClientHistory, monto: amount, fecha: Date.now(), tipo: 'pago' });
            await renderCartera();
            await renderMovimientos();
            closeClientHistory();
            showAlert(`Pago de ${getCurrency()}${amount.toLocaleString()} registrado correctamente.`, "success");
        }
        async function renderCartera() {
            const cur = getCurrency();
            const clientes = await getAll('clientes');
            const deudores = clientes.filter(c => c.deuda > 0).sort((a,b) => b.deuda - a.deuda);
            const container = document.getElementById('cartera-list');
            if (!deudores.length) {
                container.innerHTML = `<div style="text-align:center;padding:28px 16px;">
                    <div style="font-size:36px;margin-bottom:8px;">🎉</div>
                    <div style="font-size:12px;font-weight:800;color:#34d399;letter-spacing:1px;">Sin deudas pendientes</div>
                    <div style="font-size:10px;color:#64748b;margin-top:4px;">Todos los clientes al día</div>
                </div>`;
                return;
            }
            const avatarHues = [12, 35, 145, 200, 260, 320];
            const totalDeuda = deudores.reduce((a, c) => a + (c.deuda || 0), 0);
            // Resumen superior
            let html = `<div style="padding:10px 12px;margin-bottom:10px;background:linear-gradient(135deg,rgba(244,63,94,0.08),rgba(15,23,42,0.4));border:1px solid rgba(244,63,94,0.2);border-radius:12px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:9px;font-weight:900;color:#fb7185;letter-spacing:1.5px;text-transform:uppercase;">Por cobrar</div>
                    <div style="font-size:17px;font-weight:900;color:#f87171;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${totalDeuda.toLocaleString()}</div>
                </div>
                <div style="padding:6px 12px;border-radius:99px;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);font-size:10px;font-weight:900;color:#fb7185;letter-spacing:1px;">${deudores.length} ${deudores.length === 1 ? 'cliente' : 'clientes'}</div>
            </div>`;
            html += deudores.map((c, idx) => {
                const nameInitials = (c.nombre || 'C').split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'C';
                let hashVal = 0;
                for (let i = 0; i < (c.nombre || '').length; i++) hashVal = (hashVal + (c.nombre || '').charCodeAt(i)) % avatarHues.length;
                const hue = avatarHues[hashVal];
                const pct = deudores[0].deuda > 0 ? Math.round((c.deuda / deudores[0].deuda) * 100) : 0;
                const safeName = escapeHtml(c.nombre).replace(/'/g, "&#39;");
                const tel = c.telefono || '';
                const waUrl = tel ? `https://wa.me/${tel.replace(/\D/g,'')}?text=${encodeURIComponent('Hola ' + c.nombre + ', cómo estás? Te escribo por el saldo pendiente de ' + cur + c.deuda.toLocaleString() + ' en Todo Repuestos Nelson. Quedo atento a tu respuesta.')}` : '';
                return `<div style="position:relative;padding:12px;background:rgba(15,23,42,0.5);border:1px solid rgba(244,63,94,0.12);border-left:3px solid hsl(${hue},70%,55%);border-radius:14px;margin-bottom:8px;transition:all 0.15s ease;" onmouseenter="this.style.background='rgba(15,23,42,0.7)'" onmouseleave="this.style.background='rgba(15,23,42,0.5)'">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="flex-shrink:0;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${hue},70%,40%));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;box-shadow:0 4px 10px hsla(${hue},70%,50%,0.3);letter-spacing:-0.3px;">${nameInitials}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:3px;">
                                <span style="font-size:13px;font-weight:900;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.nombre)}</span>
                                <span style="font-size:14px;font-weight:900;color:#f87171;font-variant-numeric:tabular-nums;flex-shrink:0;letter-spacing:-0.2px;">${cur}${c.deuda.toLocaleString()}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                                <span style="font-size:10px;color:#94a3b8;font-weight:600;">📱 ${tel || 'Sin teléfono'}</span>
                                ${idx === 0 ? '<span style="font-size:8px;font-weight:900;color:#f87171;padding:1px 6px;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);border-radius:99px;letter-spacing:1px;">MAYOR</span>' : ''}
                            </div>
                            <div style="height:3px;background:rgba(15,23,42,0.8);border-radius:99px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#f43f5e,#fb7185);border-radius:99px;"></div>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;">
                        <button onclick="showClientHistory('${safeName}')" style="flex:1;padding:7px;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.2);border-radius:9px;color:#cbd5e1;font-size:10px;font-weight:800;cursor:pointer;letter-spacing:0.5px;">📜 Historial</button>
                        ${tel ? `<a href="${waUrl}" target="_blank" style="flex:1;padding:7px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:9px;color:#34d399;font-size:10px;font-weight:800;text-align:center;text-decoration:none;letter-spacing:0.5px;">💬 WhatsApp</a>` : ''}
                    </div>
                </div>`;
            }).join('');
            container.innerHTML = html;
        }
        async function showClientHistory(nombre) {
            currentClientHistory = nombre;
            const orders   = await getAll('orders');
            const payments = await getAll('payments');
            const clientOrders   = orders.filter(o => o.nom === nombre).sort((a,b) => b.fecha - a.fecha);
            const clientPayments = payments.filter(p => p.cliente === nombre).sort((a,b) => b.fecha - a.fecha);
            const clientData = await getOne('clientes', nombre);
            const cur = getCurrency();

            // Métricas
            const completadas  = clientOrders.filter(o => o.sta === 'entregado');
            const activas      = clientOrders.filter(o => o.sta !== 'entregado' && o.sta !== 'no-reparable');
            const totalGastado = completadas.reduce((a,b) => a + (b.val||0), 0);
            const tiempos      = completadas.filter(o => o.fechaEntrega && o.fecha).map(o => Math.round((o.fechaEntrega - o.fecha) / 86400000));
            const diasProm     = tiempos.length ? Math.round(tiempos.reduce((a,b) => a+b, 0) / tiempos.length) : null;
            const deuda        = clientData?.deuda || 0;
            const telefono     = clientData?.telefono || clientOrders[0]?.tel || '';
            const primeraFecha = clientOrders.length ? clientOrders[clientOrders.length-1].fecha : null;
            const ultimaFecha  = clientOrders.length ? clientOrders[0].fecha : null;
            const diasDesdeUltima = ultimaFecha ? Math.floor((Date.now() - ultimaFecha) / 86400000) : 0;

            // Equipos más traídos
            const eqCount = {};
            clientOrders.forEach(o => { const k = (o.equ || '').toUpperCase().trim(); if (k) eqCount[k] = (eqCount[k]||0)+1; });
            const topEquipo = Object.entries(eqCount).sort((a,b) => b[1]-a[1])[0];

            // Tier del cliente según gasto total
            let tier, tierColor, tierBg, tierIcon;
            if (totalGastado >= 2000000) { tier = 'VIP'; tierIcon = '💎'; tierColor = '#a78bfa'; tierBg = 'rgba(139,92,246,0.15)'; }
            else if (totalGastado >= 500000) { tier = 'FRECUENTE'; tierIcon = '⭐'; tierColor = '#fbbf24'; tierBg = 'rgba(251,191,36,0.15)'; }
            else if (clientOrders.length >= 3) { tier = 'RECURRENTE'; tierIcon = '🔁'; tierColor = '#60a5fa'; tierBg = 'rgba(96,165,250,0.15)'; }
            else { tier = 'NUEVO'; tierIcon = '🆕'; tierColor = '#34d399'; tierBg = 'rgba(16,185,129,0.15)'; }

            // Avatar
            const nameInitials = (nombre || 'C').split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'C';
            const avatarHues = [12, 35, 145, 200, 260, 320];
            let hashVal = 0;
            for (let i = 0; i < nombre.length; i++) hashVal = (hashVal + nombre.charCodeAt(i)) % avatarHues.length;
            const hue = avatarHues[hashVal];

            // HEADER del modal con avatar + identidad + tier
            const waUrl = telefono ? `https://wa.me/${telefono.replace(/\D/g,'')}` : '';
            document.getElementById('client-history-header').innerHTML = `
                <div style="position:absolute;top:-50px;right:-50px;width:180px;height:180px;background:radial-gradient(circle,hsla(${hue},70%,55%,0.25),transparent 70%);pointer-events:none;"></div>
                <div style="position:relative;display:flex;align-items:flex-start;gap:14px;">
                    <div style="flex-shrink:0;width:62px;height:62px;border-radius:18px;background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${hue},70%,40%));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;box-shadow:0 10px 24px hsla(${hue},70%,50%,0.4);letter-spacing:-0.8px;">${nameInitials}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:9px;font-weight:900;color:#fb923c;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:2px;">Ficha del cliente</div>
                        <div style="font-size:18px;font-weight:900;color:#f1f5f9;line-height:1.15;margin-bottom:6px;word-break:break-word;">${escapeHtml(nombre)}</div>
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <span style="padding:3px 10px;border-radius:99px;background:${tierBg};border:1px solid ${tierColor}44;color:${tierColor};font-size:9px;font-weight:900;letter-spacing:1.5px;">${tierIcon} ${tier}</span>
                            ${telefono ? `<span style="font-size:10px;color:#94a3b8;font-weight:600;">📱 ${telefono}</span>` : '<span style="font-size:10px;color:#64748b;font-weight:600;">Sin teléfono</span>'}
                        </div>
                    </div>
                    <button onclick="closeClientHistory()" style="flex-shrink:0;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:14px;cursor:pointer;">✕</button>
                </div>
                ${telefono ? `<div style="margin-top:12px;display:flex;gap:6px;">
                    <a href="${waUrl}" target="_blank" style="flex:1;padding:8px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;color:#34d399;font-size:10px;font-weight:900;text-align:center;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">💬 WhatsApp</a>
                    <a href="tel:${telefono}" style="flex:1;padding:8px;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.3);border-radius:10px;color:#60a5fa;font-size:10px;font-weight:900;text-align:center;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">📞 Llamar</a>
                </div>` : ''}
            `;

            // ═══ Contenido scrolleable ═══
            let html = '';

            // KPIs principales en grid 2x2
            html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
                <div style="padding:12px;background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(15,23,42,0.3));border:1px solid rgba(16,185,129,0.2);border-radius:14px;">
                    <div style="font-size:8px;font-weight:900;color:#34d399;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">💰 Total gastado</div>
                    <div style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${totalGastado.toLocaleString()}</div>
                </div>
                <div style="padding:12px;background:linear-gradient(135deg,${deuda > 0 ? 'rgba(244,63,94,0.08)' : 'rgba(148,163,184,0.05)'},rgba(15,23,42,0.3));border:1px solid ${deuda > 0 ? 'rgba(244,63,94,0.25)' : 'rgba(148,163,184,0.1)'};border-radius:14px;">
                    <div style="font-size:8px;font-weight:900;color:${deuda > 0 ? '#fb7185' : '#64748b'};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">${deuda > 0 ? '⚠️ Debe' : '✅ Al día'}</div>
                    <div style="font-size:16px;font-weight:900;color:${deuda > 0 ? '#f87171' : '#94a3b8'};font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">${cur}${deuda.toLocaleString()}</div>
                </div>
                <div style="padding:12px;background:linear-gradient(135deg,rgba(96,165,250,0.06),rgba(15,23,42,0.3));border:1px solid rgba(96,165,250,0.15);border-radius:14px;">
                    <div style="font-size:8px;font-weight:900;color:#60a5fa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">🔧 Órdenes</div>
                    <div style="display:flex;align-items:baseline;gap:6px;">
                        <span style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;">${clientOrders.length}</span>
                        ${activas.length > 0 ? `<span style="font-size:9px;font-weight:800;color:#fb923c;">· ${activas.length} activa${activas.length!==1?'s':''}</span>` : ''}
                    </div>
                </div>
                <div style="padding:12px;background:linear-gradient(135deg,rgba(139,92,246,0.06),rgba(15,23,42,0.3));border:1px solid rgba(139,92,246,0.15);border-radius:14px;">
                    <div style="font-size:8px;font-weight:900;color:#a78bfa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">⚡ Prom. reparación</div>
                    <div style="font-size:16px;font-weight:900;color:#f1f5f9;font-variant-numeric:tabular-nums;">${diasProm !== null ? diasProm + 'd' : '—'}</div>
                </div>
            </div>`;

            // Insights destacados
            if (clientOrders.length > 0) {
                html += `<div style="padding:12px;background:linear-gradient(135deg,rgba(234,179,8,0.06),rgba(15,23,42,0.3));border:1px solid rgba(234,179,8,0.15);border-radius:14px;margin-bottom:14px;">
                    <div style="font-size:9px;font-weight:900;color:#facc15;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">🔍 Perfil del cliente</div>
                    <div style="display:flex;flex-direction:column;gap:5px;font-size:11px;color:#cbd5e1;font-weight:600;">`;
                if (primeraFecha) {
                    const añosCliente = ((Date.now() - primeraFecha) / (365.25 * 86400000));
                    const tiempoTexto = añosCliente >= 1 ? `hace ${añosCliente.toFixed(1)} años` : `hace ${Math.round((Date.now() - primeraFecha) / (30 * 86400000))} meses`;
                    html += `<div>📆 <span style="color:#94a3b8;">Cliente desde</span> <strong style="color:#f1f5f9;">${new Date(primeraFecha).toLocaleDateString('es-ES', {month:'short', year:'numeric'})}</strong> <span style="color:#64748b;">· ${tiempoTexto}</span></div>`;
                }
                if (ultimaFecha) {
                    const ultimaColor = diasDesdeUltima > 180 ? '#f87171' : (diasDesdeUltima > 90 ? '#fbbf24' : '#34d399');
                    html += `<div>⏱️ <span style="color:#94a3b8;">Última visita:</span> <strong style="color:${ultimaColor};">hace ${diasDesdeUltima} día${diasDesdeUltima!==1?'s':''}</strong></div>`;
                }
                if (topEquipo && topEquipo[1] > 1) {
                    html += `<div>🔧 <span style="color:#94a3b8;">Equipo más frecuente:</span> <strong style="color:#fb923c;">${escapeHtml(topEquipo[0])}</strong> <span style="color:#64748b;">(${topEquipo[1]} veces)</span></div>`;
                }
                if (clientOrders.length >= 5) {
                    const gastoProm = Math.round(totalGastado / completadas.length) || 0;
                    if (gastoProm > 0) html += `<div>💵 <span style="color:#94a3b8;">Gasto promedio:</span> <strong style="color:#34d399;">${cur}${gastoProm.toLocaleString()}</strong> por visita</div>`;
                }
                html += `</div></div>`;
            }

            // Colores por estado
            const staColor = { recibido:'#94a3b8', 'revisión':'#fbbf24', reparado:'#34d399', entregado:'#60a5fa', 'no-reparable':'#f87171' };
            const staIcon  = { recibido:'📥', 'revisión':'🔍', reparado:'✅', entregado:'📦', 'no-reparable':'🚫' };

            // Timeline de órdenes
            if (clientOrders.length) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:10px;font-weight:900;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">📋 Historial de órdenes</span>
                    <span style="font-size:9px;color:#64748b;font-weight:700;">${Math.min(clientOrders.length, 10)} de ${clientOrders.length}</span>
                </div>`;
                html += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">';
                clientOrders.slice(0, 10).forEach(o => {
                    const fecha = new Date(o.fecha).toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'2-digit'});
                    const color = staColor[o.sta] || '#94a3b8';
                    const icon = staIcon[o.sta] || '📄';
                    const numLabel = o.orderNum ? formatOrderNum(o.orderNum) : '';
                    html += `<div onclick="closeClientHistory();setTimeout(()=>editOrder(${o.id}),120);" style="padding:10px 12px;background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.04);border-left:3px solid ${color};border-radius:10px;cursor:pointer;transition:all 0.12s ease;" onmouseenter="this.style.background='rgba(15,23,42,0.8)'" onmouseleave="this.style.background='rgba(15,23,42,0.5)'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap;">
                                    ${numLabel ? `<span style="font-size:9px;font-weight:900;color:#64748b;font-family:ui-monospace,monospace;">${numLabel}</span>` : ''}
                                    <span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:99px;background:${color}22;color:${color};letter-spacing:0.5px;text-transform:uppercase;">${icon} ${o.sta}</span>
                                </div>
                                <div style="font-size:12px;font-weight:800;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(o.equ)}</div>
                                <div style="font-size:10px;color:#64748b;font-weight:600;margin-top:2px;">📅 ${fecha}</div>
                            </div>
                            <div style="text-align:right;flex-shrink:0;">
                                <div style="font-size:13px;font-weight:900;color:#34d399;font-variant-numeric:tabular-nums;">${cur}${(o.val||0).toLocaleString()}</div>
                            </div>
                        </div>
                        ${o.notas ? `<div style="font-size:10px;color:#facc15;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🔒 ${escapeHtml(o.notas.substring(0,50))}${o.notas.length > 50 ? '…' : ''}</div>` : ''}
                    </div>`;
                });
                html += '</div>';
            } else {
                html += '<div style="text-align:center;padding:20px;color:#64748b;font-size:11px;">Sin órdenes registradas</div>';
            }

            // Pagos
            if (clientPayments.length) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:10px;font-weight:900;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">💵 Pagos recientes</span>
                    <span style="font-size:9px;color:#64748b;font-weight:700;">${Math.min(clientPayments.length, 5)} de ${clientPayments.length}</span>
                </div>`;
                html += '<div style="display:flex;flex-direction:column;gap:4px;">';
                clientPayments.slice(0,5).forEach(p => {
                    const fecha = new Date(p.fecha).toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'2-digit'});
                    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:10px;">
                        <span style="font-size:10px;color:#94a3b8;font-weight:700;">📅 ${fecha}</span>
                        <span style="font-size:12px;font-weight:900;color:#60a5fa;font-variant-numeric:tabular-nums;">+${cur}${p.monto.toLocaleString()}</span>
                    </div>`;
                });
                html += '</div>';
            }

            document.getElementById('client-history-list').innerHTML = html;
            document.getElementById('modal-client-history').classList.remove('hidden');
        }
        function closeClientHistory() { document.getElementById('modal-client-history').classList.add('hidden'); currentClientHistory = null; document.getElementById('payment-amount').value = ''; }

        // ==================== FUNCIONES PRINCIPALES ====================
        // OPTIMIZACIÓN: arranque escalonado en 3 fases.
        // Fase 1 (crítica, síncrona): UI visible y usable al instante.
        // Fase 2 (defer suave): checks de datos y UI secundaria, ~200ms después.
        // Fase 3 (idle): migraciones, reconexión Drive, push permission, cuando el navegador esté ocioso.
        async function initApp() {
            // ═══ FASE 1: CRÍTICA ═══ Lo que el usuario necesita ver ya
            applyStoredTheme();
            applyAccentColor();
            applyTallerBtnColor();
            applyFontSize();
            applyHighContrast();
            loadBusinessConfig();
            await openDB();
            await updateTotal();
            await updateSuggestions();
            await renderCartera();
            updateMetaBar();
            resetLockTimer();
            _refreshTecnicosSelects();
            _renderBiometricToggle();

            // ═══ FASE 2: DEFER SUAVE ═══ Checks y configuraciones que pueden esperar un frame
            setTimeout(() => {
                try {
                    checkLowStock();
                    checkOverdueOrders();
                    checkUnclaimedRepairs();
                    checkWarrantyAlerts();
                    checkSinMovimiento();
                    loadLowStockThreshold();
                    loadBackupInterval();
                    setupReminderChecks();
                    startAutoBackup();
                    loadAutoThemeConfig();
                    startAutoThemeWatcher();
                } catch(e) { console.warn('Fase 2 init:', e); }
            }, 200);

            // ═══ FASE 3: IDLE ═══ Lo no urgente: permisos, reconexión Drive, migraciones
            const runIdle = (fn) => {
                if (window.requestIdleCallback) {
                    requestIdleCallback(fn, { timeout: 3000 });
                } else {
                    setTimeout(fn, 1500);
                }
            };
            runIdle(async () => {
                try {
                    requestNotificationPermission();
                    requestPushPermission();
                    tryDriveReconnect();
                    await _migrateStockFields();
                    // Verificar si es la primera vez que se abre la app → mostrar tour
                    _maybeShowTourOnStart();
                } catch(e) { console.warn('Fase 3 init:', e); }
            });
        }

        // ==================== MIGRACIÓN DE CAMPOS STOCK ====================
        // Helper: normaliza un item de stock al formato canónico (nombres cortos)
        // Útil como red de seguridad si en algún backup viejo entran items con campos largos
        function _normStock(s) {
            if (!s || typeof s !== 'object') return s;
            // Si solo tiene nombres largos, copiar al corto
            if (s.n        === undefined && s.name     !== undefined) s.n        = s.name;
            if (s.p        === undefined && s.price    !== undefined) s.p        = s.price;
            if (s.q        === undefined && s.qty      !== undefined) s.q        = s.qty;
            if (s.cat      === undefined && s.category !== undefined) s.cat      = s.category;
            if (s.minStock === undefined && s.minimo   !== undefined) s.minStock = s.minimo;
            return s;
        }
        // Unifica los campos del stock dejando SOLO los nombres cortos canónicos:
        // {n, p, q, cat, minStock, cost, code, supplier, notes, img}
        // Si encuentra los nombres largos {name, price, qty, category, minimo} los
        // copia a los cortos (si los cortos faltan) y luego ELIMINA los largos.
        // Esto previene desincronización entre lecturas/escrituras.
        async function _migrateStockFields() {
            try {
                const items = await getAll('stock');
                let migrated = 0;
                for (const s of items) {
                    let changed = false;
                    // 1) Si hay nombre largo y no corto → copiar al corto
                    if (s.name      !== undefined && s.n        === undefined) { s.n        = s.name;      changed = true; }
                    if (s.price     !== undefined && s.p        === undefined) { s.p        = s.price;     changed = true; }
                    if (s.qty       !== undefined && s.q        === undefined) { s.q        = s.qty;       changed = true; }
                    if (s.category  !== undefined && s.cat      === undefined) { s.cat      = s.category;  changed = true; }
                    if (s.minimo    !== undefined && s.minStock === undefined) { s.minStock = s.minimo;    changed = true; }

                    // 2) Eliminar campos largos duplicados (siempre, si existen)
                    if (s.name     !== undefined) { delete s.name;     changed = true; }
                    if (s.price    !== undefined) { delete s.price;    changed = true; }
                    if (s.qty      !== undefined) { delete s.qty;      changed = true; }
                    if (s.category !== undefined) { delete s.category; changed = true; }
                    if (s.minimo   !== undefined) { delete s.minimo;   changed = true; }

                    // 3) Asegurar tipos correctos en los campos canónicos
                    if (s.q !== undefined && typeof s.q !== 'number') { s.q = parseInt(s.q) || 0; changed = true; }
                    if (s.p !== undefined && typeof s.p !== 'number') { s.p = parseFloat(s.p) || 0; changed = true; }
                    if (s.cost !== undefined && typeof s.cost !== 'number') { s.cost = parseFloat(s.cost) || 0; changed = true; }
                    if (s.minStock !== undefined && typeof s.minStock !== 'number') { s.minStock = parseInt(s.minStock) || 0; changed = true; }

                    if (changed) { await put('stock', s); migrated++; }
                }
                if (migrated > 0) console.log(`[NelsonApp] Stock: ${migrated} items normalizados (campos unificados)`);
            } catch(e) { console.warn('[NelsonApp] Error en migración de stock:', e); }
        }

        function _refreshTecnicosSelects() {
            const tecnicos = getTecnicos();
            const opts = '<option value="">Sin asignar</option>' + tecnicos.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
            ['c-tecnico','edit-tecnico'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { const prev = el.value; el.innerHTML = opts; el.value = prev; }
            });
            // Filtro de técnicos
            const ft = document.getElementById('filter-tecnico');
            if (ft) {
                const prev = ft.value;
                ft.innerHTML = '<option value="">Todos los técnicos</option>' + tecnicos.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
                ft.value = prev;
            }
        }

        // ==================== RESPALDO AUTOMÁTICO ====================
        function startAutoBackup() {
            if (autoBackupIntervalId) clearInterval(autoBackupIntervalId);
            const intervalHours = parseInt(localStorage.getItem('backupIntervalHours')) || 0;
            if (intervalHours > 0 && driveToken) {
                autoBackupIntervalId = setInterval(() => {
                    // Solo ejecutar si hay token de Drive activo
                    if (driveToken) {
                        driveBackupNow(true); // true = silencioso (sin toast de éxito)
                    }
                }, intervalHours * 3600000);
            }
        }

        // Modificar saveBackupInterval para reiniciar el timer
        function saveBackupInterval() {
            const hours = parseInt(document.getElementById('config-backup-interval').value);
            localStorage.setItem('backupIntervalHours', hours);
            startAutoBackup();
            if (hours === 0) {
                showToast('Respaldo automático desactivado', 'info');
            } else if (hours === 168) {
                showToast('Respaldo automático: semanal', 'success');
            } else {
                showToast(`Respaldo automático: cada ${hours} horas`, 'success');
            }
            // Refresh config UI if open
            if (typeof updateConfigBadges === 'function') updateConfigBadges();
            if (typeof updateConfigHealth === 'function') updateConfigHealth();
        }

        // ═══ Overlay de progreso de subida/descarga a Drive ═══
        function showDriveProgress(fileName, mode = 'upload') {
            let overlay = document.getElementById('drive-upload-overlay');
            if (overlay) overlay.remove();
            overlay = document.createElement('div');
            overlay.id = 'drive-upload-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;animation:dup-fadein 0.25s ease;';

            // Paleta distinta según sea subida o descarga
            const isDownload = mode === 'download';
            const accent     = isDownload ? '#10b981' : '#3b82f6';    // verde para bajada, azul para subida
            const accentDim  = isDownload ? '#059669' : '#1d4ed8';
            const accentLite = isDownload ? '#34d399' : '#60a5fa';
            const label      = isDownload ? 'Google Drive · Restaurar' : 'Google Drive';
            // SVG: flecha arriba para upload, flecha abajo para download
            const iconSvg = isDownload
                ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

            overlay.innerHTML = `
                <style>
                    @keyframes dup-fadein { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes dup-slidein { from { transform: translateY(20px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                    @keyframes dup-spin { to { transform: rotate(360deg); } }
                    @keyframes dup-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                    #dup-panel .dup-bar-fill { transition: width 0.18s cubic-bezier(0.4, 0, 0.2, 1); }
                </style>
                <div id="dup-panel" style="width:100%;max-width:360px;background:linear-gradient(180deg,#14162a 0%,#0d0f1a 100%);border-radius:24px;border:1px solid ${accent}40;padding:26px 22px;box-shadow:0 20px 60px rgba(0,0,0,0.6);animation:dup-slidein 0.35s cubic-bezier(0.16,1,0.3,1);">
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
                        <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,${accentDim},${accent});display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 18px ${accent}66;position:relative;">
                            ${iconSvg}
                            <div id="dup-spinner" style="position:absolute;inset:-3px;border-radius:19px;border:2px solid transparent;border-top-color:${accentLite};animation:dup-spin 1s linear infinite;"></div>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:10px;font-weight:900;letter-spacing:2.5px;color:${accentLite};text-transform:uppercase;margin-bottom:3px;">${label}</div>
                            <div id="dup-status" style="font-size:15px;font-weight:800;color:#fff;line-height:1.3;">${isDownload ? 'Preparando...' : 'Preparando respaldo...'}</div>
                        </div>
                    </div>
                    <div style="background:#0a0c17;border-radius:14px;padding:14px 16px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
                            <span id="dup-percent" style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;font-variant-numeric:tabular-nums;">0%</span>
                            <span id="dup-size" style="font-size:11px;font-weight:700;color:#94a3b8;font-variant-numeric:tabular-nums;">— / —</span>
                        </div>
                        <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;position:relative;">
                            <div class="dup-bar-fill" id="dup-bar" style="height:100%;width:0%;background:linear-gradient(90deg,${accent} 0%,${accentLite} 50%,${accent} 100%);background-size:200% 100%;animation:dup-shimmer 2s linear infinite;border-radius:999px;box-shadow:0 0 12px ${accent}99;"></div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;margin-bottom:14px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <span id="dup-filename" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;">${fileName || ''}</span>
                    </div>
                    <!-- Botón de cancelar -->
                    <button id="dup-cancel-btn" onclick="cancelDriveOperation()" style="
                        width:100%;padding:12px;border-radius:12px;
                        background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.1);
                        color:#94a3b8;font-size:11px;font-weight:900;letter-spacing:1.5px;
                        text-transform:uppercase;cursor:pointer;
                        transition:all 0.2s ease;
                    " ontouchstart="this.style.transform='scale(0.97)'" ontouchend="this.style.transform='scale(1)'">
                        ✕ CANCELAR
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
            // Escape para cancelar
            const escHandler = (e) => {
                if (e.key === 'Escape' && document.getElementById('drive-upload-overlay')) {
                    cancelDriveOperation();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            return overlay;
        }

        function updateDriveProgress(percent, loaded, total, status) {
            const overlay = document.getElementById('drive-upload-overlay');
            if (!overlay) return;
            const pct = Math.max(0, Math.min(100, Math.round(percent)));
            const bar = overlay.querySelector('#dup-bar');
            const pctEl = overlay.querySelector('#dup-percent');
            const sizeEl = overlay.querySelector('#dup-size');
            const statusEl = overlay.querySelector('#dup-status');
            const cancelBtn = overlay.querySelector('#dup-cancel-btn');
            if (bar) bar.style.width = pct + '%';
            if (pctEl) pctEl.textContent = pct + '%';
            if (sizeEl && loaded != null && total != null) {
                const fmt = (n) => {
                    if (n < 1024) return n + ' B';
                    if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
                    return (n/1024/1024).toFixed(2) + ' MB';
                };
                sizeEl.textContent = `${fmt(loaded)} / ${fmt(total)}`;
            }
            if (status && statusEl) statusEl.textContent = status;
            // Al 100% deshabilitar el cancelar para evitar confusión
            if (cancelBtn && pct >= 100) {
                cancelBtn.style.opacity = '0.4';
                cancelBtn.style.pointerEvents = 'none';
                cancelBtn.innerHTML = '✓ LISTO';
            }
        }

        function hideDriveProgress(delay = 0) {
            const overlay = document.getElementById('drive-upload-overlay');
            if (!overlay) return;
            setTimeout(() => {
                overlay.style.transition = 'opacity 0.25s ease';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 260);
            }, delay);
        }

        // XHR activo actual (para poder cancelar desde el overlay)
        let _activeDriveXhr = null;
        let _driveProgressTimeout = null; // detecta si se queda sin avance

        function cancelDriveOperation() {
            try {
                if (_activeDriveXhr) {
                    _activeDriveXhr.abort();
                    _activeDriveXhr = null;
                }
            } catch(_) {}
            if (_driveProgressTimeout) { clearTimeout(_driveProgressTimeout); _driveProgressTimeout = null; }
            hideDriveProgress();
            showToast('Operación cancelada', 'warning');
        }

        // Sube un FormData a Drive con progreso real usando XHR
        function uploadToDriveWithProgress(url, method, form, token, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                _activeDriveXhr = xhr;
                xhr.open(method, url, true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                let lastProgressAt = Date.now();
                if (xhr.upload && typeof onProgress === 'function') {
                    xhr.upload.onprogress = (e) => {
                        lastProgressAt = Date.now();
                        if (e.lengthComputable) {
                            onProgress((e.loaded / e.total) * 100, e.loaded, e.total);
                        }
                    };
                }
                // Watchdog: si pasan más de 45s sin progreso, mostrar botón "Cancelar" prominente
                const watchdog = setInterval(() => {
                    if (Date.now() - lastProgressAt > 45000) {
                        const cancelBtn = document.getElementById('dup-cancel-btn');
                        if (cancelBtn) {
                            cancelBtn.style.background = 'rgba(244,63,94,0.2)';
                            cancelBtn.style.borderColor = 'rgba(244,63,94,0.5)';
                            cancelBtn.style.color = '#fb7185';
                            cancelBtn.innerHTML = '⚠️ PARECE COLGADO · CANCELAR';
                        }
                        const statusEl = document.getElementById('dup-status');
                        if (statusEl) statusEl.textContent = 'Sin respuesta de Drive...';
                    }
                }, 5000);
                xhr.onload = () => {
                    clearInterval(watchdog);
                    _activeDriveXhr = null;
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch(_) { resolve({}); }
                    } else {
                        const err = new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0,200)}`);
                        err.status = xhr.status;
                        reject(err);
                    }
                };
                xhr.onerror = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Error de red al subir a Drive')); };
                xhr.onabort = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Subida cancelada')); };
                xhr.send(form);
            });
        }

        // Modificar driveBackupNow para aceptar parámetro silent
        async function driveBackupNow(silent = false) {
            if (!driveToken && !(await _driveEnsureFresh())) { if(!silent) showAlert('Primero conecta tu cuenta de Google.', 'warning'); return; }

            // Chequeo offline: si no hay red, no intentar backup
            if (!navigator.onLine) {
                if (!silent) showAlert('Sin conexión. El backup se realizará cuando vuelva internet.', 'warning');
                return;
            }

            const fileName = `nelson_backup_${_ymdLocal(new Date())}.json`;
            if (!silent) showDriveProgress(fileName);

            try {
                if (!silent) updateDriveProgress(0, 0, 0, 'Leyendo base de datos...');
                const orders   = await getAll('orders');
                const stock    = await getAll('stock');
                const sales    = await getAll('sales');
                const gastos   = await getAll('gastos');
                const clientes = await getAll('clientes');
                const payments = await getAll('payments');
                const calificaciones = await getAll('calificaciones');
                const stockHistory = await getAll('stockHistory');
                const orderChat    = await getAll('orderChat');
                const paymentPlans = await getAll('paymentPlans');

                if (!silent) updateDriveProgress(0, 0, 0, 'Empaquetando fotos...');
                const exportOrders = [];
                for (let o of orders) {
                    exportOrders.push({ ...o, fotos: await blobsToB64(o.fotos || []), fotosEntrega: await blobsToB64(o.fotosEntrega || []) });
                }

                const jsonStr  = JSON.stringify({ orders: exportOrders, stock, sales, gastos, clientes, payments, calificaciones, stockHistory, orderChat, paymentPlans, date: new Date().toISOString() });
                const folderId = await ensureDriveFolder();
                if (!folderId) throw new Error('No se pudo preparar la carpeta de respaldo en Drive');

                const blob = new Blob([jsonStr], { type: 'application/json' });
                let url    = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
                let method = 'POST';
                let form   = new FormData();

                if (!silent) updateDriveProgress(0, 0, blob.size, 'Conectando con Drive...');

                // Verificar si ya existe un archivo con ese nombre para sobreescribirlo
                try {
                    const searchExisting = await driveFetch(
                        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`)}&fields=files(id)`
                    ).then(r => r.json());

                    if (searchExisting.files && searchExisting.files.length > 0) {
                        const existId = searchExisting.files[0].id;
                        url    = `https://www.googleapis.com/upload/drive/v3/files/${existId}?uploadType=multipart`;
                        method = 'PATCH';
                        form   = new FormData();
                        form.append('metadata', new Blob([JSON.stringify({ name: fileName })], { type: 'application/json' }));
                        form.append('file', blob);
                    } else {
                        const metadata = { name: fileName, parents: folderId ? [folderId] : [] };
                        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                        form.append('file', blob);
                    }
                } catch(_) {
                    const metadata = { name: fileName, parents: folderId ? [folderId] : [] };
                    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                    form.append('file', blob);
                }

                if (!silent) updateDriveProgress(0, 0, blob.size, 'Subiendo respaldo...');

                let result;
                if (!silent) {
                    // Subida con progreso visible
                    result = await uploadToDriveWithProgress(url, method, form, driveToken, (pct, loaded, total) => {
                        updateDriveProgress(pct, loaded, total, pct >= 99 ? 'Finalizando...' : 'Subiendo respaldo...');
                    });
                } else {
                    // Subida silenciosa (backup automático) - sin UI, con timeout de 60s
                    const ctrl = new AbortController();
                    const timeoutId = setTimeout(() => ctrl.abort(), 60000);
                    try {
                        const resp = await fetch(url, {
                            method,
                            headers: { Authorization: 'Bearer ' + driveToken },
                            body: form,
                            signal: ctrl.signal
                        });
                        clearTimeout(timeoutId);
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        result = await resp.json();
                    } catch(err) {
                        clearTimeout(timeoutId);
                        if (err.name === 'AbortError') throw new Error('Backup automático: timeout (60s)');
                        throw err;
                    }
                }

                if (result.id) {
                    localStorage.setItem('driveLastBackup', new Date().toLocaleString('es-ES'));
                    driveApplyRetention(folderId);   // sin await: no retrasa el mensaje de éxito
                    if (!silent) {
                        updateDriveProgress(100, blob.size, blob.size, '✓ Respaldo completado');
                        hideDriveProgress(900);
                        setTimeout(() => {
                            showAlert(`✅ Respaldo guardado en Google Drive\n📁 Carpeta: ${DRIVE_FOLDER}\n📄 Archivo: ${fileName}`, 'success');
                        }, 950);
                    }
                } else {
                    throw new Error(JSON.stringify(result));
                }
            } catch(e) {
                if (!silent) hideDriveProgress();
                const isAuthErr = (e.status === 401) || (e.message && e.message.includes('401'));
                if (isAuthErr) {
                    driveToken = null; updateDriveUI(false);
                    if (!silent) showAlert('Sesión de Google expirada. Vuelve a conectar.', 'warning');
                } else {
                    if (!silent) showAlert('Error al subir a Drive: ' + e.message, 'error');
                }
            }
        }

        // Modificar updateTotal, etc. (resto del código igual excepto funciones de mejora 6 y 7)
        async function updateTotal() {
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const orders = await getAll('orders');
            const sales = await getAll('sales');
            const gastos = await getAll('gastos');
            const totalOrders = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) > lastCierre).reduce((a,b) => a + (b.val||0), 0);
            const totalSales = sales.filter(v => v.fecha > lastCierre && v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega').reduce((a,b) => a + (b.val||0), 0);
            const totalGastos = gastos.filter(g => g.fecha > lastCierre).reduce((a,b) => a + (b.val||0), 0);
            const total = totalOrders + totalSales - totalGastos;
            document.getElementById('total-cash').innerText = '$' + total.toLocaleString();
            if (!document.getElementById('view-ventas').classList.contains('hidden')) renderMovimientos();
            updateMetaBar();
        }

        function toggleStaMenu(id, e) {
            e.stopPropagation();
            // Cerrar otros menús abiertos
            document.querySelectorAll('[id^="sta-menu-"]').forEach(m => {
                if (m.id !== `sta-menu-${id}`) m.style.display = 'none';
            });
            const menu = document.getElementById(`sta-menu-${id}`);
            if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        function closeStaMenu(id) {
            const menu = document.getElementById(`sta-menu-${id}`);
            if (menu) menu.style.display = 'none';
        }
        // Cerrar menú al tocar fuera
        document.addEventListener('click', () => {
            document.querySelectorAll('[id^="sta-menu-"]').forEach(m => m.style.display = 'none');
        });

        function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
        // Lectura defensiva de businessConfig: nunca crashea aunque el JSON esté corrupto
        function _safeBizConfig() {
            try {
                const raw = localStorage.getItem('businessConfig');
                if (!raw) return {};
                const obj = JSON.parse(raw);
                return (obj && typeof obj === 'object') ? obj : {};
            } catch(e) {
                console.warn('[bizConfig] JSON corrupto, usando defaults:', e);
                return {};
            }
        }
        // Genera IDs únicos incluso cuando hay clicks en el mismo milisegundo
        function _uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }

        let cameraMode = 'recepcion';
        async function openCamera(mode = 'recepcion') {
            cameraMode = mode;
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                const video = document.getElementById('video');
                video.srcObject = stream;
                await video.play();
                document.getElementById('camera-modal').classList.remove('hidden');
            } catch(e) { showAlert("No se pudo acceder a la cámara. Verifica los permisos.", "error"); }
        }
        function closeCamera() {
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            document.getElementById('camera-modal').classList.add('hidden');
            const video = document.getElementById('video');
            video.srcObject = null;
        }
        function closeCameraAndReturn() {
            const modoActual = cameraMode;
            closeCamera();
            if (modoActual === 'entrega') {
                document.getElementById('modal-delivery-photos').classList.remove('hidden');
            } else if (modoActual === 'retomar-recepcion' && _retomarOrdenId) {
                // Volver al visor de fotos de la orden
                openPhotoModal(_retomarOrdenId, 'recepcion');
            }
        }
        async function takePhoto() {
            const video = document.getElementById('video');
            if (!video.videoWidth) return;
            const canvas = document.createElement('canvas');
            const _k = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.round(video.videoWidth * _k);
            canvas.height = Math.round(video.videoHeight * _k);
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.7));

            if (cameraMode === 'retomar-recepcion') {
                // Guardar foto directo en la orden existente sin tocar el formulario
                if (!_retomarOrdenId) { closeCamera(); return; }
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _retomarOrdenId);
                if (!o) { closeCamera(); return; }
                if ((o.fotos || []).length >= 3) {
                    showAlert('Máximo 3 fotos de recepción.', 'warning'); return;
                }
                o.fotos = [...(o.fotos || []), blob];
                await put('orders', o);
                showToast(`✅ Foto agregada (${o.fotos.length}/3)`, 'success');
                if (o.fotos.length >= 3) {
                    closeCamera();
                    await openPhotoModal(_retomarOrdenId, 'recepcion');
                }
            } else if (cameraMode === 'entrega') {
                if (currentDeliveryPhotos.length >= 3) { showAlert("Máximo 3 fotos de entrega.", "warning"); return; }
                currentDeliveryPhotos.push(blob);
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-14 h-14 object-cover rounded-xl border-2 border-emerald-500 shadow-md';
                document.getElementById('delivery-photos-preview').appendChild(img);
                if (currentDeliveryPhotos.length === 3) {
                    closeCamera();
                    document.getElementById('modal-delivery-photos').classList.remove('hidden');
                }
            } else {
                if (currentPhotos.length >= 3) { showAlert("Máximo 3 fotos por orden.", "warning"); return; }
                currentPhotos.push(blob);
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-14 h-14 object-cover rounded-xl border-2 border-orange-500 shadow-md';
                document.getElementById('previews').appendChild(img);
                if (currentPhotos.length === 3) closeCamera();
            }
        }

        // Wrapper con debounce para evitar correr checkClient en cada tecla
        let _checkClientTimer = null;
        function _debouncedCheckClient() {
            if (_checkClientTimer) clearTimeout(_checkClientTimer);
            _checkClientTimer = setTimeout(() => { checkClient(); }, 280);
        }

        async function checkClient() {
            const nom = document.getElementById('c-nom').value.trim().toUpperCase();
            const alertBox = document.getElementById('client-alert');
            const card = document.getElementById('client-info-card');
            if (!nom || nom.length < 3) {
                alertBox.innerText = '';
                if (card) card.classList.add('hidden');
                return;
            }
            try {
                const orders = await getAll('orders');
                const clientOrders = orders.filter(o => o.nom === nom);
                const count = clientOrders.length;

                if (count === 0) {
                    alertBox.innerText = '';
                    if (card) card.classList.add('hidden');
                    return;
                }

                // Calcular saldo pendiente (órdenes no canceladas con saldo > 0)
                const saldoPendiente = clientOrders.reduce((sum, o) => {
                    if (o.sta === 'cancelado' || o.sta === 'no-reparable') return sum;
                    const val = Number(o.val) || 0;
                    const ade = Number(o.adelanto) || 0;
                    const saldo = Math.max(0, val - ade);
                    // Solo contar si no está entregado o si está entregado pero con saldo pendiente
                    return sum + saldo;
                }, 0);

                // Última visita
                const lastOrder = clientOrders.slice().sort((a, b) => (b.fecha || 0) - (a.fecha || 0))[0];
                const diasUltima = lastOrder && lastOrder.fecha ? Math.floor((Date.now() - lastOrder.fecha) / 86400000) : null;

                // Detectar equipos AÚN EN GARANTÍA (cliente podría estar reclamando)
                const now = Date.now();
                const enGarantia = clientOrders.filter(o => {
                    if (o.sta !== 'entregado') return false;
                    if (!o.garantia || o.garantia <= 0) return false;
                    if (!o.fechaEntrega) return false;
                    const expMs = o.fechaEntrega + o.garantia * 86400000;
                    return expMs > now;
                });

                // Limpiar el alert viejo (la tarjeta es mejor)
                alertBox.innerText = '';

                // Poblar la tarjeta
                if (card) {
                    // Avatar con iniciales y color determinístico
                    const nameInitials = nom.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'C';
                    const avatarHues = [12, 35, 145, 200, 260, 320];
                    let hashVal = 0;
                    for (let i = 0; i < nom.length; i++) hashVal = (hashVal + nom.charCodeAt(i)) % avatarHues.length;
                    const hue = avatarHues[hashVal];
                    const avatarEl = document.getElementById('client-info-avatar');
                    if (avatarEl) {
                        avatarEl.style.background = `linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${hue},70%,40%))`;
                        avatarEl.textContent = nameInitials;
                    }

                    // Badge según frecuencia
                    const badgeEl = document.getElementById('client-info-badge');
                    if (badgeEl) {
                        if (count >= 5) badgeEl.innerHTML = '🏆 VIP · ' + count + ' órdenes';
                        else if (count >= 3) badgeEl.innerHTML = '⭐ Frecuente · ' + count + ' órdenes';
                        else badgeEl.innerHTML = '🔄 Recurrente · ' + count + (count === 1 ? ' orden' : ' órdenes');
                    }

                    // Badge de deuda (si aplica)
                    const deudaEl = document.getElementById('client-info-deuda');
                    if (deudaEl) {
                        if (enGarantia.length > 0) {
                            // PRIORIDAD: garantía activa gana sobre deuda (más importante avisar al técnico)
                            const equiposGar = enGarantia.map(o => o.equ).slice(0, 2).join(', ');
                            deudaEl.style.background = 'rgba(16,185,129,0.15)';
                            deudaEl.style.borderColor = 'rgba(16,185,129,0.3)';
                            deudaEl.style.color = '#6ee7b7';
                            deudaEl.textContent = `🛡️ ${enGarantia.length} equipo${enGarantia.length !== 1 ? 's' : ''} en garantía`;
                            deudaEl.title = equiposGar;
                            deudaEl.classList.remove('hidden');
                        } else if (saldoPendiente > 0) {
                            const cur = getCurrency();
                            deudaEl.style.background = 'rgba(251,146,60,0.15)';
                            deudaEl.style.borderColor = 'rgba(251,146,60,0.3)';
                            deudaEl.style.color = '#fdba74';
                            deudaEl.textContent = `💰 Debe ${cur}${saldoPendiente.toLocaleString()}`;
                            deudaEl.title = '';
                            deudaEl.classList.remove('hidden');
                        } else {
                            deudaEl.classList.add('hidden');
                        }
                    }

                    // Stats line (equipos distintos, última visita)
                    const statsEl = document.getElementById('client-info-stats');
                    if (statsEl) {
                        const equiposSet = new Set(clientOrders.map(o => (o.equ || '').trim()).filter(Boolean));
                        let ultimaTxt = '';
                        if (diasUltima !== null) {
                            if (diasUltima === 0) ultimaTxt = 'Hoy';
                            else if (diasUltima === 1) ultimaTxt = 'Ayer';
                            else if (diasUltima < 30) ultimaTxt = `Hace ${diasUltima}d`;
                            else if (diasUltima < 365) ultimaTxt = `Hace ${Math.floor(diasUltima/30)} meses`;
                            else ultimaTxt = `Hace ${Math.floor(diasUltima/365)} año${Math.floor(diasUltima/365) > 1 ? 's' : ''}`;
                        }
                        statsEl.innerHTML = `${equiposSet.size} equipo${equiposSet.size !== 1 ? 's' : ''} · Última: ${ultimaTxt} <span style="color:#64748b;font-weight:600;">· Click para ver historial</span>`;
                    }

                    card.classList.remove('hidden');
                }
            } catch (e) {
                console.warn('[checkClient]', e);
                if (card) card.classList.add('hidden');
            }
        }

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

        async function renderOrders() {
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
            let orders = await getAll('orders');

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
            if (!orders.length) { container.innerHTML = '<div class="text-center py-12 opacity-50">📭 No hay órdenes</div>'; return; }
            // RENDERIZADO PROGRESIVO: primeros 30 items → respuesta inmediata al cambiar de tab
            const ORDERS_INITIAL = 30;
            const firstOrdersBatch = orders.slice(0, ORDERS_INITIAL);
            const remainingOrders  = orders.slice(ORDERS_INITIAL);

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
                const presLabels = { pendiente: '⏳ Presup.', enviado: '📤 Enviado', aprobado: '✅ Aprobado', rechazado: '❌ Rechazado' };
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
                    ? { label: '✅ PAGADO', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' }
                    : adelanto > 0
                        ? { label: `💳 PARCIAL ${pctPagado}%`, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' }
                        : { label: '⏳ PENDIENTE', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)' };

                return `<div class="card order-card-pro" style="position:relative;padding:0;overflow:hidden;border-left:4px solid ${cardAccent};box-shadow:0 4px 12px rgba(0,0,0,0.2),0 0 0 1px ${cardGlow};">
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
                            <p style="font-size:13px;color:#fb923c;font-weight:700;margin:3px 0 0;line-height:1.25;">🔧 ${escapeHtml(o.equ)}</p>
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
                                    <span>${c.icon} ${o.sta}</span><span style="font-size:8px;opacity:0.6;">▼</span>
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
                        <span style="font-size:11px;color:#64748b;font-weight:700;">📅 ${new Date(o.fecha).toLocaleDateString('es-ES', {day:'2-digit',month:'short'})}</span>
                        <span style="font-size:11px;color:${isOverdue ? '#f87171':'#64748b'};font-weight:${isOverdue?'900':'700'};">· 🕒 ${daysInShop}d en taller</span>
                        <span style="font-size:11px;font-weight:800;" class="${staColors[o.sta]||'text-slate-400'}">· ${daysInStatus}d en ${o.sta}</span>
                    </div>
                    ${fechaEstBadge ? `<div style="padding:0 14px 10px;">${fechaEstBadge}</div>` : ''}
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
                            <span style="color:#60a5fa;">💵 Adelanto: ${cur}${adelanto.toLocaleString()}</span>
                            <span style="color:${saldo > 0 ? '#f87171' : '#34d399'};">Saldo: ${cur}${saldo.toLocaleString()}</span>
                        </div>` : ''}
                    </div>

                    <div style="padding:0 14px 10px;display:flex;gap:6px;flex-wrap:wrap;">
                        ${presBadge}
                        <button onclick="openPhotoModal(${o.id})" style="flex:1;min-width:110px;padding:7px 10px;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.2);border-radius:10px;font-size:10px;font-weight:800;color:#cbd5e1;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">📸 ${o.fotos?.length||0} recep.</button>
                        <button onclick="${deliveryPhotoCount > 0 ? `openPhotoModal(${o.id},'entrega')` : `openDeliveryPhotosModal(${o.id})`}" style="flex:1;min-width:110px;padding:7px 10px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);border-radius:10px;font-size:10px;font-weight:800;color:#34d399;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">📷 ${deliveryPhotoCount} entrega</button>
                    </div>
                    ${(o.fotos?.length > 0 && deliveryPhotoCount > 0) ? `<div style="padding:0 14px 10px;"><button onclick="openCompareModal(${o.id})" style="width:100%;padding:8px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:10px;font-size:10px;font-weight:900;color:#c4b5fd;cursor:pointer;letter-spacing:1px;text-transform:uppercase;" class="active:scale-95 transition">🔀 Comparar antes / después</button></div>` : ''}

                    <div style="padding:10px 14px 14px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:flex-end;gap:6px;">
                        <button onclick="openOrderChat(${o.id})" class="order-action-btn bg-cyan-500/15 text-cyan-400" title="Notas internas">📝</button>
                        <button onclick="duplicateOrder(${o.id})" class="order-action-btn bg-violet-500/15 text-violet-400" title="Duplicar orden (mismo cliente)">📋</button>
                        <button onclick="printInvoice(${o.id})" class="order-action-btn bg-amber-500/15 text-amber-400" title="Imprimir">🧾</button>
                        <button onclick="sendWA(${o.id})" class="order-action-btn bg-emerald-500/15 text-emerald-400" title="WhatsApp">💬</button>
                        <button onclick="delOrder(${o.id})" class="order-action-btn bg-rose-500/15 text-rose-400" title="Eliminar">🗑️</button>
                    </div>
                </div>`;
            };

            // Pintar primer batch inmediatamente (el usuario ve algo YA)
            container.innerHTML = firstOrdersBatch.map(renderOrderCard).join('');

            // Si quedan más, pintarlos en segundo paso (UI sigue respondiendo)
            if (remainingOrders.length > 0) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        const fragment = document.createElement('div');
                        fragment.innerHTML = remainingOrders.map(renderOrderCard).join('');
                        while (fragment.firstChild) container.appendChild(fragment.firstChild);
                    }, 0);
                });
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
                        <h2 style="margin:0;font-size:16px;">${business.name || 'TODO REPUESTOS NELSON'}</h2>
                        ${business.nit ? `<p style="margin:2px 0;font-size:11px;">NIT: ${business.nit}</p>` : ''}
                        ${business.address ? `<p style="margin:2px 0;font-size:11px;">${business.address}</p>` : ''}
                        ${business.phone  ? `<p style="margin:2px 0;font-size:11px;">Tel: ${business.phone}</p>` : ''}
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
                    ${o.garantia > 0 ? `<div style="font-size:9px;color:#555;margin:10px 0;padding:8px;border:1px dashed #ccc;border-radius:4px;">⚠️ ${garantiaMsg}</div>` : ''}
                    <div style="text-align:center;font-size:10px;margin-top:16px;color:#666;">${footerMsg}</div>
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
                // Si había adelanto registrado, avisar al usuario
                if (o.adelanto && o.adelanto > 0) {
                    showToast(`⚠️ Hay un adelanto de ${getCurrency()}${o.adelanto.toLocaleString()} que debes devolver al cliente`, 'warning');
                }
            }

            await put('orders', o);

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
                        <input type="number" inputmode="decimal" id="entrega-cobro" placeholder="${cur}${saldoPendiente.toLocaleString()}" value="${saldoPendiente}" style="background:#1e2235;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;color:#fff;font-size:16px;font-weight:900;text-align:center;width:100%;margin-top:6px;">
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
                        <div><p style="color:white;font-weight:900;font-size:14px;">💬 ENVIAR WHATSAPP</p><p style="color:rgba(255,255,255,0.7);font-size:10px;">${escapeHtml(o.nom)} · ${o.tel}</p></div>
                        <button onclick="document.getElementById('modal-wa-pick').remove()" style="color:white;background:rgba(0,0,0,0.3);width:28px;height:28px;border-radius:50%;font-size:14px;">✕</button>
                    </div>
                    <div style="padding:16px;display:flex;flex-direction:column;gap:10px;max-height:72vh;max-height:72dvh;overflow-y:auto;">
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

        // ===== FIX PANTALLA NEGRA AL VOLVER DE WHATSAPP =====
        // ════════════════════════════════════════════════════════════════════════
        // FIX PANTALLA NEGRA AL VOLVER DE WHATSAPP (WebView Android)
        // El WebView de Android a veces se queda con la pantalla "congelada" cuando
        // la app vuelve a primer plano después de saltar a otra app (WhatsApp).
        // Aplicamos varias técnicas de repaint para forzar al WebView a re-pintar.
        // ════════════════════════════════════════════════════════════════════════
        function _forceRepaintAfterWAReturn() {
            try {
                // Técnica 1: scroll micro para forzar repaint
                const sx = window.scrollX, sy = window.scrollY;
                window.scrollTo(sx, sy + 1);
                requestAnimationFrame(() => window.scrollTo(sx, sy));

                // Técnica 2: forzar reflow del root con transform
                const root = document.documentElement;
                root.style.transform = 'translateZ(0)';
                requestAnimationFrame(() => {
                    root.style.transform = '';
                });

                // Técnica 3: forzar repaint del body con visibility
                // (más confiable que display:none en algunos WebView)
                const body = document.body;
                body.style.visibility = 'hidden';
                // Trigger reflow leyendo offsetHeight
                // eslint-disable-next-line no-unused-expressions
                void body.offsetHeight;
                requestAnimationFrame(() => {
                    body.style.visibility = '';
                    // Técnica 4: re-renderizar la vista activa por si quedó incompleta
                    setTimeout(() => {
                        try {
                            const activeView = document.querySelector('.app-view:not(.hidden)');
                            if (activeView) {
                                // Forzar opacity flip — ayuda en WebView problemáticos
                                activeView.style.opacity = '0.999';
                                requestAnimationFrame(() => {
                                    activeView.style.opacity = '';
                                });
                            }
                        } catch(_) {}
                    }, 30);
                });
            } catch(e) { console.warn('[WA repaint]', e); }
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && sessionStorage.getItem('_waJump')) {
                sessionStorage.removeItem('_waJump');
                _forceRepaintAfterWAReturn();
            }
        });
        // También aplicar al volver con el botón Atrás / pageshow
        window.addEventListener('pageshow', (e) => {
            if (e.persisted || sessionStorage.getItem('_waJump')) {
                sessionStorage.removeItem('_waJump');
                _forceRepaintAfterWAReturn();
            }
        });
        // Backup: cualquier vuelta de "background" que dure más de 1 segundo merece repaint
        let _wasHidden = false;
        let _hiddenSince = 0;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                _wasHidden = true;
                _hiddenSince = Date.now();
            } else if (document.visibilityState === 'visible' && _wasHidden) {
                _wasHidden = false;
                // Si estuvo más de 1s en background, forzar repaint también
                // (cubre casos donde _waJump no se setea)
                if (Date.now() - _hiddenSince > 1000) {
                    _forceRepaintAfterWAReturn();
                }
            }
        });
        let _fotoModalOrderId = null;
        let _fotoModalTipo = 'recepcion';

        async function openPhotoModal(id, tipo = 'recepcion') {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            const fotos = tipo === 'entrega' ? o?.fotosEntrega : o?.fotos;
            if (!fotos?.length) return showAlert(`Esta orden no tiene fotos de ${tipo === 'entrega' ? 'entrega' : 'recepción'} registradas.`, "info");

            _fotoModalOrderId = id;
            _fotoModalTipo = tipo;

            const color = tipo === 'entrega' ? 'text-emerald-400' : 'text-orange-500';
            const icon  = tipo === 'entrega' ? '📷' : '📸';
            const label = tipo === 'entrega' ? 'ENTREGA' : 'RECEPCIÓN';
            document.getElementById('modal-fotos-title').className = `font-black mb-3 text-center text-xl ${color}`;
            document.getElementById('modal-fotos-title').innerText = `${icon} ${label} · ${escapeHtml(o.equ)} (${fotos.length})`;

            // Botón retomar: color según tipo
            const btnRetomar = document.getElementById('btn-retomar-fotos');
            if (tipo === 'entrega') {
                btnRetomar.className = 'flex-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition';
                btnRetomar.innerHTML = '📷 RETOMAR FOTOS';
            } else {
                btnRetomar.className = 'flex-1 bg-orange-600/20 border border-orange-500/40 text-orange-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition';
                btnRetomar.innerHTML = '📸 RETOMAR FOTOS';
            }

            const container = document.getElementById('modal-fotos-container');
            container.innerHTML = '';

            fotos.forEach((blob, idx) => {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:relative;';
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-full rounded-2xl shadow-xl';
                img.style.border = tipo === 'entrega' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.2)';
                // Botón borrar foto individual
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '🗑️';
                delBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:rgba(220,38,38,0.85);-webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);';
                delBtn.title = 'Borrar esta foto';
                delBtn.onclick = () => borrarFotoIndividual(idx);
                wrapper.appendChild(img);
                wrapper.appendChild(delBtn);
                container.appendChild(wrapper);
            });

            document.getElementById('modal-fotos').classList.remove('hidden');
        }

        function closePhotoModal() {
            document.getElementById('modal-fotos').classList.add('hidden');
            document.getElementById('modal-fotos-container').innerHTML = '';
            _fotoModalOrderId = null;
        }

        async function borrarFotoIndividual(idx) {
            if (!_fotoModalOrderId) return;
            showConfirm('¿Borrar esta foto?', async () => {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _fotoModalOrderId);
                if (!o) return;
                if (_fotoModalTipo === 'entrega') {
                    o.fotosEntrega = (o.fotosEntrega || []).filter((_, i) => i !== idx);
                } else {
                    o.fotos = (o.fotos || []).filter((_, i) => i !== idx);
                }
                await put('orders', o);
                showToast('Foto borrada', 'success');
                const fotos = _fotoModalTipo === 'entrega' ? o.fotosEntrega : o.fotos;
                if (!fotos.length) {
                    closePhotoModal();
                    await renderOrders();
                } else {
                    await openPhotoModal(_fotoModalOrderId, _fotoModalTipo);
                }
            });
        }

        async function borrarTodasFotos() {
            if (!_fotoModalOrderId) return;
            const label = _fotoModalTipo === 'entrega' ? 'entrega' : 'recepción';
            showConfirm(`¿Borrar TODAS las fotos de ${label}?`, async () => {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _fotoModalOrderId);
                if (!o) return;
                if (_fotoModalTipo === 'entrega') o.fotosEntrega = [];
                else o.fotos = [];
                await put('orders', o);
                closePhotoModal();
                await renderOrders();
                showToast(`Fotos de ${label} borradas`, 'success');
            });
        }

        let _retomarOrdenId = null;

        async function retomarFotos() {
            if (!_fotoModalOrderId) return;
            const id = _fotoModalOrderId;
            const tipo = _fotoModalTipo;
            closePhotoModal();
            if (tipo === 'entrega') {
                await openDeliveryPhotosModal(id);
            } else {
                // Abrir cámara y guardar foto directo en la orden existente (sin ir a pestaña taller)
                _retomarOrdenId = id;
                cameraMode = 'retomar-recepcion';
                if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    const video = document.getElementById('video');
                    video.srcObject = stream;
                    await video.play();
                    document.getElementById('camera-modal').classList.remove('hidden');
                    showToast('Captura la nueva foto de recepción', 'info');
                } catch(e) {
                    showAlert('No se pudo acceder a la cámara. Verifica los permisos.', 'error');
                }
            }
        }

        async function saveGasto() {
            const det = document.getElementById('g-det').value.trim().toUpperCase();
            const val = parseInt(document.getElementById('g-val').value);
            if(!det || isNaN(val) || val <= 0) return showAlert("Ingresa un motivo y un valor válido.", "warning");
            await put('gastos', { id: _uid(), det, val, fecha: Date.now() });
            document.getElementById('g-det').value = ''; document.getElementById('g-val').value = '';
            await updateTotal();
            await renderMovimientos();
            showToast(`Gasto ${getCurrency()}${val.toLocaleString()} registrado`, 'success');
        }

        async function renderMovimientos() {
            const cur = getCurrency();
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const sales = await getAll('sales');
            const gastos = await getAll('gastos');
            const movs = [...sales.filter(s=>s.fecha>lastCierre && s.tipo!=='adelanto' && s.tipo!=='cobro_entrega').map(s=>({...s,type:'sale'})), ...gastos.filter(g=>g.fecha>lastCierre).map(g=>({...g,type:'gasto'}))].sort((a,b)=>b.fecha-a.fecha);
            const container = document.getElementById('movimientos-history');
            if(!movs.length) { container.innerHTML = '<div class="text-center py-4 text-slate-500 text-xs">Sin movimientos en la caja actual</div>'; return; }
            container.innerHTML = movs.map(m => m.type==='sale' ? `<div class="flex justify-between bg-emerald-500/10 p-2 rounded-xl"><div><p class="text-xs font-bold">+ ${escapeHtml(m.item)}</p><p class="text-[9px]">${m.qty} unid</p></div><div class="flex gap-2"><p class="text-xs font-black text-emerald-400">+${cur}${m.val.toLocaleString()}</p><button onclick="annulSale(${m.id})" class="text-rose-400 text-[10px] bg-rose-500/20 px-2 py-1 rounded-lg">✕</button></div></div>` : `<div class="flex justify-between bg-rose-500/10 p-2 rounded-xl"><div><p class="text-xs font-bold">- ${escapeHtml(m.det)}</p><p class="text-[9px]">Gasto</p></div><div class="flex gap-2"><p class="text-xs font-black text-rose-400">-${cur}${m.val.toLocaleString()}</p><button onclick="annulGasto(${m.id})" class="text-rose-400 text-[10px] bg-rose-500/20 px-2 py-1 rounded-lg">✕</button></div></div>`).join('');
        }
        async function annulGasto(id) { showConfirm("¿Eliminar este gasto?", async () => { await del('gastos', id); await updateTotal(); }); }

