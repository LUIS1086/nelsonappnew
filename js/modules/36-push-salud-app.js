/* Nelson App Pro · js/modules/36-push-salud-app.js
   Push, chequeos periodicos y salud de la app
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== 🔔 NOTIFICACIONES PUSH ====================
        function initPushNotifications() {
            if (!('Notification' in window)) return;
            // Mostrar modal de invitación si aún no se ha respondido
            if (Notification.permission === 'default') {
                // Solo mostrar después de que el usuario interactúe un poco
                setTimeout(() => {
                    if (Notification.permission === 'default') {
                        document.getElementById('modal-push-setup')?.classList.remove('hidden');
                    }
                }, 8000);
            }
            // Si ya tiene permiso, programar verificación
            if (Notification.permission === 'granted') {
                schedulePushChecks();
            }
        }

        async function requestPushPermissionFromModal() {
            document.getElementById('modal-push-setup')?.classList.add('hidden');
            if (!('Notification' in window)) {
                showToast('Tu navegador no soporta notificaciones', 'warning');
                return;
            }
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                showToast('🔔 Notificaciones activadas', 'success');
                schedulePushChecks();
                // Notificación de bienvenida
                setTimeout(() => {
                    new Notification('NelsonApp · Notificaciones activas', {
                        body: 'Recibirás alertas de órdenes vencidas, listas y stock bajo mínimo.',
                        icon: 'icons/icon-192x192.png',
                        badge: 'icons/icon-192x192.png',
                        tag: 'welcome'
                    });
                }, 500);
            } else {
                showToast('Notificaciones denegadas — puedes activarlas desde el navegador', 'warning');
            }
        }

        let _pushCheckInterval = null;
        function schedulePushChecks() {
            if (_pushCheckInterval) return; // ya está corriendo
            // Verificar inmediatamente y luego cada 30 minutos
            checkAndNotify();
            _pushCheckInterval = setInterval(checkAndNotify, 30 * 60 * 1000);
        }

        async function checkAndNotify() {
            if (Notification.permission !== 'granted') return;
            try {
                const orders = await getAll('orders');
                const stock = (await getAll('stock')) || [];
                const now = new Date();

                // 1. Órdenes vencidas
                const vencidas = orders.filter(o => {
                    if (o.sta === 'entregado' || o.sta === 'cancelado') return false;
                    if (!o.deadline) return false;
                    return new Date(o.deadline) < now;
                });
                if (vencidas.length > 0) {
                    const lastKey = '_notif_vencidas_' + vencidas.length;
                    if (!sessionStorage.getItem(lastKey)) {
                        sessionStorage.setItem(lastKey, '1');
                        new Notification('⏰ Órdenes vencidas · NelsonApp', {
                            body: `${vencidas.length} orden(es) superaron la fecha de entrega.`,
                            icon: 'icons/icon-192x192.png',
                            tag: 'vencidas',
                            requireInteraction: true
                        });
                    }
                }

                // 2. Equipos listos para entregar (estado "reparado")
                const listos = orders.filter(o => o.sta === 'reparado' && o.tel);
                if (listos.length > 0) {
                    const lastKey = '_notif_listos_' + listos.length;
                    if (!sessionStorage.getItem(lastKey)) {
                        sessionStorage.setItem(lastKey, '1');
                        new Notification('✅ Equipos listos · NelsonApp', {
                            body: `${listos.length} equipo(s) están reparados y listos para entregar.`,
                            icon: 'icons/icon-192x192.png',
                            tag: 'listos'
                        });
                    }
                }

                // 3. Repuestos bajo mínimo
                const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
                const bajosMin = stock.filter(s => s.q !== undefined && Number(s.q) <= (s.minStock || threshold));
                if (bajosMin.length > 0) {
                    const lastKey = '_notif_stock_' + bajosMin.length;
                    if (!sessionStorage.getItem(lastKey)) {
                        sessionStorage.setItem(lastKey, '1');
                        const names = bajosMin.slice(0,3).map(s => s.n).join(', ');
                        new Notification('📦 Stock bajo mínimo · NelsonApp', {
                            body: `${bajosMin.length} repuesto(s) con stock crítico: ${names}${bajosMin.length > 3 ? '...' : ''}`,
                            icon: 'icons/icon-192x192.png',
                            tag: 'stock-bajo'
                        });
                    }
                }
            } catch(e) { console.warn('Push check error:', e); }
        }

        // Inicializar push al cargar
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initPushNotifications, 3000);
        });

        // ==================== 💚 SALUD DE LA APP ====================
        async function openAppHealthModal() {
            document.getElementById('modal-app-health').classList.remove('hidden');
            // Mostrar estado de carga
            const itemsEl = document.getElementById('health-items');
            itemsEl.innerHTML = Array(6).fill(0).map(() =>
                `<div class="health-item"><div class="health-dot loading"></div><div style="flex:1;"><div style="height:10px;background:rgba(255,255,255,0.05);border-radius:6px;width:60%;margin-bottom:6px;"></div><div style="height:8px;background:rgba(255,255,255,0.04);border-radius:6px;width:40%;"></div></div></div>`
            ).join('');
            document.getElementById('health-score-num').textContent = '…';
            document.getElementById('health-score-label').textContent = 'Analizando…';
            document.getElementById('health-score-sub').textContent = '';

            try {
                const [orders, stock, sales, gastos, clientes, payments] = await Promise.all([
                    getAll('orders'), getAll('stock'), getAll('sales'),
                    getAll('gastos'), getAll('clientes'), getAll('payments')
                ]);
                const cur = getCurrency();
                const now = new Date();
                const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;

                // ---- Calcular métricas ----
                const totalRecords = orders.length + stock.length + sales.length + gastos.length;
                const pendientes   = orders.filter(o => o.sta !== 'entregado' && o.sta !== 'cancelado');
                const vencidas     = pendientes.filter(o => o.deadline && new Date(o.deadline) < now);
                const stockBajo    = stock.filter(s => s.q !== undefined && Number(s.q) <= (s.minStock || threshold));
                const stockAgotado = stock.filter(s => s.q === 0);
                const deudores     = clientes.filter(c => c.deuda > 0);
                const totalDeuda   = deudores.reduce((a,b) => a + (b.deuda||0), 0);
                const lastBackup   = localStorage.getItem('driveLastBackup');
                const lastCierre   = Number(localStorage.getItem('lastCierreCaja')) || 0;
                const diasSinCierre = Math.floor((Date.now() - lastCierre) / 86400000);

                // Estimar tamaño en IndexedDB
                let storageInfo = '';
                try {
                    if (navigator.storage && navigator.storage.estimate) {
                        const est = await navigator.storage.estimate();
                        const usedMB  = (est.usage  / 1048576).toFixed(1);
                        const quotaMB = (est.quota   / 1048576).toFixed(0);
                        const pct     = Math.round((est.usage / est.quota) * 100);
                        storageInfo = `${usedMB} MB usados de ${quotaMB} MB (${pct}%)`;
                    }
                } catch(_) { storageInfo = 'No disponible'; }

                // ---- Calcular score ----
                let score = 100;
                if (vencidas.length > 0)         score -= Math.min(20, vencidas.length * 5);
                if (stockBajo.length > 3)         score -= 10;
                if (stockAgotado.length > 0)      score -= Math.min(10, stockAgotado.length * 2);
                if (!lastBackup)                  score -= 15;
                if (diasSinCierre > 7)            score -= 10;
                if (totalDeuda > 0)               score -= 5;
                score = Math.max(0, score);

                const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
                const scoreLabel = score >= 80 ? '¡Todo en orden!' : score >= 60 ? 'Requiere atención' : 'Acción necesaria';
                const scoreSub   = score >= 80
                    ? 'Tu taller está funcionando correctamente.'
                    : score >= 60
                    ? 'Hay algunos puntos que puedes mejorar.'
                    : 'Hay problemas que necesitan tu atención.';

                document.getElementById('health-score-num').textContent = score;
                document.getElementById('health-score-num').style.color = scoreColor;
                document.getElementById('health-score-ring').style.borderColor = scoreColor;
                document.getElementById('health-score-label').textContent = scoreLabel;
                document.getElementById('health-score-sub').textContent = scoreSub;

                // ---- Construir items ----
                const items = [
                    {
                        icon: '📋',
                        label: 'Órdenes activas',
                        value: `${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''}`,
                        sub: vencidas.length > 0 ? `⚠️ ${vencidas.length} vencida${vencidas.length !== 1 ? 's' : ''}` : 'Sin vencidas ✓',
                        status: vencidas.length > 0 ? 'danger' : pendientes.length > 10 ? 'warn' : 'ok'
                    },
                    {
                        icon: '📦',
                        label: 'Inventario',
                        value: `${stock.length} producto${stock.length !== 1 ? 's' : ''}`,
                        sub: stockAgotado.length > 0
                            ? `❌ ${stockAgotado.length} agotado${stockAgotado.length !== 1 ? 's' : ''} · ⚠️ ${stockBajo.length} bajo mínimo`
                            : stockBajo.length > 0
                            ? `⚠️ ${stockBajo.length} bajo mínimo`
                            : 'Stock en niveles correctos ✓',
                        status: stockAgotado.length > 0 ? 'danger' : stockBajo.length > 0 ? 'warn' : 'ok'
                    },
                    {
                        icon: '💳',
                        label: 'Cartera de clientes',
                        value: deudores.length > 0 ? `${cur}${totalDeuda.toLocaleString('es-CO')} en deudas` : 'Sin deudas pendientes',
                        sub: deudores.length > 0 ? `${deudores.length} cliente${deudores.length !== 1 ? 's' : ''} con saldo` : 'Todos los pagos al día ✓',
                        status: deudores.length > 0 ? 'warn' : 'ok'
                    },
                    {
                        icon: '💾',
                        label: 'Último respaldo',
                        value: lastBackup || 'Sin respaldo registrado',
                        sub: lastBackup ? 'Respaldo en Google Drive ✓' : '⚠️ Conecta Drive para respaldar',
                        status: lastBackup ? 'ok' : 'danger'
                    },
                    {
                        icon: '🗃️',
                        label: 'Base de datos',
                        value: `${totalRecords.toLocaleString()} registros totales`,
                        sub: storageInfo || 'Calculando…',
                        status: 'info'
                    },
                    {
                        icon: '🏦',
                        label: 'Cierre de caja',
                        value: lastCierre > 0 ? `Hace ${diasSinCierre} día${diasSinCierre !== 1 ? 's' : ''}` : 'Nunca realizado',
                        sub: diasSinCierre > 7 ? '⚠️ Recomendado hacer cierre semanal' : diasSinCierre <= 1 ? 'Caja al día ✓' : 'Dentro del rango normal',
                        status: diasSinCierre > 7 ? 'warn' : 'ok'
                    },
                ];

                itemsEl.innerHTML = items.map(item => `
                    <div class="health-item">
                        <span style="font-size:1.4rem;flex-shrink:0;">${item.icon}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
                                <p style="font-size:12px;font-weight:800;color:#e8eaf6;margin:0;white-space:nowrap;">${item.label}</p>
                                <p style="font-size:11px;font-weight:900;color:${item.status === 'ok' ? '#10b981' : item.status === 'warn' ? '#f59e0b' : item.status === 'danger' ? '#f43f5e' : '#38bdf8'};margin:0;text-align:right;flex-shrink:0;">${item.value}</p>
                            </div>
                            <p style="font-size:10px;color:#6b7a99;margin:2px 0 0;">${item.sub}</p>
                        </div>
                        <div class="health-dot ${item.status}" style="flex-shrink:0;"></div>
                    </div>`).join('');

            } catch(e) {
                document.getElementById('health-items').innerHTML =
                    `<div class="health-item"><div class="health-dot danger"></div><p style="font-size:12px;color:#f43f5e;">Error al obtener diagnóstico: ${e.message}</p></div>`;
            }
        }

        function closeAppHealthModal() {
            document.getElementById('modal-app-health').classList.add('hidden');
        }

    