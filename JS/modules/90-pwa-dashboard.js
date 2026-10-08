/* NelsonApp — 90-pwa-dashboard.js
 * PWA, dashboard, voz y navegación
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== VISIBILITYCHANGE: refrescar al volver de WhatsApp ====================
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Solo refrescar si la app ya está desbloqueada (no en pantalla de PIN)
                const pinModal = document.getElementById('pin-modal');
                if (pinModal && pinModal.classList.contains('hidden')) {
                    updateTotal();
                    // Forzar repintado del body en caso de pantalla negra en Android WebView
                    document.body.style.display = 'none';
                    // eslint-disable-next-line no-unused-expressions
                    document.body.offsetHeight; // trigger reflow
                    document.body.style.display = '';
                }
            }
        });

        // ==================== REGISTRO DEL SERVICE WORKER (PWA) ====================
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(reg => console.log('SW registrado:', reg.scope))
                    .catch(err => {
                        console.warn('SW error:', err);
                        // Solo mostrar aviso si es la primera vez (no spamear)
                        if (!sessionStorage.getItem('_swWarnShown')) {
                            sessionStorage.setItem('_swWarnShown', '1');
                            showToast('⚠️ Modo offline limitado — abre la app desde un servidor para activarlo completo', 'warning');
                        }
                    });
            });
        }

        // ==================== PWA: MANEJAR SHORTCUTS DEL MANIFEST ====================
        window.addEventListener('load', () => {
            const params = new URLSearchParams(window.location.search);
            const shortcut = params.get('shortcut');
            if (shortcut) {
                sessionStorage.setItem('dashGoTab', shortcut);
            }
        });

        // ==================== DASHBOARD INLINE ====================
        let _dashChartIngresos = null;

        function loadChartJs(cb) {
            if (window.Chart) { cb(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            s.onload = cb;
            s.onerror = () => console.warn('No se pudo cargar Chart.js');
            document.head.appendChild(s);
        }

        function toggleDashboardInline() {
            const panel = document.getElementById('dashboard-inline-panel');
            const arrow = document.getElementById('dash-toggle-arrow');
            const isOpen = panel.style.display !== 'none';
            if (isOpen) {
                panel.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
                if (_dashChartIngresos) { _dashChartIngresos.destroy(); _dashChartIngresos = null; }
            } else {
                panel.style.display = 'block';
                arrow.style.transform = 'rotate(90deg)';
                document.getElementById('dash-loader').style.display = 'block';
                loadChartJs(() => setTimeout(renderInlineDashboard, 80));
            }
        }

        function openDashboardModal() { toggleDashboardInline(); }
        function closeDashboardModal() { toggleDashboardInline(); }

        async function renderInlineDashboard() {
            const loader = document.getElementById('dash-loader');
            try {
                const orders  = await getAll('orders');
                const ventas  = await getAll('sales');
                const stock   = (await getAll('stock')) || [];
                const cur     = (typeof getCurrency === 'function') ? getCurrency() : '$';

                const now     = new Date();
                const mesAct  = now.getMonth();
                const anoAct  = now.getFullYear();

                // Label mes
                const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                const labelEl = document.getElementById('dash-month-label');
                if (labelEl) labelEl.textContent = mesNombre[mesAct] + ' ' + anoAct;

                // ---- KPIs este mes ----
                const ordensMes = orders.filter(o => {
                    const d = new Date(o.fecha || o.id);
                    return d.getMonth() === mesAct && d.getFullYear() === anoAct;
                });
                const ventasMes = ventas.filter(v => {
                    const d = new Date(v.fecha || v.id);
                    return d.getMonth() === mesAct && d.getFullYear() === anoAct
                        && v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega';
                });
                const ingresosMes = ventasMes.reduce((s, v) => s + (Number(v.val) || 0), 0)
                                  + ordensMes.filter(o => o.sta === 'entregado').reduce((s, o) => s + (Number(o.val) || 0), 0);
                const pendientes  = orders.filter(o => o.sta !== 'entregado' && o.sta !== 'cancelado').length;

                const elIng = document.getElementById('dash-kpi-ingresos');
                const elOrd = document.getElementById('dash-kpi-ordenes');
                const elPen = document.getElementById('dash-kpi-pendientes');
                if (elIng) elIng.textContent = cur + ingresosMes.toLocaleString('es-CO');
                if (elOrd) elOrd.textContent = ordensMes.length;
                if (elPen) elPen.textContent = pendientes;

                // ---- Gráfica últimos 6 meses ----
                const labels6 = [], data6 = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(anoAct, mesAct - i, 1);
                    const m = d.getMonth(), a = d.getFullYear();
                    labels6.push(meses[m]);
                    const ing = ventas.filter(v => { const dd = new Date(v.fecha || v.id); return dd.getMonth()===m && dd.getFullYear()===a && v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega'; })
                                      .reduce((s,v) => s+(Number(v.val)||0), 0)
                              + orders.filter(o => { const dd = new Date(o.fecha || o.id); return o.sta==='entregado' && dd.getMonth()===m && dd.getFullYear()===a; })
                                      .reduce((s,o) => s+(Number(o.val)||0), 0);
                    data6.push(ing);
                }

                const ctx = document.getElementById('dash-chart-ingresos');
                if (ctx && window.Chart) {
                    if (_dashChartIngresos) { _dashChartIngresos.destroy(); _dashChartIngresos = null; }
                    _dashChartIngresos = new window.Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels6,
                            datasets: [{
                                label: 'Ingresos',
                                data: data6,
                                backgroundColor: data6.map((_, i) => i === 5 ? 'rgba(249,115,22,0.85)' : 'rgba(249,115,22,0.25)'),
                                borderRadius: 8,
                                borderSkipped: false,
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: {
                                callbacks: { label: c => cur + Number(c.raw).toLocaleString('es-CO') }
                            }},
                            scales: {
                                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11, weight: '700' } } },
                                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 },
                                     callback: v => cur + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } }
                            }
                        }
                    });
                }

                // ---- Estados de órdenes ----
                const estadosConfig = [
                    { key: 'recibido',  label: 'Recibido',    color: '#38bdf8' },
                    { key: 'revision',  label: 'En revisión', color: '#f59e0b' },
                    { key: 'reparando', label: 'Reparando',   color: '#f97316' },
                    { key: 'listo',     label: 'Listo',       color: '#10b981' },
                    { key: 'entregado', label: 'Entregado',   color: '#6b7280' },
                ];
                const totalOrd = orders.length || 1;
                const elEstados = document.getElementById('dash-estados');
                if (elEstados) elEstados.innerHTML = estadosConfig.map(e => {
                    const cnt = orders.filter(o => (o.sta||'').toLowerCase() === e.key).length;
                    const pct = Math.round(cnt / totalOrd * 100);
                    return `<div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                            <span style="font-size:11px;font-weight:700;color:#94a3b8;">${e.label}</span>
                            <span style="font-size:11px;font-weight:900;color:${e.color};">${cnt}</span>
                        </div>
                        <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:${e.color};border-radius:99px;transition:width 0.7s ease;"></div>
                        </div>
                    </div>`;
                }).join('');

                // ---- Top 5 repuestos ----
                const conteo = {};
                ventas.forEach(v => {
                    if (v.items && Array.isArray(v.items)) {
                        v.items.forEach(it => {
                            const n = it.nombre || it.name || '';
                            if (n) conteo[n] = (conteo[n] || 0) + (Number(it.qty) || 1);
                        });
                    }
                });
                const topRep = Object.entries(conteo).sort((a,b) => b[1]-a[1]).slice(0,5);
                const maxRep = topRep[0]?.[1] || 1;
                const elTop = document.getElementById('dash-top-repuestos');
                if (elTop) elTop.innerHTML = topRep.length
                    ? topRep.map(([n, c]) => `
                        <div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                                <span style="font-size:11px;font-weight:700;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;">${escapeHtml(n)}</span>
                                <span style="font-size:11px;font-weight:900;color:#f97316;">${c} uds</span>
                            </div>
                            <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;">
                                <div style="height:100%;width:${Math.round(c/maxRep*100)}%;background:linear-gradient(to right,#f97316,#fb923c);border-radius:99px;"></div>
                            </div>
                        </div>`).join('')
                    : '<p style="font-size:11px;color:#475569;margin:0;">Sin datos de ventas aún</p>';

                // ---- Alertas ----
                const alertas = [];
                const vencidas = orders.filter(o => {
                    if (o.sta === 'entregado' || o.sta === 'cancelado') return false;
                    if (!o.deadline) return false;
                    return new Date(o.deadline) < new Date();
                });
                if (vencidas.length) alertas.push(`🕐 <strong>${vencidas.length}</strong> orden${vencidas.length>1?'es':''} vencida${vencidas.length>1?'s':''}`);

                const bajosMin = stock.filter(s => s.q !== undefined && Number(s.q) <= (s.minStock || 3));
                if (bajosMin.length) alertas.push(`📦 <strong>${bajosMin.length}</strong> repuesto${bajosMin.length>1?'s':''} bajo mínimo`);

                const alertasWrap = document.getElementById('dash-alertas-wrap');
                const alertasDiv  = document.getElementById('dash-alertas');
                if (alertasWrap && alertasDiv) {
                    if (alertas.length) {
                        alertasWrap.style.display = 'block';
                        alertasDiv.innerHTML = alertas.map(a =>
                            `<div style="background:rgba(244,63,94,0.10);border:1px solid rgba(244,63,94,0.25);border-radius:10px;padding:8px 12px;font-size:12px;color:#fda4af;">${a}</div>`
                        ).join('');
                    } else {
                        alertasWrap.style.display = 'none';
                    }
                }

                // ---- Badge vencidas en nav ----
                updateOverdueBadge(vencidas.length);

            } catch(e) {
                console.error('Dashboard error:', e);
            } finally {
                if (loader) loader.style.display = 'none';
            }
        }

        // Badge rojo en el tab de Órdenes
        function updateOverdueBadge(count) {
            // Quitar badge anterior
            document.querySelectorAll('.overdue-badge').forEach(el => el.remove());
            if (!count) return;
            // Agregar en el botón de tab móvil y en sidebar
            ['nav-btn-ordenes','sidebar-btn-ordenes'].forEach(id => {
                const btn = document.getElementById(id);
                if (!btn) return;
                const badge = document.createElement('span');
                badge.className = 'overdue-badge';
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.cssText = 'position:absolute;top:2px;right:2px;background:#f43f5e;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px;line-height:1;';
                btn.style.position = 'relative';
                btn.appendChild(badge);
            });
        }

        // También actualizar badge al iniciar (después de cargar datos)
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(async () => {
                try {
                    const orders = await getAll('orders');
                    const vencidas = orders.filter(o => {
                        if (o.sta === 'entregado' || o.sta === 'cancelado') return false;
                        if (!o.deadline) return false;
                        return new Date(o.deadline) < new Date();
                    });
                    updateOverdueBadge(vencidas.length);
                } catch(e) { /* ignorar */ }
            }, 1500);
        });
        // ==================== 🎤 ENTRADA DE VOZ ====================
        let _voiceRecognition = null;
        let _voiceTargetId = null;
        let _voiceTriggerSearch = false;

        function startVoiceInput(targetId, triggerSearch = false) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToast('Tu dispositivo no soporta entrada de voz', 'warning');
                return;
            }
            // Si ya hay reconocimiento activo en este campo, cancelar
            if (_voiceRecognition && _voiceTargetId === targetId) {
                _voiceRecognition.stop();
                return;
            }
            // Cancelar cualquier otro activo
            if (_voiceRecognition) _voiceRecognition.stop();

            _voiceTargetId = targetId;
            _voiceTriggerSearch = triggerSearch;
            const btn = document.getElementById('voice-btn-' + (targetId === 'search-orders' ? 'search' : targetId));

            _voiceRecognition = new SpeechRecognition();
            _voiceRecognition.lang = 'es-CO';
            _voiceRecognition.continuous = false;
            _voiceRecognition.interimResults = false;

            _voiceRecognition.onstart = () => {
                if (btn) btn.classList.add('listening');
                if (btn) btn.textContent = '🔴';
                showToast('🎤 Escuchando...', 'info');
            };

            _voiceRecognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                const el = document.getElementById(targetId);
                if (!el) return;
                // Para textareas y inputs tipo text, agregar al texto existente
                const isTextarea = el.tagName === 'TEXTAREA';
                el.value = isTextarea ? (el.value ? el.value + ' ' + transcript : transcript) : transcript.toUpperCase();
                el.dispatchEvent(new Event('input', { bubbles: true }));
                if (_voiceTriggerSearch) onSearchInput && onSearchInput();
                if (targetId === 'c-fal') suggestDiagnosis && suggestDiagnosis();
                if (targetId === 'c-nom') checkClient && checkClient();
                showToast('✅ Texto capturado', 'success');
            };

            _voiceRecognition.onerror = (e) => {
                const msgs = { 'no-speech': 'No se detectó voz', 'not-allowed': 'Permiso de micrófono denegado', 'network': 'Error de red' };
                showToast('🎤 ' + (msgs[e.error] || 'Error al escuchar'), 'warning');
            };

            _voiceRecognition.onend = () => {
                if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
                _voiceRecognition = null;
                _voiceTargetId = null;
            };

            _voiceRecognition.start();
        }

