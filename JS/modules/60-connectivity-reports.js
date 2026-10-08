/* NelsonApp — 60-connectivity-reports.js
 * Recordatorios, conectividad, búsqueda y reportes
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== RECORDATORIOS ====================
        function saveReminderConfig() {
            localStorage.setItem('reminderCierreHora', document.getElementById('config-cierre-hora').value);
            localStorage.setItem('reminderSinMovDias', document.getElementById('config-sin-mov').value);
            const srEl = document.getElementById('config-sin-recoger');
            if (srEl && srEl.value) localStorage.setItem('diasSinRecoger', srEl.value);
            setupReminderChecks();
            showToast('Recordatorios guardados', 'success');
        }
        function loadReminderConfig() {
            const h = document.getElementById('config-cierre-hora'); if (h) h.value = localStorage.getItem('reminderCierreHora') || '';
            const d = document.getElementById('config-sin-mov');     if (d) d.value = localStorage.getItem('reminderSinMovDias') || '';
            const sr = document.getElementById('config-sin-recoger'); if (sr) sr.value = localStorage.getItem('diasSinRecoger') || '7';
        }
        let _reminderIntervalId = null;
        function setupReminderChecks() {
            if (_reminderIntervalId) { clearInterval(_reminderIntervalId); _reminderIntervalId = null; }
            const cierreHora = localStorage.getItem('reminderCierreHora');
            if (cierreHora) {
                _reminderIntervalId = setInterval(() => {
                    const now  = new Date();
                    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                    if (hhmm === cierreHora) showToast('⏰ Recordatorio: Hacer cierre de caja', 'warning');
                }, 60000);
            }
        }
        async function checkSinMovimiento() {
            const dias = parseInt(localStorage.getItem('reminderSinMovDias')) || 0;
            if (dias) {
                const orders = await getAll('orders');
                const cutoff = Date.now() - (dias * 86400000);
                const stuck  = orders.filter(o => o.sta !== 'entregado' && o.fecha < cutoff);
                if (stuck.length) showToast(`⚠️ ${stuck.length} orden(es) sin movimiento en ${dias}+ días`, 'warning');
            }
            // Avisar equipos reparados sin recoger
            const diasRec = parseInt(localStorage.getItem('diasSinRecoger')) || 0;
            if (diasRec) {
                const orders = await getAll('orders');
                const cutoffRec = Date.now() - (diasRec * 86400000);
                const sinRec = orders.filter(o =>
                    o.sta === 'reparado' && o.fechaEstado && o.fechaEstado < cutoffRec
                );
                if (sinRec.length) {
                    const noms = sinRec.slice(0,3).map(o => o.nom).join(', ');
                    showToast(`⏰ ${sinRec.length} equipo(s) listo(s) sin recoger hace ${diasRec}+ días: ${noms}`, 'warning');
                }
            }
        }

        // ==================== DOCUMENTOS CONFIG ====================
        function saveDocumentConfig() {
            localStorage.setItem('facturaFotos', document.getElementById('config-factura-fotos').checked);
            localStorage.setItem('garantiaMsg',  document.getElementById('config-garantia-msg').value);
            showToast('Configuración de documentos guardada', 'success');
        }
        function loadDocumentConfig() {
            const ff = document.getElementById('config-factura-fotos');
            if (ff) ff.checked = localStorage.getItem('facturaFotos') !== 'false';
            const gm = document.getElementById('config-garantia-msg');
            if (gm) gm.value = localStorage.getItem('garantiaMsg') || '';
        }

        // ==================== NUMERACIÓN DE ÓRDENES ====================
        function saveOrderNumConfig() {
            const start  = parseInt(document.getElementById('config-order-start').value) || 1;
            const prefix = document.getElementById('config-order-prefix').value || '#';
            const reset  = document.getElementById('config-order-reset-year').checked;
            const cfg = _safeBizConfig();
            cfg.orderPrefix = prefix;
            localStorage.setItem('businessConfig', JSON.stringify(cfg));
            localStorage.setItem('orderNumStart', start);
            localStorage.setItem('orderResetYear', reset);
            showToast('Configuración de numeración guardada', 'success');
        }
        function loadOrderNumConfig() {
            const s = document.getElementById('config-order-start');       if (s) s.value   = localStorage.getItem('orderNumStart') || '1';
            const p = document.getElementById('config-order-prefix');      if (p) p.value   = _safeBizConfig().orderPrefix || '#';
            const r = document.getElementById('config-order-reset-year');  if (r) r.checked = localStorage.getItem('orderResetYear') === 'true';
        }

        // ==================== SECCIONES COLAPSABLES CONFIG ====================
        function toggleCfg(id, header) {
            const body = document.getElementById(id);
            if (!body) return;
            const isOpen = body.classList.contains('open');
            document.querySelectorAll('.cfg-body').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.cfg-header').forEach(h => h.classList.remove('open'));
            if (!isOpen) {
                body.classList.add('open');
                header.classList.add('open');
                setTimeout(() => body.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
        }

        function iosCfgToggle(id, rowEl) {
            const body = document.getElementById(id);
            if (!body) return;
            const chevron = rowEl.querySelector('.ios-chevron');
            const isOpen = body.classList.contains('open');
            document.querySelectorAll('#modal-config .ios-body').forEach(b => {
                b.classList.remove('open');
                b.style.maxHeight = '0';
                b.style.opacity = '0';
            });
            document.querySelectorAll('#modal-config .ios-chevron').forEach(c => c.classList.remove('open'));
            if (!isOpen) {
                body.classList.add('open');
                body.style.maxHeight = body.scrollHeight + 300 + 'px';
                body.style.opacity = '1';
                if (chevron) chevron.classList.add('open');
                setTimeout(() => body.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
            }
        }

        // ==================== BADGE OFFLINE / ONLINE ====================
        let _netBadgeTimer = null;
        let _netCheckPending = false;

        function showNetBadge(online) {
            const badge = document.getElementById('net-badge');
            if (!badge) return;
            if (_netBadgeTimer) clearTimeout(_netBadgeTimer);
            badge.className = `show ${online ? 'online' : 'offline'}`;
            badge.innerText = online ? '✅ Conexión restaurada' : '📵 Sin conexión — modo offline';
            if (online) {
                _netBadgeTimer = setTimeout(() => badge.classList.remove('show'), 3000);
            }
        }

        // Verifica con ping REAL antes de mostrar como offline
        // Esto evita falsos "sin conexión" cuando navigator.onLine reporta mal (bug común en WebView Android)
        async function _checkAndShowNetBadge(isOnlineEvent) {
            if (_netCheckPending) return;
            _netCheckPending = true;
            try {
                if (isOnlineEvent) {
                    // Sistema dice que volvió la conexión — verificar con ping
                    const real = await _verifyRealConnection();
                    if (real) showNetBadge(true);
                    // Si el ping falló, no mostrar nada (dejar que el siguiente evento lo resuelva)
                } else {
                    // Sistema dice que se fue la conexión — verificar con ping antes de alarmar al usuario
                    const real = await _verifyRealConnection();
                    if (!real) {
                        showNetBadge(false);
                    } else {
                        // Falso positivo del sistema — sí hay internet
                        console.log('[netbadge] navigator.onLine=false pero ping exitoso, ignorando');
                    }
                }
            } finally {
                _netCheckPending = false;
            }
        }

        window.addEventListener('offline', () => _checkAndShowNetBadge(false));
        window.addEventListener('online',  () => {
            _checkAndShowNetBadge(true);
            // Al volver online: si hay token y auto-backup configurado, disparar un backup silencioso
            try {
                const hours = parseInt(localStorage.getItem('backupIntervalHours')) || 0;
                if (hours > 0 && driveToken && typeof driveBackupNow === 'function') {
                    setTimeout(() => driveBackupNow(true), 2000);
                }
            } catch(e) { console.warn('Reintento backup online falló:', e); }
            // Pedir al SW que refresque caché de CDNs si hay cambios
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                try { navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' }); } catch(e){}
            }
        });
        // Al iniciar, verificar de verdad (no confiar solo en navigator.onLine)
        setTimeout(() => {
            if (!navigator.onLine) {
                _checkAndShowNetBadge(false);
            } else {
                // Verificar silenciosamente por si hay falso positivo
                _verifyRealConnection();
            }
        }, 2500);
        // Re-verificar solo cuando el estado podría ser inconsistente:
        // - Si el badge muestra "offline" (verificar si volvió la conexión)
        // - Si navigator.onLine dice false (verificar con ping, puede ser falso positivo)
        // Evita hacer pings innecesarios cuando todo está normal (~1440 pings menos al día)
        setInterval(() => {
            const badge = document.getElementById('net-badge');
            const showingOffline = badge && badge.classList.contains('offline') && badge.classList.contains('show');
            const systemSaysOffline = !navigator.onLine;
            // Solo pingar si hay indicio de problema
            if (!showingOffline && !systemSaysOffline) return;
            _verifyRealConnection().then(real => {
                if (!badge) return;
                // Si el badge muestra offline pero el ping dice online → restaurar
                if (real && showingOffline) {
                    showNetBadge(true);
                }
                // Si el sistema dice offline y el ping también → mostrar si no está visible
                else if (!real && !badge.classList.contains('show')) {
                    showNetBadge(false);
                }
            });
        }, 60000);

        // ==================== BÚSQUEDA GLOBAL ====================
        let _gsrDebounce = null;
        async function globalSearch(q) {
            const box = document.getElementById('global-search-results');
            q = (q || '').trim().toUpperCase();
            if (q.length < 2) { box.classList.remove('open'); return; }

            clearTimeout(_gsrDebounce);
            _gsrDebounce = setTimeout(async () => {
                const [orders, stock, clientes] = await Promise.all([
                    getAll('orders'), getAll('stock'), getAll('clientes')
                ]);
                const cur = getCurrency();
                const results = [];

                // Órdenes
                orders.filter(o =>
                    (o.nom||'').toUpperCase().includes(q) ||
                    (o.equ||'').toUpperCase().includes(q) ||
                    (o.det||'').toUpperCase().includes(q) ||
                    (o.tel||'').includes(q) ||
                    formatOrderNum(o.orderNum||0).includes(q)
                ).slice(0,5).forEach(o => {
                    const staEmoji = {recibido:'📥',revisión:'🔍',reparado:'✅',entregado:'📦'}[o.sta]||'📋';
                    results.push({
                        tipo:'orden', icon: staEmoji,
                        titulo: `${formatOrderNum(o.orderNum||0)} · ${o.nom}`,
                        sub: `${o.equ} — ${cur}${(o.val||0).toLocaleString()}`,
                        action: () => { tab('ordenes'); document.getElementById('global-search-input').value=''; box.classList.remove('open'); }
                    });
                });

                // Stock
                stock.filter(s =>
                    (s.n||'').toUpperCase().includes(q) ||
                    (s.code||'').toUpperCase().includes(q) ||
                    (s.cat||'').toUpperCase().includes(q)
                ).slice(0,4).forEach(s => {
                    results.push({
                        tipo:'stock', icon:'🔩',
                        titulo: s.n,
                        sub: `Stock: ${s.q||0} uds · ${cur}${(s.p||0).toLocaleString()}`,
                        action: () => { tab('ventas'); document.getElementById('global-search-input').value=''; box.classList.remove('open'); }
                    });
                });

                // Clientes
                clientes.filter(c => (c.nombre||'').toUpperCase().includes(q))
                .slice(0,3).forEach(c => {
                    results.push({
                        tipo:'cliente', icon:'👤',
                        titulo: c.nombre,
                        sub: `Deuda: ${cur}${(c.deuda||0).toLocaleString()}`,
                        action: () => { showClientHistory(c.nombre); document.getElementById('global-search-input').value=''; box.classList.remove('open'); }
                    });
                });

                if (!results.length) {
                    box.innerHTML = `<div class="gsr-item text-center text-slate-500 text-xs py-4">Sin resultados para "${escapeHtml(q)}"</div>`;
                } else {
                    box.innerHTML = results.map((r,i) => `
                        <div class="gsr-item" onclick="_gsrItems[${i}].action()">
                            <div class="flex items-center gap-2">
                                <span style="font-size:16px;">${r.icon}</span>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-1">
                                        <span class="gsr-tag ${r.tipo}">${r.tipo}</span>
                                        <span class="text-xs font-bold text-white truncate">${escapeHtml(r.titulo)}</span>
                                    </div>
                                    <p class="text-[10px] text-slate-400 truncate">${escapeHtml(r.sub)}</p>
                                </div>
                            </div>
                        </div>`).join('');
                    window._gsrItems = results;
                }
                box.classList.add('open');
            }, 220);
        }

        // Cerrar búsqueda al tocar fuera
        document.addEventListener('click', e => {
            if (!document.getElementById('global-search-bar')?.contains(e.target)) {
                document.getElementById('global-search-results')?.classList.remove('open');
            }
        });

        // ==================== REPORTE POR TÉCNICO ====================
        let _tecReportMode = 'mes';

        async function openTecnicosReport() {
            document.getElementById('modal-tecnicos-report').classList.remove('hidden');
            await loadTecnicosReport('mes');
        }
        function closeTecnicosReport() {
            document.getElementById('modal-tecnicos-report').classList.add('hidden');
        }

        async function loadTecnicosReport(mode) {
            _tecReportMode = mode;
            ['mes','todo'].forEach(m => {
                document.getElementById(`tec-tab-${m}`)?.classList.toggle('active', m === mode);
            });

            const orders = await getAll('orders');
            const cur = getCurrency();
            const now = new Date();
            const startMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            const filtered = mode === 'mes'
                ? orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega||o.fecha) >= startMes)
                : orders.filter(o => o.sta === 'entregado');

            document.getElementById('tec-report-period').innerText =
                mode === 'mes' ? `${now.toLocaleString('es-ES',{month:'long',year:'numeric'})}` : 'Todo el tiempo';

            // Agrupar por técnico
            const tecMap = {};
            filtered.forEach(o => {
                const tec = o.tecnico || '(Sin asignar)';
                if (!tecMap[tec]) tecMap[tec] = { ordenes:[], valor:0 };
                tecMap[tec].ordenes.push(o);
                tecMap[tec].valor += (o.val||0);
            });

            const stats = Object.entries(tecMap).map(([tec, data]) => {
                const dias = data.ordenes
                    .filter(o => o.fechaEntrega && o.fecha)
                    .map(o => Math.round((o.fechaEntrega - o.fecha) / 86400000));
                const promDias = dias.length ? Math.round(dias.reduce((a,b)=>a+b,0)/dias.length) : 0;
                const minDias  = dias.length ? Math.min(...dias) : 0;
                const maxDias  = dias.length ? Math.max(...dias) : 0;
                return { tec, total: data.ordenes.length, valor: data.valor, promDias, minDias, maxDias };
            }).sort((a,b) => b.total - a.total);

            const maxVal = Math.max(...stats.map(s => s.valor), 1);
            const container = document.getElementById('tecnicos-report-content');

            if (!stats.length) {
                container.innerHTML = '<p class="text-center text-slate-500 text-sm py-10">Sin órdenes entregadas en este período.</p>';
                return;
            }

            container.innerHTML = stats.map(s => `
                <div class="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-black text-white text-sm">👷 ${escapeHtml(s.tec)}</span>
                        <span class="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-bold">${s.total} órdenes</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] text-slate-400 w-16 flex-shrink-0">Ingresos</span>
                        <div class="bar-track">
                            <div class="bar-fill bg-gradient-to-r from-emerald-600 to-emerald-400" style="width:${Math.round(s.valor/maxVal*100)}%"></div>
                        </div>
                        <span class="text-[10px] font-black text-emerald-400 w-20 text-right">${cur}${s.valor.toLocaleString()}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-2">
                        <div class="text-center bg-white/5 rounded-xl p-2">
                            <p class="text-[9px] text-slate-500 font-bold">PROM. DÍAS</p>
                            <p class="text-base font-black text-blue-400">${s.promDias}d</p>
                        </div>
                        <div class="text-center bg-white/5 rounded-xl p-2">
                            <p class="text-[9px] text-slate-500 font-bold">MÁS RÁPIDO</p>
                            <p class="text-base font-black text-emerald-400">${s.minDias}d</p>
                        </div>
                        <div class="text-center bg-white/5 rounded-xl p-2">
                            <p class="text-[9px] text-slate-500 font-bold">MÁS LENTO</p>
                            <p class="text-base font-black text-amber-400">${s.maxDias}d</p>
                        </div>
                    </div>
                    <div class="mt-2 text-[10px] text-slate-500 text-right">Ticket prom: <span class="font-bold text-slate-300">${cur}${s.total ? Math.round(s.valor/s.total).toLocaleString() : 0}</span></div>
                </div>`).join('');
        }

        // ==================== REPORTE EQUIPOS MÁS REPARADOS ====================
        let _equReportMode = 'equipo';

        async function openEquiposReport() {
            document.getElementById('modal-equipos-report').classList.remove('hidden');
            await loadEquiposReport('equipo');
        }
        function closeEquiposReport() {
            document.getElementById('modal-equipos-report').classList.add('hidden');
        }

        async function loadEquiposReport(mode) {
            _equReportMode = mode;
            ['equipo','falla','valor'].forEach(m => {
                document.getElementById(`equ-tab-${m}`)?.classList.toggle('active', m === mode);
            });

            const orders = await getAll('orders');
            const cur = getCurrency();
            const container = document.getElementById('equipos-report-content');

            if (mode === 'equipo') {
                // Top equipos por frecuencia
                const equMap = {};
                orders.forEach(o => {
                    const key = (o.equ||'DESCONOCIDO').trim().toUpperCase();
                    if (!equMap[key]) equMap[key] = { total:0, entregados:0, valor:0 };
                    equMap[key].total++;
                    if (o.sta === 'entregado') { equMap[key].entregados++; equMap[key].valor += (o.val||0); }
                });
                const sorted = Object.entries(equMap).sort((a,b) => b[1].total - a[1].total).slice(0,15);
                const maxTotal = Math.max(...sorted.map(s => s[1].total), 1);

                container.innerHTML = sorted.length ? sorted.map(([equ, d], i) => `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3">
                        <span class="text-amber-400 font-black text-base w-6 text-center">${i+1}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-black text-white truncate">${escapeHtml(equ)}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="bar-track" style="max-width:100px;">
                                    <div class="bar-fill bg-gradient-to-r from-amber-600 to-amber-400" style="width:${Math.round(d.total/maxTotal*100)}%"></div>
                                </div>
                                <span class="text-[10px] text-slate-400">${d.total} reparaciones</span>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-[10px] font-black text-emerald-400">${cur}${d.valor.toLocaleString()}</p>
                            <p class="text-[9px] text-slate-500">${d.entregados} entregados</p>
                        </div>
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-10">Sin datos aún.</p>';

            } else if (mode === 'falla') {
                // ── Top fallas/diagnósticos frecuentes (normalizado) ──
                // 1) Quitar acentos y puntuación
                // 2) Filtrar textos que parecen mensajes al cliente (no fallas)
                // 3) Extraer la "raíz" de la falla: primeras 2-3 palabras significativas
                // 4) Agrupar por esa raíz y mostrar la versión más común como etiqueta

                // Palabras que indican que el texto es un aviso/mensaje, NO una falla
                const MENSAJE_HINTS = [
                    'HOLA','AMIGO','BUENAS','BUENOS','SEÑOR','SEÑORA','SRA','SR','DON','DOÑA',
                    'YA SU','SU EQUIPO','SU LAVADORA','SU NEVERA','SU LICUADORA','LISTO PUEDE','PUEDES PASAR',
                    'PUEDE PASAR','PUEDE RECOGER','FAVOR DE','LE INFORMO','LE AVISO','LE COMENTO',
                    'TE INFORMO','TE AVISO','TE COMENTO','GRACIAS','SALUDOS','CONFIRMADO'
                ];

                // Palabras sueltas que no son fallas útiles (artículos, preposiciones, verbos genéricos al inicio)
                const STOPWORDS = new Set([
                    'EL','LA','LOS','LAS','UN','UNA','UNOS','UNAS','DE','DEL','EN','CON','POR','PARA',
                    'SE','LE','LES','ME','TE','NOS','SU','SUS','MI','MIS','TU','TUS','QUE','Y','O','A',
                    'AL','ES','ESTA','ESTE','ESTO','ESA','ESE','ESO','HAY','HA','HAN','HUBO','FUE',
                    'SON','ERA','ERAN','PUDO','PUEDE','PUEDO','VOY','VAMOS','LISTA','LISTO','PASAR'
                ]);

                const normalizar = (s) => {
                    return (s||'')
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quitar acentos
                        .replace(/[.,;:¡!¿?()\-–—_"'“”]/g, ' ')              // quitar puntuación
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toUpperCase();
                };

                const esMensaje = (txt) => {
                    return MENSAJE_HINTS.some(h => txt.includes(h));
                };

                const extraerRaiz = (txt) => {
                    // Tomar hasta 3 primeras palabras significativas (no stopwords)
                    const palabras = txt.split(' ').filter(w => w && !STOPWORDS.has(w));
                    return palabras.slice(0, 3).join(' ');
                };

                const falMap = {}; // raíz -> { count, labels: {textoCompleto: count} }
                orders.forEach(o => {
                    const original = (o.det||'').trim();
                    const norm = normalizar(original);
                    // Filtros de limpieza
                    if (norm.length < 4) return;
                    if (esMensaje(norm)) return;
                    if (norm.split(' ').length < 1) return;
                    // Si el texto original es muy largo (>60 chars), probablemente es una nota/mensaje
                    if (original.length > 60) return;

                    const raiz = extraerRaiz(norm);
                    if (!raiz || raiz.length < 3) return;

                    if (!falMap[raiz]) falMap[raiz] = { count: 0, labels: {} };
                    falMap[raiz].count++;
                    // Guardar la forma original (con acentos y mayúsculas originales) para mostrar la más común
                    const labelKey = normalizar(original); // normalizado para agrupar variantes
                    falMap[raiz].labels[labelKey] = (falMap[raiz].labels[labelKey] || 0) + 1;
                });

                // Elegir la etiqueta más frecuente de cada raíz como texto a mostrar
                const items = Object.entries(falMap).map(([raiz, d]) => {
                    const topLabel = Object.entries(d.labels).sort((a,b) => b[1]-a[1])[0][0];
                    return { label: topLabel, count: d.count };
                });

                const sorted = items.sort((a,b) => b.count - a.count).slice(0,12);
                const maxN = Math.max(...sorted.map(s => s.count), 1);

                container.innerHTML = sorted.length ? sorted.map((it, i) => `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3">
                        <span class="text-rose-400 font-black text-sm w-5 text-center">${i+1}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] font-bold text-white" style="word-break:break-word;">${escapeHtml(it.label)}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="bar-track" style="max-width:80px;">
                                    <div class="bar-fill bg-gradient-to-r from-rose-600 to-rose-400" style="width:${Math.round(it.count/maxN*100)}%"></div>
                                </div>
                                <span class="text-[10px] text-slate-400">${it.count} ${it.count === 1 ? 'vez' : 'veces'}</span>
                            </div>
                        </div>
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-10">Sin diagnósticos registrados.</p>';

            } else if (mode === 'valor') {
                // Top equipos por valor generado
                const valMap = {};
                orders.filter(o => o.sta === 'entregado').forEach(o => {
                    const key = (o.equ||'DESCONOCIDO').trim().toUpperCase();
                    if (!valMap[key]) valMap[key] = { valor:0, total:0 };
                    valMap[key].valor += (o.val||0);
                    valMap[key].total++;
                });
                const sorted = Object.entries(valMap).sort((a,b) => b[1].valor - a[1].valor).slice(0,12);
                const maxVal2 = Math.max(...sorted.map(s=>s[1].valor),1);

                container.innerHTML = sorted.length ? sorted.map(([equ,d],i) => `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3">
                        <span class="text-emerald-400 font-black text-sm w-5 text-center">${i+1}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] font-black text-white truncate">${escapeHtml(equ)}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="bar-track" style="max-width:100px;">
                                    <div class="bar-fill bg-gradient-to-r from-emerald-600 to-emerald-400" style="width:${Math.round(d.valor/maxVal2*100)}%"></div>
                                </div>
                                <span class="text-[10px] text-emerald-400 font-bold">${cur}${d.valor.toLocaleString()}</span>
                            </div>
                        </div>
                        <span class="text-[10px] text-slate-500 flex-shrink-0">${d.total} órd.</span>
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-10">Sin datos aún.</p>';
            }
        }

        // ==================== BLOQUE 3: AUTO-TEMA POR HORARIO ====================
        let _autoThemeInterval = null;

        function saveAutoThemeConfig() {
            const enabled = document.getElementById('auto-theme-toggle')?.checked;
            const dayH    = parseInt(document.getElementById('auto-theme-day')?.value)  || 7;
            const nightH  = parseInt(document.getElementById('auto-theme-night')?.value) || 19;
            localStorage.setItem('autoTheme', JSON.stringify({ enabled, dayH, nightH }));
            const hoursEl = document.getElementById('auto-theme-hours');
            if (hoursEl) hoursEl.classList.toggle('hidden', !enabled);
            if (enabled) applyAutoTheme();
        }

        function loadAutoThemeConfig() {
            const cfg = JSON.parse(localStorage.getItem('autoTheme') || '{}');
            const toggle = document.getElementById('auto-theme-toggle');
            const dayI   = document.getElementById('auto-theme-day');
            const nightI = document.getElementById('auto-theme-night');
            const hoursEl= document.getElementById('auto-theme-hours');
            if (toggle)  toggle.checked = !!cfg.enabled;
            if (dayI)    dayI.value     = cfg.dayH   ?? 7;
            if (nightI)  nightI.value   = cfg.nightH ?? 19;
            if (hoursEl) hoursEl.classList.toggle('hidden', !cfg.enabled);
        }

        function applyAutoTheme() {
            const cfg = JSON.parse(localStorage.getItem('autoTheme') || '{}');
            if (!cfg.enabled) return;
            const h      = new Date().getHours();
            const isDay  = h >= (cfg.dayH ?? 7) && h < (cfg.nightH ?? 19);
            const body   = document.body;
            const wasLight = body.classList.contains('light-mode');
            if (isDay && !wasLight) {
                body.classList.add('light-mode');
                body.classList.remove('dark-mode');
                ['theme-btn','sidebar-theme-btn','desktop-theme-btn'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = id.includes('sidebar') ? '☀️ Tema' : '☀️';
                });
                localStorage.setItem('appTheme', 'light');
            } else if (!isDay && wasLight) {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                ['theme-btn','sidebar-theme-btn','desktop-theme-btn'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = id.includes('sidebar') ? '🌙 Tema' : '🌙';
                });
                localStorage.setItem('appTheme', 'dark');
            }
        }

        function startAutoThemeWatcher() {
            if (_autoThemeInterval) clearInterval(_autoThemeInterval);
            applyAutoTheme();
            // Revisar cada minuto
            _autoThemeInterval = setInterval(applyAutoTheme, 60000);
        }

        // ==================== BLOQUE 3: NOTIFICACIONES PUSH ====================
        function requestPushPermission() {
            if (!('Notification' in window)) return;
            // Solo pedir permiso si ya no está concedido ni denegado
            if (Notification.permission === 'default') {
                // Pedir con delay para no interrumpir la carga
                setTimeout(() => {
                    Notification.requestPermission().then(p => {
                        if (p === 'granted') showToast('🔔 Notificaciones activadas', 'success');
                    });
                }, 4000);
            }
        }

        function sendPushNotification(title, body, tag = 'nelsonapp') {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;
            try {
                new Notification(title, {
                    body,
                    tag,
                    icon: './icons/icon-192x192.png',
                    badge: './icons/icon-192x192.png',
                    silent: false
                });
            } catch(e) { console.warn('Push notification error:', e); }
        }

        // Notificaciones automáticas: órdenes vencidas + stock bajo
        async function checkAndNotifyOverdue() {
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
            const orders = await getAll('orders');
            const now    = Date.now();
            const vencidas = orders.filter(o =>
                o.sta !== 'entregado' && o.fechaEstimada &&
                new Date(o.fechaEstimada + 'T23:59:59').getTime() < now
            );
            if (vencidas.length > 0) {
                sendPushNotification(
                    '⚠️ Órdenes vencidas — NelsonApp',
                    `${vencidas.length} orden${vencidas.length > 1 ? 'es' : ''} superó su fecha de entrega`,
                    'overdue'
                );
            }
        }

        async function checkAndNotifyLowStock() {
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
            const stock     = await getAll('stock');
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            const bajos     = stock.filter(s => s.q !== undefined && Number(s.q) <= (s.minStock || threshold));
            if (bajos.length > 0) {
                sendPushNotification(
                    '📦 Stock bajo — NelsonApp',
                    `${bajos.length} repuesto${bajos.length > 1 ? 's' : ''} con stock crítico`,
                    'lowstock'
                );
            }
        }

        // Agendar notificaciones diarias al abrir la app
        (function scheduleNotifications() {
            setTimeout(async () => {
                await checkAndNotifyOverdue();
                await checkAndNotifyLowStock();
            }, 6000);
        })();

        // ==================== BLOQUE 3: MÓDULO PROVEEDORES ====================
        async function openProveedoresModal() {
            await renderProveedoresList();
            document.getElementById('modal-proveedores').classList.remove('hidden');
        }

        function closeProveedoresModal() {
            document.getElementById('modal-proveedores').classList.add('hidden');
        }

        async function renderProveedoresList() {
            const provs = await getAll('proveedores');
            const list  = document.getElementById('proveedores-list');
            const stars = n => '⭐'.repeat(Number(n) || 5);
            if (!provs.length) {
                list.innerHTML = '<p class="text-center text-slate-500 text-sm py-10">Sin proveedores registrados aún.<br>Toca "+ AGREGAR" para empezar.</p>';
                return;
            }
            list.innerHTML = provs.sort((a,b) => (b.rating||5)-(a.rating||5)).map(p => `
                <div class="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1 min-w-0">
                            <p class="font-black text-white text-sm truncate">${escapeHtml(p.nombre)}</p>
                            <p class="text-[10px] text-teal-400 font-bold">${stars(p.rating)}</p>
                        </div>
                        <div class="flex gap-1 flex-shrink-0 ml-2">
                            ${p.tel ? `<button onclick="window.open('https://wa.me/57${p.tel.replace(/\\D/g,'')}','_blank')" class="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 w-8 h-8 rounded-xl text-sm active:scale-95 transition" title="WhatsApp">💬</button>` : ''}
                            <button onclick="openProveedorForm(${p.id})" class="bg-blue-600/20 border border-blue-500/30 text-blue-400 w-8 h-8 rounded-xl text-sm active:scale-95 transition">✏️</button>
                            <button onclick="deleteProveedor(${p.id})" class="bg-rose-600/20 border border-rose-500/30 text-rose-400 w-8 h-8 rounded-xl text-sm active:scale-95 transition">🗑️</button>
                        </div>
                    </div>
                    ${p.ciudad ? `<p class="text-[10px] text-slate-500">📍 ${escapeHtml(p.ciudad)}</p>` : ''}
                    ${p.catalogo ? `<p class="text-[10px] text-slate-400 mt-1">📦 ${escapeHtml(p.catalogo)}</p>` : ''}
                    ${p.tiempo ? `<p class="text-[10px] text-amber-400 font-bold mt-1">⏱ Entrega: ${p.tiempo} día${p.tiempo>1?'s':''}</p>` : ''}
                    ${p.notas ? `<p class="text-[10px] text-slate-500 mt-1 italic">${escapeHtml(p.notas)}</p>` : ''}
                </div>`).join('');
        }

        async function openProveedorForm(id) {
            const fields = ['prov-id','prov-nombre','prov-tel','prov-ciudad','prov-catalogo','prov-tiempo','prov-notas'];
            fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
            document.getElementById('prov-rating').value = '5';
            document.getElementById('prov-form-title').innerText = id ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR';
            if (id) {
                const p = await getOne('proveedores', id);
                if (p) {
                    document.getElementById('prov-id').value       = p.id;
                    document.getElementById('prov-nombre').value   = p.nombre || '';
                    document.getElementById('prov-tel').value      = p.tel    || '';
                    document.getElementById('prov-ciudad').value   = p.ciudad || '';
                    document.getElementById('prov-catalogo').value = p.catalogo || '';
                    document.getElementById('prov-tiempo').value   = p.tiempo || '';
                    document.getElementById('prov-rating').value   = p.rating || 5;
                    document.getElementById('prov-notas').value    = p.notas  || '';
                }
            }
            document.getElementById('modal-proveedor-form').classList.remove('hidden');
        }

        function closeProveedorForm() {
            document.getElementById('modal-proveedor-form').classList.add('hidden');
        }

        async function saveProveedor() {
            const nombre = document.getElementById('prov-nombre').value.trim().toUpperCase();
            if (!nombre) return showAlert('El nombre del proveedor es obligatorio.', 'warning');
            const idVal = document.getElementById('prov-id').value;
            const prov = {
                id:       idVal ? Number(idVal) : Date.now(),
                nombre,
                tel:      document.getElementById('prov-tel').value.trim(),
                ciudad:   document.getElementById('prov-ciudad').value.trim(),
                catalogo: document.getElementById('prov-catalogo').value.trim(),
                tiempo:   parseInt(document.getElementById('prov-tiempo').value) || 0,
                rating:   parseInt(document.getElementById('prov-rating').value) || 5,
                notas:    document.getElementById('prov-notas').value.trim(),
                updatedAt: Date.now()
            };
            await put('proveedores', prov);
            closeProveedorForm();
            await renderProveedoresList();
            showToast(idVal ? 'Proveedor actualizado ✅' : 'Proveedor guardado ✅', 'success');
        }

        async function deleteProveedor(id) {
            showConfirm('¿Eliminar este proveedor?', async () => {
                await del('proveedores', id);
                await renderProveedoresList();
                showToast('Proveedor eliminado', 'info');
            });
        }

