/* Nelson App Pro · js/modules/28-config-recordatorios-busqueda.js
   Recordatorios, documentos, red y busqueda global
   (extraido sin cambios de index.html; el orden de carga importa) */
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

