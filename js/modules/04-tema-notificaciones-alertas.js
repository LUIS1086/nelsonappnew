/* Nelson App Pro · js/modules/04-tema-notificaciones-alertas.js
   Tema, toasts, avisos de stock bajo y ordenes vencidas
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== TEMA CLARO / OSCURO ====================
        // Tres modos guardados en localStorage('appTheme'): 'dark' (por defecto), 'light' y 'system'
        // (sigue al teléfono). El tema se aplica en <html data-theme> Y en <body class>, porque las
        // capas CSS viejas usan body.light-mode / body.dark-mode y la capa 30-tema usa html[data-theme].
        // (El mismo valor lo lee dashboard.html, así que ambos quedan sincronizados.)
        const _THEME_COLORS = { dark: '#0a0c12', light: '#f2f2f7' };
        function _themeMode() {
            const m = localStorage.getItem('appTheme');
            return (m === 'light' || m === 'system') ? m : 'dark';
        }
        function _resolveTheme(mode) {
            if (mode === 'system') {
                return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
            }
            return mode === 'light' ? 'light' : 'dark';
        }
        function _paintTheme(theme) {
            const isLight = theme === 'light';
            const root = document.documentElement, body = document.body;
            root.setAttribute('data-theme', theme);
            root.style.colorScheme = theme;
            body.classList.toggle('light-mode', isLight);
            body.classList.toggle('dark-mode', !isLight);
            document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', _THEME_COLORS[theme]));
            const cs = document.querySelector('meta[name="color-scheme"]');
            if (cs) cs.setAttribute('content', 'dark light');
            ['theme-btn', 'sidebar-theme-btn', 'desktop-theme-btn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = id.includes('sidebar') ? (isLight ? '☀️ Tema' : '🌙 Tema') : (isLight ? '☀️' : '🌙');
            });
            document.querySelectorAll('[data-theme-opt]').forEach(b => {
                const on = b.getAttribute('data-theme-opt') === _themeMode();
                b.classList.toggle('is-on', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        }
        function applyStoredTheme() { _paintTheme(_resolveTheme(_themeMode())); }
        function setThemeMode(mode) {
            if (mode !== 'light' && mode !== 'system') mode = 'dark';
            // transición suave solo durante el cambio
            const r = document.documentElement; r.classList.add('nn-theme-anim');
            clearTimeout(window._nnThemeAnim); window._nnThemeAnim = setTimeout(() => r.classList.remove('nn-theme-anim'), 380);
            try { localStorage.setItem('appTheme', mode); } catch (e) {}
            _paintTheme(_resolveTheme(mode));
        }
        function toggleTheme() {
            // Botón rápido: alterna claro <-> oscuro (si estaba en "sistema" pasa al contrario del actual)
            setThemeMode(_resolveTheme(_themeMode()) === 'light' ? 'dark' : 'light');
        }
        // Si el teléfono cambia de claro a oscuro mientras la app está abierta y el modo es "sistema"
        try {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
                if (_themeMode() === 'system') applyStoredTheme();
            });
        } catch (e) {}

        // (sidebar sync is embedded in tab() and syncSidebarCash() above)
        function showToast(msg, type = 'info') {
            const tones = { info: '#60a5fa', success: '#34d399', warning: '#f59e0b', error: '#fb7185' };
            const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
            const toast = document.createElement('div');
            toast.className = 'nn-toast';
            toast.style.setProperty('--tone', tones[type] || tones.info);
            toast.setAttribute('role', 'status');
            const icon = document.createElement('span');
            icon.className = 'nn-toast-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = icons[type] || icons.info;
            const text = document.createElement('span');
            text.className = 'nn-toast-text';
            text.textContent = String(msg ?? '');
            toast.append(icon, text);
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('is-on'));
            setTimeout(() => {
                toast.classList.remove('is-on');
                setTimeout(() => toast.remove(), 260);
            }, 3800);
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
            const orders = await getOrdersLite();
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

