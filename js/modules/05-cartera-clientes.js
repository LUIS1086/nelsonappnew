/* Nelson App Pro · js/modules/05-cartera-clientes.js
   Deudas, pagos, cartera e historial de clientes
   (extraido sin cambios de index.html; el orden de carga importa) */
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

