/* Nelson App Pro · js/modules/21-config-acciones-seguridad.js
   Acciones de config, colores, PIN, bloqueo y movimientos
   (extraido sin cambios de index.html; el orden de carga importa) */
        // Wrappers para acciones rápidas (reutilizan funciones existentes)
        function cfgBackupNow() {
            const token = (typeof driveToken !== 'undefined' && driveToken) || sessionStorage.getItem('driveToken');
            if (!token) {
                showAlert('Primero conecta tu cuenta de Google Drive desde la sección "Datos y respaldo".', 'warning');
                return;
            }
            if (typeof driveBackupNow === 'function') driveBackupNow(false);
        }
        function cfgExportData() {
            if (typeof exportData === 'function') exportData();
        }
        function cfgImportData() {
            const inp = document.getElementById('import-file');
            if (inp) inp.click();
        }
        function cfgDriveToggle() {
            const token = (typeof driveToken !== 'undefined' && driveToken) || sessionStorage.getItem('driveToken');
            if (token) {
                if (typeof driveSignOut === 'function') driveSignOut();
            } else {
                if (typeof driveSignIn === 'function') driveSignIn();
            }
            setTimeout(() => { updateConfigDriveRow(); updateConfigStats(); updateConfigBadges(); updateConfigHealth(); }, 600);
        }
        function cfgDriveRestore() {
            if (typeof driveRestore === 'function') driveRestore();
        }

        // Almacenamiento — calcula tamaño por store
        async function cfgRefreshStorage() {
            const wrap = document.getElementById('cfg-storage-bars');
            const totalEl = document.getElementById('cfg-storage-total');
            if (!wrap) return;
            wrap.innerHTML = '<p style="font-size:11px;color:#6b7280;text-align:center;padding:8px;">Calculando...</p>';
            try {
                const storesList = [
                    ['orders', '📋 Órdenes', '#f97316'],
                    ['stock', '📦 Inventario', '#0a84ff'],
                    ['sales', '💰 Ventas', '#10b981'],
                    ['clientes', '👥 Clientes', '#bf5af2'],
                    ['gastos', '💸 Gastos', '#f43f5e'],
                    ['stockHistory', '📜 Hist. stock', '#64748b']
                ];
                const sizes = [];
                let grand = 0;
                for (const [key, lbl, color] of storesList) {
                    const items = await getAll(key).catch(() => []);
                    const bytes = new Blob([JSON.stringify(items || [])]).size;
                    grand += bytes;
                    sizes.push({ key, lbl, color, bytes, count: items.length });
                }
                const maxBytes = Math.max(...sizes.map(s => s.bytes), 1);
                wrap.innerHTML = sizes.map(s => {
                    const pct = Math.max(3, Math.round((s.bytes / maxBytes) * 100));
                    const kb = s.bytes < 1024 ? s.bytes + ' B' : (s.bytes / 1024).toFixed(1) + ' KB';
                    return `
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-size:11.5px;color:#e5e7eb;font-weight:600;">${s.lbl}</span>
                                <span style="font-size:10.5px;color:#8e8e93;font-weight:700;">${s.count} · ${kb}</span>
                            </div>
                            <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:${s.color};border-radius:999px;transition:width 0.5s ease;"></div>
                            </div>
                        </div>`;
                }).join('');
                if (totalEl) totalEl.textContent = (grand / 1024).toFixed(1) + ' KB';
            } catch(e) {
                wrap.innerHTML = '<p style="font-size:11px;color:#f43f5e;text-align:center;">Error al calcular</p>';
            }
        }

        // Mantenimiento — compactar stockHistory viejo
        async function cfgPurgeStockHistory() {
            try {
                const hist = await getAll('stockHistory');
                if (!hist || hist.length === 0) {
                    showAlert('No hay historial de stock para compactar.', 'info');
                    return;
                }
                const cutoff = Date.now() - (180 * 24 * 60 * 60 * 1000); // 6 meses
                const old = hist.filter(h => {
                    const t = new Date(h.fecha || h.date || h.timestamp || 0).getTime();
                    return t > 0 && t < cutoff;
                });
                if (old.length === 0) {
                    showAlert('No hay movimientos de más de 6 meses.', 'info');
                    return;
                }
                showAlert(`¿Eliminar ${old.length} movimientos de stock de más de 6 meses?\n\nEsta acción no se puede deshacer.`, 'warning', async () => {
                    try {
                        for (const h of old) await del('stockHistory', h.id);
                        showToast(`${old.length} movimientos compactados`, 'success');
                        cfgRefreshStorage();
                        updateConfigStats();
                    } catch(e) { showAlert('Error al compactar: ' + e.message, 'error'); }
                });
            } catch(e) { showAlert('Error: ' + e.message, 'error'); }
        }

        // Mantenimiento — purgar clientes huérfanos
        async function cfgPurgeOrphans() {
            try {
                const [clientes, orders, sales] = await Promise.all([
                    getAll('clientes').catch(() => []),
                    getAll('orders').catch(() => []),
                    getAll('sales').catch(() => [])
                ]);
                const activeNames = new Set();
                orders.forEach(o => { if (o.cliente) activeNames.add(String(o.cliente).trim().toLowerCase()); });
                sales.forEach(s => { if (s.cliente) activeNames.add(String(s.cliente).trim().toLowerCase()); });
                const orphans = clientes.filter(c => !activeNames.has(String(c.nombre || '').trim().toLowerCase()));
                if (orphans.length === 0) {
                    showAlert('No hay clientes huérfanos. Todos tienen órdenes o ventas.', 'info');
                    return;
                }
                showAlert(`¿Eliminar ${orphans.length} clientes sin órdenes ni ventas?\n\nEsta acción no se puede deshacer.`, 'warning', async () => {
                    try {
                        for (const c of orphans) await del('clientes', c.nombre);
                        showToast(`${orphans.length} clientes limpiados`, 'success');
                        updateConfigStats();
                    } catch(e) { showAlert('Error al limpiar: ' + e.message, 'error'); }
                });
            } catch(e) { showAlert('Error: ' + e.message, 'error'); }
        }

        // ═══ CONFIG PRO — Live refresh wrappers ═══
        // Se ejecuta después de que TODAS las funciones originales están definidas.
        // Monkeypatchea savers para refrescar badges/salud en vivo, y iosCfgToggle
        // para auto-cargar Almacenamiento la primera vez que se abre.
        window.addEventListener('load', function() {
            // Helper: refresca UI del modal si está abierto
            function cfgLiveRefresh() {
                const modal = document.getElementById('modal-config');
                if (!modal || modal.classList.contains('hidden')) return;
                try {
                    updateConfigBadges();
                    updateConfigHealth();
                    updateConfigHeader();
                } catch(e) {}
            }

            // Lista de savers que disparan refresh (solo si existen)
            const saverNames = [
                'setAccentColor', 'setTallerBtnColor', 'toggleHighContrast', 'setFontSize',
                'saveBusinessConfig', 'saveRegionalConfig', 'saveSoundConfig',
                'saveWarrantyAlertConfig', 'saveAutoLockConfig', 'saveMaxAttemptsConfig',
                'saveWhatsappTemplates', 'addTecnico', 'removeTecnico',
                'saveMetaConfig', 'saveReminderConfig', 'saveDocumentConfig',
                'saveOrderNumConfig', 'saveLowStockThreshold', 'saveAutoThemeConfig'
            ];
            saverNames.forEach(name => {
                const orig = window[name];
                if (typeof orig !== 'function') return;
                window[name] = function() {
                    const ret = orig.apply(this, arguments);
                    // Post-save refresh (pequeño delay para que el localStorage termine)
                    setTimeout(cfgLiveRefresh, 50);
                    return ret;
                };
            });

            // Monkeypatch iosCfgToggle: auto-carga Almacenamiento la 1ª vez
            const origToggle = window.iosCfgToggle;
            if (typeof origToggle === 'function') {
                window.iosCfgToggle = function(id, rowEl) {
                    const ret = origToggle.apply(this, arguments);
                    if (id === 'cfg-storage') {
                        const body = document.getElementById('cfg-storage');
                        if (body && body.classList.contains('open') && !body.dataset.cfgLoaded) {
                            body.dataset.cfgLoaded = '1';
                            setTimeout(() => { try { cfgRefreshStorage(); } catch(e) {} }, 150);
                        }
                    }
                    if (id === 'cfg-about') {
                        // Refrescar acerca de cada vez (online/offline puede cambiar)
                        const body = document.getElementById('cfg-about');
                        if (body && body.classList.contains('open')) {
                            setTimeout(() => { try { updateConfigAbout(); } catch(e) {} }, 80);
                        }
                    }
                    return ret;
                };
            }
        });

        // ==================== SPLASH SCREEN ====================
        (function initSplash() {
            const bizConfig = localStorage.getItem('businessConfig');
            if (bizConfig) {
                try {
                    const cfg = JSON.parse(bizConfig);
                    if (cfg.name) document.getElementById('splash-biz-name').innerText = cfg.name;
                    if (cfg.shortName) {
                        const el = document.getElementById('splash-pin-bizname');
                        if (el) el.innerText = cfg.shortName;
                    }
                } catch(e) {}
            }
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                splash.classList.add('fade-out');
                setTimeout(() => {
                    splash.style.display = 'none';
                    showPinModal();
                }, 600);
            }, 1800);
        })();

        // ==================== NUMPAD PIN ====================
        const PIN_MAX = 6;
        const PIN_MIN = 4;

        function updatePinOkState() {
            const okBtn = document.querySelector('.numpad-btn.enter');
            if (!okBtn) return;
            if (pinBuffer.length >= PIN_MIN) {
                okBtn.classList.remove('disabled');
            } else {
                okBtn.classList.add('disabled');
            }
        }

        function pinPad(val) {
            const dots = document.querySelectorAll('#pin-dots .pin-dot');
            if (val === 'del') {
                pinBuffer = pinBuffer.slice(0, -1);
                if (navigator.vibrate) { try { navigator.vibrate(15); } catch(_) {} }
            } else if (val === 'ok') {
                if (pinBuffer.length < PIN_MIN) return; // no hacer nada si está "disabled"
                document.getElementById('pin-input').value = pinBuffer;
                verifyPinConBloqueo();
                return;
            } else {
                if (pinBuffer.length >= PIN_MAX) return;
                pinBuffer += String(val);
                if (navigator.vibrate) { try { navigator.vibrate(12); } catch(_) {} }
                if (pinBuffer.length === 4) {
                    setTimeout(() => {
                        document.getElementById('pin-input').value = pinBuffer;
                        verifyPinConBloqueo();
                    }, 200);
                }
            }
            dots.forEach((dot, i) => {
                dot.classList.toggle('filled', i < pinBuffer.length);
            });
            updatePinOkState();
            document.getElementById('pin-error').innerText = '';
        }

        // ==================== COLOR DE ACENTO ====================
        function setAccentColor(name, primary, dark) {
            localStorage.setItem('appAccentColor', name);
            localStorage.setItem('appAccentPrimary', primary);
            localStorage.setItem('appAccentDark', dark);
            applyAccentColor();
            document.querySelectorAll('#accent-color-btns button').forEach(btn => {
                btn.style.borderColor = btn.dataset.color === name ? '#fff' : 'transparent';
                btn.style.transform = btn.dataset.color === name ? 'scale(1.2)' : 'scale(1)';
            });
            showToast('Color de acento actualizado', 'success');
        }
        function applyAccentColor() {
            const primary = localStorage.getItem('appAccentPrimary') || '#f97316';
            const dark    = localStorage.getItem('appAccentDark')    || '#ea580c';
            const root = document.documentElement;
            root.style.setProperty('--accent', primary);
            root.style.setProperty('--accent-dark', dark);
            let style = document.getElementById('accent-override');
            if (!style) { style = document.createElement('style'); style.id = 'accent-override'; document.head.appendChild(style); }
            style.textContent = `
                .bg-orange-600, .bg-gradient-to-r.from-orange-600 { background-color: ${primary} !important; }
                .from-orange-600 { --tw-gradient-from: ${primary} !important; }
                .to-orange-500   { --tw-gradient-to: ${dark} !important; }
                .text-orange-500, .text-orange-400 { color: ${primary} !important; }
                .border-orange-500\\/40, .border-orange-500\\/20 { border-color: ${primary}66 !important; }
                .bg-orange-500\\/20, .bg-orange-600\\/20, .bg-orange-600\\/30 { background-color: ${primary}33 !important; }
                .tab-active { color: ${primary} !important; }
                .camera-btn { background: linear-gradient(135deg, ${primary}, ${dark}) !important; box-shadow: 0 8px 20px ${primary}4d !important; }
                input:focus, textarea:focus, select:focus { border-color: ${primary} !important; box-shadow: 0 0 0 3px ${primary}33 !important; }
            `;
        }

        // ==================== COLOR BOTÓN "REGISTRAR ENTRADA" (TALLER) ====================
        function setTallerBtnColor(name, primary, dark, light) {
            localStorage.setItem('tallerBtnColorName', name);
            localStorage.setItem('tallerBtnPrimary', primary);
            localStorage.setItem('tallerBtnDark', dark);
            localStorage.setItem('tallerBtnLight', light);
            applyTallerBtnColor();
            document.querySelectorAll('#taller-btn-color-btns button').forEach(btn => {
                btn.style.borderColor = btn.dataset.color === name ? '#fff' : 'transparent';
                btn.style.transform = btn.dataset.color === name ? 'scale(1.2)' : 'scale(1)';
            });
            showToast('Color del botón actualizado', 'success');
        }
        function applyTallerBtnColor() {
            const primary = localStorage.getItem('tallerBtnPrimary') || '#f97316';
            const dark    = localStorage.getItem('tallerBtnDark')    || '#ea580c';
            const light   = localStorage.getItem('tallerBtnLight')   || '#fb923c';
            const root = document.documentElement;
            root.style.setProperty('--taller-btn-primary', primary);
            root.style.setProperty('--taller-btn-dark', dark);
            root.style.setProperty('--taller-btn-light', light);
            // Convierte el primary hex a rgba para el shadow
            const hex = primary.replace('#','');
            const r = parseInt(hex.substring(0,2),16);
            const g = parseInt(hex.substring(2,4),16);
            const b = parseInt(hex.substring(4,6),16);
            root.style.setProperty('--taller-btn-shadow', `rgba(${r},${g},${b},0.35)`);
            // Marca el botón activo en la paleta de configuración
            const activeName = localStorage.getItem('tallerBtnColorName') || 'orange';
            document.querySelectorAll('#taller-btn-color-btns button').forEach(btn => {
                btn.style.borderColor = btn.dataset.color === activeName ? '#fff' : 'transparent';
                btn.style.transform = btn.dataset.color === activeName ? 'scale(1.2)' : 'scale(1)';
            });
        }

        // ==================== LOGO ====================
        function previewLogo(input) {
            if (!input.files || !input.files[0]) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target.result;
                localStorage.setItem('businessLogo', data);
                const el = document.getElementById('logo-preview');
                if (el) el.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;">`;
                showToast('Logo guardado', 'success');
            };
            reader.readAsDataURL(input.files[0]);
        }

        // ==================== REGIONAL ====================
        function saveRegionalConfig() {
            localStorage.setItem('appCurrency', document.getElementById('config-currency').value);
            localStorage.setItem('appDateFormat', document.getElementById('config-date-format').value);
            showToast('Configuración regional guardada', 'success');
        }
        function getCurrency() { return localStorage.getItem('appCurrency') || '$'; }

        // ==================== SONIDO ====================
        function saveSoundConfig() {
            localStorage.setItem('appSound', document.getElementById('config-sound').checked);
        }
        function playBeep() {
            if (localStorage.getItem('appSound') !== 'true') return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 880; osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
            } catch(e) {}
        }

        // ==================== ALERTA GARANTÍAS ====================
        function saveWarrantyAlertConfig() {
            localStorage.setItem('warrantyAlert', document.getElementById('config-warranty-alert').checked);
            localStorage.setItem('warrantyAlertDays', document.getElementById('config-warranty-days').value || '3');
            showToast('Configuración de garantías guardada', 'success');
        }
        async function checkWarrantyAlerts() {
            if (localStorage.getItem('warrantyAlert') !== 'true') return;
            const days = parseInt(localStorage.getItem('warrantyAlertDays')) || 3;
            const orders = await getAll('orders');
            const now = Date.now();
            const soon = orders.filter(o => {
                if (o.sta === 'entregado' || !o.garantia) return false;
                const expiry = o.fecha + (o.garantia * 86400000);
                const diff = (expiry - now) / 86400000;
                return diff >= 0 && diff <= days;
            });
            if (soon.length) showToast(`⏰ ${soon.length} garantía(s) vencen en ${days} días`, 'warning');
        }

        // ==================== BLOQUEO AUTOMÁTICO ====================
        let _lockTimer = null;
        let _pinAttempts = 0;
        let _lockUntil = 0;

        function saveAutoLockConfig() {
            localStorage.setItem('autoLockMinutes', document.getElementById('config-auto-lock').value);
            resetLockTimer();
            showToast('Bloqueo automático guardado', 'success');
        }
        function saveMaxAttemptsConfig() {
            localStorage.setItem('maxPinAttempts', document.getElementById('config-max-attempts').value);
            showToast('Configuración de intentos guardada', 'success');
        }
        function resetLockTimer() {
            const mins = parseInt(localStorage.getItem('autoLockMinutes')) || 0;
            if (_lockTimer) clearTimeout(_lockTimer);
            if (mins > 0) {
                _lockTimer = setTimeout(() => {
                    pinBuffer = '';
                    document.querySelectorAll('#pin-dots .pin-dot').forEach(d => d.classList.remove('filled'));
                    document.getElementById('pin-input').value = '';
                    document.getElementById('pin-error').innerText = '';
                    showPinModal();
                    document.getElementById('app-header').classList.add('hidden');
                    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
                    showToast('Sesión bloqueada por inactividad', 'warning');
                }, mins * 60000);
            }
        }
        document.addEventListener('touchstart', resetLockTimer, { passive: true });
        document.addEventListener('click', resetLockTimer);

        // Extender verifyPin con bloqueo por intentos (sin sobreescribir)
        async function verifyPinConBloqueo() {
            const maxAttempts = parseInt(localStorage.getItem('maxPinAttempts')) || 0;
            if (maxAttempts > 0 && Date.now() < _lockUntil) {
                const secs = Math.ceil((_lockUntil - Date.now()) / 1000);
                document.getElementById('pin-error').innerText = `🔒 Bloqueado. Espera ${secs}s`;
                pinBuffer = '';
                document.querySelectorAll('#pin-dots .pin-dot').forEach(d => d.classList.remove('filled'));
                return;
            }
            const input     = document.getElementById('pin-input').value;
            const inputHash = await _hashPin(input);
            if (inputHash !== _pinHash) {
                _pinAttempts++;
                if (maxAttempts > 0 && _pinAttempts >= maxAttempts) {
                    _lockUntil = Date.now() + 30000;
                    _pinAttempts = 0;
                    document.getElementById('pin-error').innerText = '🔒 Bloqueado 30 segundos';
                    pinBuffer = '';
                    document.querySelectorAll('#pin-dots .pin-dot').forEach(d => d.classList.remove('filled'));
                    return;
                }
            } else {
                _pinAttempts = 0;
                resetLockTimer();
            }
            await verifyPin();
        }

        function fmtMoney(val) {
            const cur = getCurrency();
            return cur + val.toLocaleString('es-CO');
        }

        // ==================== MOVIMIENTOS COMPLETOS ====================
        let _allMovimientos = [];
        let _movScope = 'actual'; // 'actual' o 'historico'

        async function openMovimientosCompletos() {
            _movScope = 'actual';
            _updateMovScopeUI();
            await _loadMovimientosByScope();
            document.getElementById('mov-filter-from').value = '';
            document.getElementById('mov-filter-to').value = '';
            renderMovimientosFull(_allMovimientos);
            document.getElementById('modal-movimientos').classList.remove('hidden');
        }

        function _updateMovScopeUI() {
            const tabActual = document.getElementById('mov-tab-actual');
            const tabHistorico = document.getElementById('mov-tab-historico');
            const hint = document.getElementById('mov-scope-hint');
            if (!tabActual || !tabHistorico) return;
            if (_movScope === 'actual') {
                tabActual.style.background = 'linear-gradient(135deg,#0e7490,#06b6d4)';
                tabActual.style.color = '#fff';
                tabActual.style.boxShadow = '0 2px 6px rgba(6,182,212,0.3)';
                tabHistorico.style.background = 'transparent';
                tabHistorico.style.color = '#94a3b8';
                tabHistorico.style.boxShadow = 'none';
                if (hint) hint.textContent = 'Movimientos desde el último cierre de caja';
            } else {
                tabHistorico.style.background = 'linear-gradient(135deg,#7c3aed,#a855f7)';
                tabHistorico.style.color = '#fff';
                tabHistorico.style.boxShadow = '0 2px 6px rgba(168,85,247,0.3)';
                tabActual.style.background = 'transparent';
                tabActual.style.color = '#94a3b8';
                tabActual.style.boxShadow = 'none';
                if (hint) hint.textContent = 'Todos los movimientos · usa el filtro de fechas para acotar';
            }
        }

        async function setMovScope(scope) {
            if (_movScope === scope) return;
            _movScope = scope;
            _updateMovScopeUI();
            await _loadMovimientosByScope();
            // Re-aplicar filtros de fecha si los hay
            filterMovimientos();
        }

        async function _loadMovimientosByScope() {
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const sales  = await getAll('sales');
            const gastos = await getAll('gastos');
            const orders = await getAll('orders');
            // Si el scope es "actual", filtramos por > lastCierre. Si es "histórico", traemos TODO.
            const passes = (ts) => _movScope === 'historico' ? true : (ts > lastCierre);
            const movSales   = sales.filter(s => passes(s.fecha) && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega').map(s => ({ ...s, type: 'sale',    fecha: s.fecha }));
            const movGastos  = gastos.filter(g => passes(g.fecha)).map(g => ({ ...g, type: 'gasto',   fecha: g.fecha }));
            const movOrders  = orders.filter(o => o.sta === 'entregado' && passes(o.fechaEntrega || o.fecha))
                                     .map(o => ({ ...o, type: 'repair', fecha: o.fechaEntrega || o.fecha }));
            _allMovimientos = [...movSales, ...movGastos, ...movOrders].sort((a,b) => b.fecha - a.fecha);
            const totalIng = movSales.reduce((a,b) => a + (b.val||0), 0) + movOrders.reduce((a,b) => a + (b.val||0), 0);
            const totalGas = movGastos.reduce((a,b) => a + (b.val||0), 0);
            document.getElementById('mov-total-ing').innerText = fmtMoney(totalIng);
            document.getElementById('mov-total-gas').innerText = fmtMoney(totalGas);
            const net = totalIng - totalGas;
            const netEl = document.getElementById('mov-total-net');
            netEl.innerText = fmtMoney(net);
            netEl.className = `font-black text-base ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
            const periodLabel = _movScope === 'actual' ? 'Caja actual' : 'Histórico';
            document.getElementById('mov-periodo').innerText = `${periodLabel} — ${_allMovimientos.length} movimientos`;
        }

        function filterMovimientos() {
            const from = document.getElementById('mov-filter-from').value;
            const to   = document.getElementById('mov-filter-to').value;
            let filtered = _allMovimientos;
            // FIX: las fechas del <input type="date"> llegan como "2026-04-23"
            // y new Date("2026-04-23") las interpreta como UTC, lo que causa desfases
            // de 5 horas en Colombia. Construimos la fecha en zona horaria LOCAL.
            const parseLocalDate = (str, endOfDay) => {
                if (!str) return null;
                const [y, m, d] = str.split('-').map(Number);
                if (!y || !m || !d) return null;
                return endOfDay
                    ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
                    : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
            };
            const fromTs = parseLocalDate(from, false);
            const toTs   = parseLocalDate(to, true);
            if (fromTs !== null) filtered = filtered.filter(m => m.fecha >= fromTs);
            if (toTs   !== null) filtered = filtered.filter(m => m.fecha <= toTs);
            renderMovimientosFull(filtered);
            // Recalcular totales del rango filtrado para que coincidan con lo visible
            const fIng = filtered.filter(m => m.type === 'sale' || m.type === 'repair').reduce((a,b) => a + (b.val||0), 0);
            const fGas = filtered.filter(m => m.type === 'gasto').reduce((a,b) => a + (b.val||0), 0);
            const ingEl = document.getElementById('mov-total-ing');
            const gasEl = document.getElementById('mov-total-gas');
            const netEl = document.getElementById('mov-total-net');
            if (ingEl) ingEl.innerText = fmtMoney(fIng);
            if (gasEl) gasEl.innerText = fmtMoney(fGas);
            if (netEl) {
                const net = fIng - fGas;
                netEl.innerText = fmtMoney(net);
                netEl.className = `font-black text-base ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
            }
        }
