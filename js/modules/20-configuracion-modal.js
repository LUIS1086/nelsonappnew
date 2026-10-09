/* Nelson App Pro · js/modules/20-configuracion-modal.js
   Configuracion del negocio y Command Center
   (extraido sin cambios de index.html; el orden de carga importa) */
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

