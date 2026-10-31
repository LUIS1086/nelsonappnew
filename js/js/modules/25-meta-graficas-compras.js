/* Nelson App Pro · js/modules/25-meta-graficas-compras.js
   Meta mensual, grafica de ingresos y ordenes de compra
   (extraido sin cambios de index.html; el orden de carga importa) */
        function renderTecnicosList() {
            const list = getTecnicos();
            const el = document.getElementById('tecnicos-list');
            if (!el) return;
            el.innerHTML = list.length
                ? list.map(t => `<div class="flex justify-between items-center bg-slate-800/60 px-3 py-2 rounded-xl"><span class="text-sm font-bold">👷 ${t}</span><button onclick="removeTecnico('${t}')" class="text-rose-400 text-xs bg-rose-500/20 px-2 py-1 rounded-lg">✕</button></div>`).join('')
                : '<p class="text-xs text-slate-500 text-center py-2">Sin técnicos registrados</p>';
        }

        // ==================== META MENSUAL + SEMANAL ====================
        function saveMetaConfig() {
            const meta        = parseFloat(document.getElementById('config-meta').value) || 0;
            const visible     = document.getElementById('config-meta-visible').checked;
            const metaSemanal = parseFloat(document.getElementById('config-meta-semanal')?.value) || 0;
            localStorage.setItem('metaMensual',  meta);
            localStorage.setItem('metaVisible',  visible);
            localStorage.setItem('metaSemanal',  metaSemanal);
            updateMetaBar();
            showToast('Metas guardadas ✅', 'success');
        }
        function loadMetaConfig() {
            const meta        = localStorage.getItem('metaMensual')  || '';
            const visible     = localStorage.getItem('metaVisible')  === 'true';
            const metaSemanal = localStorage.getItem('metaSemanal')  || '';
            const mEl  = document.getElementById('config-meta');         if (mEl)  mEl.value  = meta;
            const vEl  = document.getElementById('config-meta-visible'); if (vEl)  vEl.checked = visible;
            const msEl = document.getElementById('config-meta-semanal'); if (msEl) msEl.value = metaSemanal;
        }
        async function updateMetaBar() {
            const meta    = parseFloat(localStorage.getItem('metaMensual')) || 0;
            const visible = localStorage.getItem('metaVisible') === 'true';
            const wrap    = document.getElementById('meta-bar-wrap');
            if (!wrap) return;
            if (!visible || !meta) { wrap.classList.add('hidden'); return; }
            wrap.classList.remove('hidden');
            const now   = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const orders = await getOrdersLite();
            const sales  = await getAll('sales');
            const total  = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) >= start).reduce((a,b) => a+(b.val||0), 0)
                         + sales.filter(s => s.fecha >= start && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega').reduce((a,b) => a+(b.val||0), 0);
            const pct = Math.min(100, Math.round((total / meta) * 100));
            document.getElementById('meta-bar-fill').style.width = pct + '%';
            document.getElementById('meta-bar-pct').innerText    = pct + '%';
            const fill = document.getElementById('meta-bar-fill');
            fill.style.background = pct >= 100 ? 'linear-gradient(to right,#10b981,#34d399)'
                                  : pct >= 60  ? 'linear-gradient(to right,#f59e0b,#fbbf24)'
                                  : 'linear-gradient(to right,#ef4444,#f87171)';
            const amtEl = document.getElementById('meta-bar-amount');
            if (amtEl) amtEl.innerText = getCurrency() + total.toLocaleString('es-CO') + ' / ' + getCurrency() + meta.toLocaleString('es-CO');
            if (pct >= 100) showToast('🎉 ¡Meta del mes alcanzada!', 'success');
        }

        // ==================== BLOQUE B: GRÁFICA DE INGRESOS ====================
        async function openGraficaIngresos() {
            document.getElementById('modal-grafica').classList.remove('hidden');
            await renderGraficaIngresos();
        }
        function closeGraficaIngresos() {
            document.getElementById('modal-grafica').classList.add('hidden');
        }

        async function renderGraficaIngresos() {
            const orders = await getAll('orders');
            const sales  = await getAll('sales');
            const cur    = getCurrency();
            const now    = new Date();

            // Construir datos de los últimos 6 meses
            const meses = [];
            for (let i = 5; i >= 0; i--) {
                const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const start = d.getTime();
                const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
                const label = d.toLocaleDateString('es-ES', {month:'short'}).replace('.','');
                const reps  = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega||o.fecha) >= start && (o.fechaEntrega||o.fecha) < end)
                                    .reduce((a,b) => a+(b.val||0), 0);
                const vtas  = sales.filter(s => s.fecha >= start && s.fecha < end && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega')
                                   .reduce((a,b) => a+(b.val||0), 0);
                meses.push({ label, reps, vtas, total: reps + vtas });
            }

            const maxVal    = Math.max(...meses.map(m => m.total), 1);
            const H         = 170;
            const barW      = 38;
            const gap       = 18;
            const padTop    = 24;
            const padBottom = 26;
            const totalW    = meses.length * (barW + gap) + gap;
            const svgH      = H + padTop + padBottom;
            const mesActual = meses[meses.length - 1];

            // Líneas guía horizontales
            let gridLines = '';
            [0.25, 0.5, 0.75, 1].forEach(pct => {
                const y = padTop + H - Math.round(pct * H);
                const v = maxVal * pct;
                const vl = v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'K' : '';
                gridLines += `<line x1="${gap}" y1="${y}" x2="${totalW - gap}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`;
                if (vl) gridLines += `<text x="${gap - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="#334155" font-weight="500">${vl}</text>`;
            });

            // Barras
            let bars = '';
            meses.forEach((m, i) => {
                const x      = gap + i * (barW + gap);
                const hRep   = Math.round((m.reps  / maxVal) * H);
                const hVta   = Math.round((m.vtas  / maxVal) * H);
                const hTot   = Math.round((m.total / maxVal) * H);
                const yBase  = padTop + H;
                const isLast = i === meses.length - 1;
                const half   = Math.floor(barW / 2) - 1;
                // Fondo barra total
                if (hTot > 0) bars += `<rect x="${x}" y="${yBase - hTot}" width="${barW}" height="${hTot}" rx="7" fill="${isLast ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)'}"/>`;
                // Reparaciones (izquierda)
                if (hRep > 0) bars += `<rect x="${x}" y="${yBase - hRep}" width="${half}" height="${hRep}" rx="5" fill="${isLast ? '#10b981' : '#34d399'}" opacity="${isLast ? 1 : 0.6}"/>`;
                // Ventas (derecha)
                if (hVta > 0) bars += `<rect x="${x + half + 2}" y="${yBase - hVta}" width="${half}" height="${hVta}" rx="5" fill="${isLast ? '#3b82f6' : '#60a5fa'}" opacity="${isLast ? 1 : 0.6}"/>`;
                // Etiqueta mes
                bars += `<text x="${x + barW/2}" y="${yBase + 18}" text-anchor="middle" font-size="11" fill="${isLast ? '#f1f5f9' : '#64748b'}" font-weight="${isLast ? '900' : '500'}">${m.label}</text>`;
                // Valor encima
                if (m.total > 0) {
                    const sv = m.total >= 1000000 ? (m.total/1000000).toFixed(1)+'M' : m.total >= 1000 ? Math.round(m.total/1000)+'K' : String(m.total);
                    bars += `<text x="${x + barW/2}" y="${yBase - hTot - 6}" text-anchor="middle" font-size="10" fill="${isLast ? '#34d399' : '#475569'}" font-weight="800">${sv}</text>`;
                }
            });

            // Línea meta mensual
            const metaMes = parseFloat(localStorage.getItem('metaMensual')) || 0;
            let metaLine = '';
            if (metaMes > 0 && metaMes <= maxVal * 1.5) {
                const yMeta = padTop + H - Math.round((metaMes / maxVal) * H);
                metaLine = `<line x1="${gap}" y1="${yMeta}" x2="${totalW - gap}" y2="${yMeta}" stroke="#f97316" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.85"/><text x="${totalW - gap - 2}" y="${yMeta - 5}" text-anchor="end" font-size="9" fill="#f97316" font-weight="800">META</text>`;
            }

            const svgHTML = `<svg width="100%" viewBox="0 0 ${totalW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block;">${gridLines}${bars}${metaLine}</svg>`;

            document.getElementById('grafica-container').innerHTML = svgHTML;

            // Leyenda
            const resumen = document.getElementById('grafica-resumen');
            const promedio = Math.round(meses.reduce((a,m) => a+m.total,0) / meses.filter(m=>m.total>0).length || 1);
            const tendencia = meses.length >= 2 ? meses[meses.length-1].total - meses[meses.length-2].total : 0;
            resumen.innerHTML = `
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Este mes</p>
                    <p class="text-base font-black text-emerald-400 leading-tight">${cur}${mesActual.total.toLocaleString('es-CO')}</p>
                </div>
                <div class="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Promedio</p>
                    <p class="text-base font-black text-blue-400 leading-tight">${cur}${promedio.toLocaleString('es-CO')}</p>
                </div>
                <div class="${tendencia >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-2xl p-4 text-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Tendencia</p>
                    <p class="text-base font-black ${tendencia >= 0 ? 'text-emerald-400' : 'text-rose-400'} leading-tight">${tendencia >= 0 ? '▲' : '▼'} ${cur}${Math.abs(tendencia).toLocaleString('es-CO')}</p>
                </div>`;

            // Meta semanal
            const metaSem = parseFloat(localStorage.getItem('metaSemanal')) || 0;
            const cardSem = document.getElementById('meta-semanal-card');
            if (metaSem > 0) {
                cardSem.classList.remove('hidden');
                // Calcular inicio de semana (lunes)
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay()||7)-1));
                const semStart = lunes.getTime();
                const semTotal = orders.filter(o => o.sta==='entregado' && (o.fechaEntrega||o.fecha) >= semStart).reduce((a,b) => a+(b.val||0), 0)
                               + sales.filter(s => s.fecha >= semStart && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega').reduce((a,b) => a+(b.val||0), 0);
                const pct = Math.min(100, Math.round((semTotal / metaSem) * 100));
                const diasRestantes = 7 - ((hoy.getDay()||7) - 1);
                const faltante      = Math.max(0, metaSem - semTotal);
                const porDia        = diasRestantes > 0 ? Math.ceil(faltante / diasRestantes) : 0;
                document.getElementById('meta-sem-pct').innerText   = pct + '%';
                document.getElementById('meta-sem-fill').style.width = pct + '%';
                document.getElementById('meta-sem-actual').innerText = cur + semTotal.toLocaleString('es-CO');
                document.getElementById('meta-sem-goal').innerText   = 'Meta: ' + cur + metaSem.toLocaleString('es-CO');
                document.getElementById('meta-sem-label').innerText  = `Semana del ${lunes.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}`;
                document.getElementById('meta-sem-daily').innerText  = pct >= 100 ? '🎉 ¡Meta semanal alcanzada!' : `Necesitas ${cur}${porDia.toLocaleString('es-CO')}/día para llegar`;
            } else {
                cardSem.classList.add('hidden');
            }
        }

        // ==================== BLOQUE B: ÓRDENES DE COMPRA ====================
        let _ocStock = [];
        let _ocThreshold = 3;
        function _renderOCItems(query = '') {
            const list = document.getElementById('oc-items-list');
            const q = query.trim().toLowerCase();
            const visible = _ocStock.filter(s => !q || `${s.n} ${s.code || ''} ${s.supplier || ''}`.toLowerCase().includes(q));
            if (!visible.length) { list.innerHTML = '<p class="text-center text-slate-500 text-sm py-6">No hay productos que coincidan.</p>'; return; }
            list.innerHTML = visible.map(s => {
                const low = Number(s.q || 0) <= Number(s.minStock || _ocThreshold);
                const checked = document.getElementById(`oc-check-${s.id}`)?.checked ?? low;
                const qty = document.getElementById(`oc-qty-${s.id}`)?.value || Math.max(1, (Number(s.minStock || _ocThreshold) * 2) - Number(s.q || 0));
                return `<label class="flex items-center gap-3 bg-black/20 rounded-xl p-3 border ${low ? 'border-amber-500/30' : 'border-white/10'} cursor-pointer">
                    <input type="checkbox" id="oc-check-${s.id}" data-stock-id="${s.id}" ${checked ? 'checked' : ''} aria-label="Incluir ${escapeHtml(s.n)} en la orden" class="w-5 h-5 accent-orange-500">
                    <span class="flex-1 min-w-0"><span class="block text-sm font-bold text-white truncate">${escapeHtml(s.n)}</span>
                    <span class="block text-xs text-slate-400 mt-1">${s.code ? `Código ${escapeHtml(s.code)} · ` : ''}Disponible: ${Number(s.q || 0)}${low ? ' · Bajo mínimo' : ''}</span>
                    ${s.supplier ? `<span class="block text-xs text-cyan-300 mt-1">Proveedor habitual: ${escapeHtml(s.supplier)}</span>` : ''}
                    ${s.supplierTel ? `<span class="block text-xs text-slate-400 mt-1">Contacto: ${escapeHtml(s.supplierTel)}</span>` : ''}</span>
                    <span class="flex items-center gap-1" onclick="event.stopPropagation()"><input type="number" value="${qty}" min="1" inputmode="numeric" aria-label="Cantidad de ${escapeHtml(s.n)}" class="w-16 text-center text-sm font-bold" id="oc-qty-${s.id}"><span class="text-xs text-slate-400">uds.</span></span>
                </label>`;
            }).join('');
            _updateOCCount();
        }
        function _updateOCCount() {
            const count = document.querySelectorAll('#oc-items-list input[type="checkbox"]:checked').length;
            const el = document.getElementById('oc-selection-count');
            if (el) el.textContent = `${count} producto${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}`;
        }
        async function _updateOCSupplierContact() {
            const provs = await getAll('proveedores');
            const p = provs.find(x => String(x.id) === document.getElementById('oc-proveedor').value);
            const el = document.getElementById('oc-proveedor-contacto');
            if (!el) return;
            el.textContent = p ? (p.tel ? `WhatsApp: ${p.tel}` : 'Este proveedor no tiene WhatsApp guardado.') : 'Elige el proveedor que recibirá esta orden.';
        }
        async function openOrdenesCompra() {
            const provs = await getAll('proveedores');
            _ocStock = await getAll('stock');
            _ocThreshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            const sel = document.getElementById('oc-proveedor');
            sel.innerHTML = '<option value="">Selecciona un proveedor…</option>' + provs.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}${p.tel ? ` · ${escapeHtml(p.tel)}` : ''}</option>`).join('');
            document.getElementById('oc-subtitle').innerText = `${_ocStock.length} productos disponibles · ${_ocStock.filter(s => Number(s.q || 0) <= Number(s.minStock || _ocThreshold)).length} bajo mínimo`;
            document.getElementById('oc-notas').value = '';
            document.getElementById('oc-search').value = '';
            _renderOCItems();
            _updateOCSupplierContact();
            document.getElementById('modal-ordenes-compra').classList.remove('hidden');
        }
        document.addEventListener('change', e => { if (e.target.matches('#oc-items-list input[type="checkbox"]')) _updateOCCount(); if (e.target.id === 'oc-proveedor') _updateOCSupplierContact(); });
        document.addEventListener('input', e => { if (e.target.id === 'oc-search') _renderOCItems(e.target.value); });
        document.addEventListener('click', e => { if (e.target.id === 'oc-select-low') { document.querySelectorAll('#oc-items-list input[type="checkbox"]').forEach(cb => { const s = _ocStock.find(x => String(x.id) === cb.dataset.stockId); cb.checked = !!s && Number(s.q || 0) <= Number(s.minStock || _ocThreshold); }); _updateOCCount(); } });

        function closeOrdenesCompra() {
            document.getElementById('modal-ordenes-compra').classList.add('hidden');
        }

        // Pedido rápido al proveedor asociado de un repuesto bajo mínimo
        // ════════════════════════════════════════════════════════════════════════
        // TOUR GUIADO v1 — Sistema de onboarding para usuarios nuevos
        // ════════════════════════════════════════════════════════════════════════
        const _TOUR_STEPS = [
            {
                target: '#btn-taller',
                emoji: '🔧',
                title: 'Aquí empieza todo',
                text: 'Este botón "Taller" es donde recibes los equipos de los clientes. Cada vez que llegue un cliente con un equipo dañado, tocas aquí primero.',
                position: 'top'
            },
            {
                target: '#c-nom',
                emoji: '👤',
                title: 'Nombre del cliente',
                text: 'Escribe el nombre completo del cliente aquí. Si ya lo habías atendido antes, te aparece una tarjeta azul con su historial. Puedes tocarla para ver qué le has reparado.',
                position: 'bottom'
            },
            {
                target: '#c-tel',
                emoji: '📱',
                title: 'WhatsApp del cliente',
                text: 'Muy importante escribir bien el número. La app envía mensajes automáticos al cliente por WhatsApp cuando su equipo está listo.',
                position: 'bottom'
            },
            {
                target: '#c-equ',
                emoji: '🔌',
                title: 'Describe el equipo',
                text: 'Escribe marca, modelo y tipo. Por ejemplo: "OSTER LICUADORA" o "LG NEVERA". Así después es fácil buscar.',
                position: 'bottom'
            },
            {
                target: '#c-fal',
                emoji: '⚠️',
                title: 'La falla reportada',
                text: 'Escribe qué le pasa al equipo. Lo que te dijo el cliente. Por ejemplo: "NO PRENDE" o "HACE RUIDO EXTRAÑO". Con letra sencilla, sin complicarse.',
                position: 'top'
            },
            {
                target: '#btn-ordenes',
                emoji: '📋',
                title: 'Todas las órdenes',
                text: 'Aquí ves todos los equipos que has recibido. Puedes cambiar el estado (en revisión, reparado, entregado) tocando el botón de estado en cada orden.',
                position: 'top'
            },
            {
                target: '#btn-ventas',
                emoji: '💵',
                title: 'Caja e inventario',
                text: 'En "Caja" registras ventas de repuestos y gastos del día. Y manejas el inventario. Todo el dinero que entra y sale pasa por aquí.',
                position: 'top'
            },
            {
                target: '#btn-admin',
                emoji: '📊',
                title: 'Datos y reportes',
                text: 'En "Datos" ves los reportes del mes, estadísticas, y ajustes. Al final del mes revisa aquí cuánto ganaste. Y usa "Respaldar" para guardar tu información en Google Drive.',
                position: 'top'
            }
        ];
        let _tourIdx = 0;
        let _tourActive = false;

