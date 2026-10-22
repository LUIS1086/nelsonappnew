/* Nelson App Pro · js/modules/04-tema-notificaciones-alertas.js
   Tema, toasts, avisos de stock bajo y ordenes vencidas
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== TEMA CLARO / OSCURO ====================
        // NOTA: modo claro desactivado por ahora. La app mantiene su identidad "Taller Pro"
        // oscura de forma consistente. Muchas tarjetas (Menú Datos, Nelson IA, Google Drive,
        // modales) usan colores hardcoded que no respetan light-mode. Cuando queramos
        // retomar el tema claro, hay que pasar esas cards a variables CSS.
        function toggleTheme() {
            // Desactivado — si se llama, simplemente asegurar modo oscuro
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('appTheme', 'dark');
        }
        function applyStoredTheme() {
            // Siempre forzar modo oscuro
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('appTheme', 'dark');
        }

        // (sidebar sync is embedded in tab() and syncSidebarCash() above)
        function showToast(msg, type = 'info') {
            const colors = { info: '#3b82f6', success: '#10b981', warning: '#f97316', error: '#ef4444' };
            const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
            const toast = document.createElement('div');
            toast.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);background:${colors[type]};color:white;padding:10px 18px;border-radius:999px;font-size:12px;font-weight:800;z-index:99999;opacity:0;transition:all 0.3s ease;max-width:90vw;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,0.4);`;
            toast.innerText = `${icons[type]} ${msg}`;
            document.body.appendChild(toast);
            requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
        }

        function requestNotificationPermission() { /* No-op en WebView, usamos toasts internos */ }

        // ===== FUNCIÓN checkLowStock MODIFICADA para usar umbral configurable =====
        async function checkLowStock() {
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            const stock = await getAll('stock');
            const low = stock.filter(s => s.q <= threshold && s.q > 0);
            if (low.length) showToast(`Stock bajo: ${low.length} productos con menos de ${threshold} unidades`, 'warning');
        }
        async function checkOverdueOrders() {
            const orders = await getAll('orders');
            const today = new Date();
            const overdue = orders.filter(o => o.sta !== 'entregado' && getBusinessDaysDiff(new Date(o.fecha), today) >= 60);
            if (overdue.length) showToast(`${overdue.length} órdenes con más de 60 días pendientes`, 'warning');
        }

        // Equipos REPARADOS que llevan +5 días sin ser recogidos → recordatorio al cliente
        async function checkUnclaimedRepairs() {
            try {
                // Solo si ya se mostró hoy, no repetir (una sola vez al día para no molestar)
                const today = new Date().toISOString().slice(0, 10);
                const lastShown = localStorage.getItem('unclaimedCheckDate');
                if (lastShown === today) return;

                const orders = await getAll('orders');
                const now = Date.now();
                const cincoDias = 5 * 86400000;
                const candidates = orders.filter(o => {
                    if (o.sta !== 'reparado') return false;
                    if (!o.tel) return false;
                    const ref = o.fechaReparado || o.fechaEstado || o.fecha || 0;
                    const dias = (now - ref) / 86400000;
                    // Llevan más de 5 días reparados
                    if (dias < 5) return false;
                    // No han sido avisados O el último aviso fue hace +3 días
                    if (!o.lastNotified) return true;
                    return (now - o.lastNotified) > 3 * 86400000;
                });

                if (candidates.length === 0) return;

                localStorage.setItem('unclaimedCheckDate', today);
                // Mensaje sutil en vez de bloqueante
                setTimeout(() => {
                    showToast(`🔔 ${candidates.length} equipo${candidates.length !== 1 ? 's' : ''} reparado${candidates.length !== 1 ? 's' : ''} esperando al cliente hace varios días. Toca para avisar.`, 'info', 7000);
                }, 2500);
            } catch(e) { console.warn('[checkUnclaimedRepairs]', e); }
        }
        setInterval(() => { checkLowStock(); checkOverdueOrders(); }, 3600000);

