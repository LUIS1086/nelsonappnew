/* NelsonApp — 40-settings.js
 * Configuración, preferencias, movimientos y bloqueo
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== NUEVAS FUNCIONES DE CONFIGURACIÓN (ya existentes) ====================
        function applyFontSize() {
            const size = localStorage.getItem('appFontSize') || 'normal';
            const html = document.documentElement;
            html.classList.remove('font-small', 'font-normal', 'font-large');
            html.classList.add(`font-${size}`);
        }
        function setFontSize(level) {
            localStorage.setItem('appFontSize', level);
            applyFontSize();
            showToast(`Tamaño de letra: ${level}`, 'success');
        }
        function toggleHighContrast() {
            const enabled = document.getElementById('high-contrast-toggle').checked;
            if (enabled) document.body.classList.add('high-contrast');
            else document.body.classList.remove('high-contrast');
            localStorage.setItem('highContrast', enabled);
        }
        function applyHighContrast() {
            const saved = localStorage.getItem('highContrast') === 'true';
            document.getElementById('high-contrast-toggle').checked = saved;
            if (saved) document.body.classList.add('high-contrast');
            else document.body.classList.remove('high-contrast');
        }
        function saveBusinessConfig() {
            const logoData = localStorage.getItem('businessLogo') || '';
            const config = {
                name: document.getElementById('config-business-name').value,
                shortName: document.getElementById('config-business-short').value,
                phone: document.getElementById('config-business-phone').value,
                address: document.getElementById('config-business-address').value,
                nit: document.getElementById('config-business-nit').value,
                footer: document.getElementById('config-business-footer').value,
                orderPrefix: document.getElementById('config-order-prefix').value
            };
            localStorage.setItem('businessConfig', JSON.stringify(config));
            document.getElementById('business-short-name').innerText = config.shortName || 'TODO REPUESTOS';
            document.getElementById('business-name-display').innerHTML = config.name || 'NELSON';
            showToast('Datos del negocio guardados', 'success');
        }
        function loadBusinessConfig() {
            const config = _safeBizConfig();
            if (Object.keys(config).length > 0) {
                document.getElementById('config-business-name').value = config.name || '';
                document.getElementById('config-business-short').value = config.shortName || '';
                document.getElementById('config-business-phone').value = config.phone || '';
                document.getElementById('config-business-address').value = config.address || '';
                document.getElementById('config-business-nit').value = config.nit || '';
                document.getElementById('config-business-footer').value = config.footer || '';
                document.getElementById('config-order-prefix').value = config.orderPrefix || '';
                document.getElementById('business-short-name').innerText = config.shortName || 'TODO REPUESTOS';
                document.getElementById('business-name-display').innerHTML = config.name || 'NELSON';
            }
            const logo = localStorage.getItem('businessLogo');
            if (logo) {
                const el = document.getElementById('logo-preview');
                if (el) el.innerHTML = `<img src="${logo}" style="width:100%;height:100%;object-fit:cover;">`;
            }
        }
        function saveLowStockThreshold() {
            const val = parseInt(document.getElementById('config-low-stock').value);
            if (val >= 1) {
                localStorage.setItem('lowStockThreshold', val);
                showToast(`Umbral de stock bajo: ${val} unidades`, 'success');
            } else showAlert('Ingresa un número mayor a 0', 'warning');
        }
        function loadLowStockThreshold() {
            const saved = localStorage.getItem('lowStockThreshold');
            document.getElementById('config-low-stock').value = saved || '3';
        }
        function loadBackupInterval() {
            const saved = localStorage.getItem('backupIntervalHours');
            document.getElementById('config-backup-interval').value = saved || '24';
        }
        function resetTutorial() {
            localStorage.removeItem('tutorialShown');
            showAlert('Tutorial restablecido. Al próximo inicio de sesión se mostrará el mensaje de bienvenida.', 'info');
        }
        function factoryReset() {
            showConfirm('⚠️ ¿BORRAR TODOS LOS DATOS? Esta acción es irreversible.', async () => {
                await clearStore('orders');
                await clearStore('stock');
                await clearStore('sales');
                await clearStore('gastos');
                await clearStore('clientes');
                await clearStore('payments');
                await clearStore('config');
                await clearStore('stockHistory');
                await clearStore('orderChat');
                await clearStore('paymentPlans');
                await clearStore('calificaciones');
                await clearStore('proveedores');
                await put('config', { key: 'orderCounter', value: 0 });
                showAlert('Todos los datos han sido eliminados. La aplicación se recargará.', 'success', () => location.reload());
            });
        }
        function checkUpdate() {
            showAlert(`Actualmente estás en la versión estable ${window.APP_VERSION}. Para actualizar, descarga el nuevo archivo desde tu proveedor.`, 'info');
        }
        function openAdvancedConfig() {
            loadBusinessConfig();
            loadLowStockThreshold();
            loadBackupInterval();
            applyHighContrast();
            loadWhatsappTemplates();
            renderTecnicosList();
            loadMetaConfig();
            loadReminderConfig();
            loadDocumentConfig();
            loadOrderNumConfig();
            loadAutoThemeConfig();
            const currency = localStorage.getItem('appCurrency') || '$';
            const dateFormat = localStorage.getItem('appDateFormat') || 'DD/MM/YYYY';
            document.getElementById('config-currency').value = currency;
            document.getElementById('config-date-format').value = dateFormat;
            document.getElementById('config-sound').checked = localStorage.getItem('appSound') === 'true';
            document.getElementById('config-warranty-alert').checked = localStorage.getItem('warrantyAlert') === 'true';
            document.getElementById('config-warranty-days').value = localStorage.getItem('warrantyAlertDays') || '3';
            document.getElementById('config-auto-lock').value = localStorage.getItem('autoLockMinutes') || '0';
            document.getElementById('config-max-attempts').value = localStorage.getItem('maxPinAttempts') || '0';
            const accent = localStorage.getItem('appAccentColor') || 'orange';
            document.querySelectorAll('#accent-color-btns button').forEach(btn => {
                btn.style.borderColor = btn.dataset.color === accent ? '#fff' : 'transparent';
                btn.style.transform = btn.dataset.color === accent ? 'scale(1.2)' : 'scale(1)';
            });
            document.getElementById('modal-config').classList.remove('hidden');
            // ── Nuevas llamadas del rediseño Pro ──
            try {
                updateConfigHeader();
                updateConfigStats();
                updateConfigBadges();
                updateConfigHealth();
                updateConfigDriveRow();
                updateConfigAbout();
                // Reset search + filter
                const si = document.getElementById('cfg-search-input');
                if (si) { si.value = ''; filterConfigRows(''); }
            } catch(e) { console.warn('[config-pro] hooks:', e); }
        }
        function closeConfigModal() {
            document.getElementById('modal-config').classList.add('hidden');
        }

        // ==================== CONFIG PRO — UI helpers ====================
        // Actualiza logo + nombre del negocio + versión en el header del modal
        function updateConfigHeader() {
            try {
                const logoEl = document.getElementById('cfg-header-logo');
                const bizEl  = document.getElementById('cfg-header-biz');
                const verEl  = document.getElementById('cfg-header-version');
                const cfg = _safeBizConfig();
                if (Object.keys(cfg).length > 0) {
                    if (bizEl) bizEl.textContent = cfg.shortName || cfg.name || 'NelsonApp Pro';
                    if (logoEl && cfg.logo) {
                        logoEl.innerHTML = `<img src="${cfg.logo}" alt="logo">`;
                        logoEl.style.background = '#0f0f14';
                    } else if (logoEl) {
                        logoEl.innerHTML = '🔧';
                    }
                }
                if (verEl) verEl.textContent = (window.APP_VERSION || 'v3.3.0');
            } catch(e) {}
        }

        // Popula las 3 tarjetas de estadísticas
        async function updateConfigStats() {
            // Registros
            try {
                const [orders, stock, sales, clientes] = await Promise.all([
                    getAll('orders').catch(() => []),
                    getAll('stock').catch(() => []),
                    getAll('sales').catch(() => []),
                    getAll('clientes').catch(() => [])
                ]);
                const total = (orders.length||0) + (stock.length||0) + (sales.length||0) + (clientes.length||0);
                const el = document.getElementById('cfg-stat-records');
                if (el) el.textContent = total.toLocaleString('es-CO');
            } catch(e) {
                const el = document.getElementById('cfg-stat-records');
                if (el) el.textContent = '—';
            }
            // Último respaldo
            const lastRaw = localStorage.getItem('driveLastBackup');
            const elB = document.getElementById('cfg-stat-backup');
            if (elB) {
                if (lastRaw) {
                    const last = new Date(lastRaw);
                    if (!isNaN(last)) {
                        elB.textContent = cfgTimeAgo(last);
                    } else {
                        elB.textContent = 'Nunca';
                    }
                } else {
                    elB.textContent = 'Nunca';
                }
            }
            // Drive status
            const elD = document.getElementById('cfg-stat-drive');
            if (elD) {
                const token = (typeof driveToken !== 'undefined' && driveToken) || sessionStorage.getItem('driveToken');
                elD.textContent = token ? '✓' : '—';
                elD.style.color = token ? '#34d399' : '#6b7280';
            }
        }

        function cfgTimeAgo(date) {
            const now = new Date();
            const diffMs = now - date;
            const mins = Math.floor(diffMs / 60000);
            if (mins < 1) return 'Ahora';
            if (mins < 60) return `${mins}m`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h`;
            const days = Math.floor(hrs / 24);
            if (days < 30) return `${days}d`;
            return `${Math.floor(days/30)}mes`;
        }

        // Pone/actualiza un badge en una fila dada su ios-body id
        function cfgSetBadge(bodyId, text, cls) {
            const body = document.getElementById(bodyId);
            if (!body) return;
            const row = body.previousElementSibling;
            if (!row || !row.classList.contains('ios-row')) return;
            let badge = row.querySelector('.ios-row-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'ios-row-badge';
                const chev = row.querySelector('.ios-chevron');
                if (chev) row.insertBefore(badge, chev);
                else row.appendChild(badge);
            }
            badge.textContent = text || '';
            badge.className = 'ios-row-badge' + (cls ? ' ' + cls : '');
            badge.style.display = text ? '' : 'none';
        }

        // Pinta todos los badges dinámicos
        function updateConfigBadges() {
            try {
                // Apariencia — color actual
                const accent = localStorage.getItem('appAccentColor') || 'orange';
                const accentNames = { orange:'Naranja', blue:'Azul', emerald:'Verde', violet:'Morado', rose:'Rosa', amber:'Ámbar' };
                cfgSetBadge('cfg-apariencia', accentNames[accent] || accent, 'accent');

                // Negocio — completo / falta X
                const b = _safeBizConfig();
                if (Object.keys(b).length > 0) {
                    const filled = ['name','phone','address'].filter(k => b[k] && String(b[k]).trim()).length;
                    if (filled === 3 && b.logo) cfgSetBadge('cfg-negocio', 'Completo', 'ok');
                    else if (filled === 0) cfgSetBadge('cfg-negocio', 'Configurar', 'warn');
                    else cfgSetBadge('cfg-negocio', `${filled}/3`, 'warn');
                } else {
                    cfgSetBadge('cfg-negocio', 'Configurar', 'warn');
                }

                // Regional — moneda
                const cur = localStorage.getItem('appCurrency') || '$';
                cfgSetBadge('cfg-regional', cur, 'off');

                // Notificaciones — activas
                const nSound = localStorage.getItem('appSound') === 'true';
                const nWarr  = localStorage.getItem('warrantyAlert') === 'true';
                const nOn = [nSound, nWarr].filter(Boolean).length;
                if (nOn === 0) cfgSetBadge('cfg-notif', 'Off', 'off');
                else cfgSetBadge('cfg-notif', `${nOn} activas`, 'ok');

                // Seguridad — bloqueo
                const lock = parseInt(localStorage.getItem('autoLockMinutes') || '0');
                if (lock === 0) cfgSetBadge('cfg-seguridad', 'Sin bloqueo', 'warn');
                else cfgSetBadge('cfg-seguridad', `${lock}m`, 'ok');

                // Plantillas WhatsApp — completas
                const tplKeys = ['tpl-recepcion','tpl-revision','tpl-presupuesto','tpl-listo','tpl-garantia','tpl-norepara','tpl-retraso','tpl-cobro'];
                const tplSaved = localStorage.getItem('whatsappTemplates');
                let filled = 0;
                if (tplSaved) {
                    try {
                        const t = JSON.parse(tplSaved);
                        filled = Object.values(t).filter(v => v && String(v).trim()).length;
                    } catch(e) {}
                }
                cfgSetBadge('cfg-wapp', `${filled}/8`, filled === 8 ? 'ok' : (filled > 0 ? 'warn' : 'off'));

                // Técnicos — cantidad
                const tecs = JSON.parse(localStorage.getItem('tecnicos') || '[]');
                cfgSetBadge('cfg-tecnicos', `${tecs.length}`, tecs.length > 0 ? 'ok' : 'warn');

                // Meta mensual
                const meta = parseFloat(localStorage.getItem('metaMensual') || '0');
                if (meta > 0) cfgSetBadge('cfg-meta', '$' + (meta/1000000).toFixed(1) + 'M', 'accent');
                else cfgSetBadge('cfg-meta', 'Sin meta', 'warn');

                // Recordatorios — hora cierre
                const cierre = localStorage.getItem('cierreHora') || '';
                cfgSetBadge('cfg-recordatorios', cierre || 'Sin hora', cierre ? 'ok' : 'off');

                // Documentos — fotos on/off
                const docRaw = localStorage.getItem('documentConfig');
                let docBadge = 'Config';
                if (docRaw) {
                    try { const d = JSON.parse(docRaw); docBadge = d.facturaFotos ? 'Con fotos' : 'Sin fotos'; } catch(e){}
                }
                cfgSetBadge('cfg-docs', docBadge, 'off');

                // Numeración — prefijo
                const numRaw = localStorage.getItem('orderNumConfig');
                if (numRaw) {
                    try { const n = JSON.parse(numRaw); cfgSetBadge('cfg-numeracion', n.prefix || 'NR-', 'off'); } catch(e) { cfgSetBadge('cfg-numeracion','NR-','off'); }
                } else cfgSetBadge('cfg-numeracion','NR-','off');

                // Inventario — umbral
                const low = localStorage.getItem('lowStockThreshold') || '3';
                cfgSetBadge('cfg-inventario', `<${low} ud`, 'off');

                // Respaldo automático — intervalo
                const interval = parseInt(localStorage.getItem('backupIntervalHours') || '0');
                if (interval === 0) cfgSetBadge('cfg-respaldo', 'Off', 'off');
                else if (interval === 168) cfgSetBadge('cfg-respaldo', 'Semanal', 'ok');
                else cfgSetBadge('cfg-respaldo', `${interval}h`, 'ok');

                // Drive
                const token = (typeof driveToken !== 'undefined' && driveToken) || sessionStorage.getItem('driveToken');
                cfgSetBadge('cfg-drive', token ? 'Conectado' : 'Off', token ? 'ok' : 'off');
            } catch(e) { console.warn('[badges]', e); }
        }

        // Calcula y pinta el indicador de salud general de la configuración
        function updateConfigHealth() {
            try {
                let score = 0; const total = 8;
                const bizRaw = localStorage.getItem('businessConfig');
                if (bizRaw) { try { const b = JSON.parse(bizRaw); if (b.name && b.phone && b.address) score++; if (b.logo) score++; } catch(e){} }
                const tecs = JSON.parse(localStorage.getItem('tecnicos') || '[]');
                if (tecs.length > 0) score++;
                const tplSaved = localStorage.getItem('whatsappTemplates');
                if (tplSaved) { try { const t = JSON.parse(tplSaved); const f = Object.values(t).filter(v=>v&&String(v).trim()).length; if (f >= 4) score++; } catch(e){} }
                if (parseFloat(localStorage.getItem('metaMensual') || '0') > 0) score++;
                if (parseInt(localStorage.getItem('autoLockMinutes') || '0') > 0) score++;
                const token = (typeof driveToken !== 'undefined' && driveToken) || sessionStorage.getItem('driveToken');
                if (token) score++;
                if (parseInt(localStorage.getItem('backupIntervalHours') || '0') > 0) score++;

                const pct = Math.round((score / total) * 100);
                const fill = document.getElementById('cfg-health-fill');
                const lbl  = document.getElementById('cfg-health-pct');
                if (fill) setTimeout(() => { fill.style.width = pct + '%'; }, 100);
                if (lbl) {
                    lbl.textContent = pct + '%';
                    lbl.style.color = pct >= 75 ? '#34d399' : (pct >= 40 ? '#fbbf24' : '#fb7185');
                }
            } catch(e) {}
        }

        // Drive row interno del modal
        function updateConfigDriveRow() {
            const info = document.getElementById('cfg-drive-email');
            const btn  = document.getElementById('cfg-drive-btn');
            const last = document.getElementById('cfg-drive-last');
            const token = (typeof driveToken !== 'undefined' && driveToken) || sessionStorage.getItem('driveToken');
            if (token) {
                const email = localStorage.getItem('driveEmail') || 'Conectado';
                if (info) info.textContent = email;
                if (btn)  { btn.textContent = 'Salir'; btn.style.background = 'linear-gradient(135deg,#475569,#334155)'; }
            } else {
                if (info) info.textContent = 'No conectado';
                if (btn)  { btn.textContent = 'Conectar'; btn.style.background = 'linear-gradient(135deg,#1d4ed8,#3b82f6)'; }
            }
            if (last) {
                const raw = localStorage.getItem('driveLastBackup');
                last.textContent = raw ? `Último respaldo: ${raw}` : 'Sin respaldos aún';
            }
        }

        // Acerca de — información de la app y el dispositivo
        function updateConfigAbout() {
            const wrap = document.getElementById('cfg-about-list');
            if (!wrap) return;
            const ua = navigator.userAgent || '';
            let platform = 'Desconocido';
            if (/Android/i.test(ua)) platform = 'Android';
            else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
            else if (/Win/i.test(ua)) platform = 'Windows';
            else if (/Mac/i.test(ua)) platform = 'macOS';
            else if (/Linux/i.test(ua)) platform = 'Linux';
            const online = navigator.onLine ? 'En línea' : 'Sin conexión';
            const onlineCls = navigator.onLine ? '#34d399' : '#fbbf24';
            const installed = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? 'PWA instalada' : 'Navegador';
            const rows = [
                ['Versión', window.APP_VERSION || 'v3.3.0'],
                ['Plataforma', platform],
                ['Entorno', installed],
                ['Conexión', `<span style="color:${onlineCls};font-weight:800;">${online}</span>`],
                ['Idioma', (navigator.language || 'es-CO')],
                ['Pantalla', `${screen.width}×${screen.height}`]
            ];
            wrap.innerHTML = rows.map(([k,v]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:12px;color:#8e8e93;font-weight:600;">${k}</span>
                    <span style="font-size:12px;color:#e5e7eb;font-weight:700;text-align:right;">${v}</span>
                </div>
            `).join('');
        }

        // Filtro de búsqueda en vivo
        function filterConfigRows(query) {
            const q = (query || '').toLowerCase().trim();
            const modal = document.getElementById('modal-config');
            if (!modal) return;
            const groups = modal.querySelectorAll('.ios-group');
            groups.forEach(group => {
                const rows = group.querySelectorAll(':scope > .ios-row');
                let visibleCount = 0;
                rows.forEach(row => {
                    const title = (row.querySelector('.ios-row-title')?.textContent || '').toLowerCase();
                    const sub   = (row.querySelector('.ios-row-sub')?.textContent || '').toLowerCase();
                    const match = !q || title.includes(q) || sub.includes(q);
                    row.classList.toggle('cfg-hidden-row', !match);
                    if (match) visibleCount++;
                });
                const label = group.previousElementSibling;
                if (label && label.classList.contains('ios-group-label')) {
                    label.classList.toggle('cfg-hidden-group', visibleCount === 0);
                }
                group.classList.toggle('cfg-hidden-group', visibleCount === 0);
            });
            // Oculta hero cuando hay búsqueda
            const stats = modal.querySelector('.cfg-stats');
            const quick = modal.querySelector('.cfg-quick');
            if (stats) stats.style.display = q ? 'none' : '';
            if (quick) quick.style.display = q ? 'none' : '';
        }

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
            const f = input.files[0];
            const mime = f.type === 'image/png' ? 'image/png' : 'image/jpeg'; // PNG conserva transparencia
            _resizeImage(f, 512, 0.85, mime).then(data => {
                try { localStorage.setItem('businessLogo', data); }
                catch (err) { showToast('No se pudo guardar el logo: almacenamiento lleno', 'error'); return; }
                const el = document.getElementById('logo-preview');
                if (el) el.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;">`;
                showToast('Logo guardado', 'success');
            }).catch(() => showToast('No se pudo leer la imagen', 'error'));
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
        async function clearMovFiltros() {
            document.getElementById('mov-filter-from').value = '';
            document.getElementById('mov-filter-to').value = '';
            // Recargar para que los totales vuelvan a los del scope completo
            await _loadMovimientosByScope();
            renderMovimientosFull(_allMovimientos);
        }

        function renderMovimientosFull(list) {
            const container = document.getElementById('mov-full-list');
            if (!list.length) { container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">Sin movimientos en este período</div>'; return; }
            container.innerHTML = list.map(m => {
                const fecha = new Date(m.fecha).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                if (m.type === 'sale')   return `<div class="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl"><div><p class="text-xs font-black text-emerald-400">+ Venta repuesto</p><p class="text-[11px] text-slate-300">${escapeHtml(m.item)} × ${m.qty}</p><p class="text-[10px] text-slate-500">${fecha}</p></div><p class="text-sm font-black text-emerald-400">+${fmtMoney(m.val||0)}</p></div>`;
                if (m.type === 'repair') return `<div class="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl"><div><p class="text-xs font-black text-blue-400">+ Reparación</p><p class="text-[11px] text-slate-300">${escapeHtml(m.nom||'')} — ${escapeHtml(m.equ||'')}</p><p class="text-[10px] text-slate-500">${fecha}</p></div><p class="text-sm font-black text-blue-400">+${fmtMoney(m.val||0)}</p></div>`;
                return `<div class="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl"><div><p class="text-xs font-black text-rose-400">− Gasto</p><p class="text-[11px] text-slate-300">${escapeHtml(m.det||'')}</p><p class="text-[10px] text-slate-500">${fecha}</p></div><p class="text-sm font-black text-rose-400">-${fmtMoney(m.val||0)}</p></div>`;
            }).join('');
        }

        function closeMovimientosModal() { document.getElementById('modal-movimientos').classList.add('hidden'); }
        function closeTicketMovModal()    { document.getElementById('modal-ticket-mov').classList.add('hidden'); }

        function generarTicketMovimientos() {
            const biz = _safeBizConfig();
            const now = new Date().toLocaleString('es-ES');
            const list = _allMovimientos;
            const ing = list.filter(m => m.type !== 'gasto').reduce((a,b) => a + (b.val||0), 0);
            const gas = list.filter(m => m.type === 'gasto').reduce((a,b) => a + (b.val||0), 0);
            const net = ing - gas;
            const c = getCurrency();
            let lines = `
<div style="text-align:center;margin-bottom:8px;">
  <div style="font-size:22px;">${biz.name ? '' : '🔧'}</div>
  <strong style="font-size:14px;">${biz.name || 'TALLER'}</strong><br>
  <span style="font-size:10px;color:#666;">${biz.address || ''} ${biz.phone ? '| ' + biz.phone : ''}</span>
</div>
<div style="text-align:center;font-size:10px;color:#999;margin-bottom:4px;">REPORTE DE MOVIMIENTOS</div>
<div style="font-size:10px;text-align:center;color:#555;margin-bottom:8px;">${now}</div>
<div style="border-top:1px dashed #ccc;margin:6px 0;"></div>`;

            list.forEach(m => {
                const d = new Date(m.fecha).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                const label = m.type === 'sale' ? `Venta: ${m.item}` : m.type === 'repair' ? `Reparo: ${m.nom}` : `Gasto: ${m.det}`;
                const val   = m.type === 'gasto' ? `-${c}${(m.val||0).toLocaleString()}` : `+${c}${(m.val||0).toLocaleString()}`;
                const color = m.type === 'gasto' ? '#dc2626' : m.type === 'repair' ? '#2563eb' : '#059669';
                lines += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px dotted #eee;">
  <span style="color:#333;max-width:65%;overflow:hidden;">${label}<br><span style="font-size:9px;color:#999;">${d}</span></span>
  <strong style="color:${color};">${val}</strong>
</div>`;
            });

            lines += `
<div style="border-top:2px solid #333;margin-top:8px;padding-top:6px;">
  <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Ingresos:</span><strong style="color:#059669;">+${c}${ing.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Gastos:</span><strong style="color:#dc2626;">-${c}${gas.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;font-size:14px;border-top:1px dashed #ccc;margin-top:4px;padding-top:4px;"><span><strong>NETO:</strong></span><strong style="color:${net>=0?'#059669':'#dc2626'};">${net>=0?'+':''}${c}${net.toLocaleString()}</strong></div>
</div>
<div style="text-align:center;font-size:10px;color:#aaa;margin-top:8px;">${biz.footer || '¡Gracias por su preferencia!'}</div>`;

            document.getElementById('ticket-mov-content').innerHTML = lines;
            document.getElementById('modal-ticket-mov').classList.remove('hidden');
        }

        async function descargarTicketMovimientos() {
            generarTicketMovimientos();
            await new Promise(r => setTimeout(r, 200));
            saveTicketAsImage();
        }

        async function saveTicketAsImage() {
            const el = document.getElementById('ticket-mov-content');
            if (!el || typeof html2canvas === 'undefined') { showAlert('html2canvas no disponible', 'error'); return; }
            try {
                const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
                await downloadImageCompat(canvas, `movimientos_${_ymdLocal(new Date())}.png`);
            } catch(e) { showAlert('Error al generar imagen', 'error'); }
        }

        async function downloadImageCompat(canvas, fileName) {
            if (navigator.share && navigator.canShare) {
                try {
                    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                    const file = new File([blob], fileName, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: fileName });
                        showToast('Imagen lista para guardar', 'success');
                        return;
                    }
                } catch(e) { if (e.name !== 'AbortError') console.warn('Share falló:', e); }
            }
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Imagen descargada', 'success');
        }

        function formatOrderNum(n) {
            const config = _safeBizConfig();
            const prefix = config.orderPrefix || '#';
            return prefix + String(n).padStart(4, '0');
        }

