/* NelsonApp — 92-push.js
 * Notificaciones push
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
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
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
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

