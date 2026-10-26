/* Nelson App Pro · js/modules/30-tema-auto-push-proveedores.js
   Tema automatico, notificaciones push y proveedores
   (extraido sin cambios de index.html; el orden de carga importa) */
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
            if (Notification.permission !== 'granted') return;
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
            if (Notification.permission !== 'granted') return;
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

        // ==================== BLOQUE 3: ESCÁNER QR / CÓDIGO DE BARRAS ====================
        let _qrStream    = null;
        let _qrMode      = 'stock';
        let _qrAnimFrame = null;

