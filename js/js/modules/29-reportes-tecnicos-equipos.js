/* Nelson App Pro · js/modules/29-reportes-tecnicos-equipos.js
   Reportes por tecnico y por equipo
   (extraido sin cambios de index.html; el orden de carga importa) */
        async function openTecnicosReport() {
            document.getElementById('modal-tecnicos-report').classList.remove('hidden');
            await loadTecnicosReport('mes');
        }
        function closeTecnicosReport() {
            document.getElementById('modal-tecnicos-report').classList.add('hidden');
        }

        async function loadTecnicosReport(mode) {
            _tecReportMode = mode;
            ['mes','todo'].forEach(m => {
                document.getElementById(`tec-tab-${m}`)?.classList.toggle('active', m === mode);
            });

            const orders = await getAll('orders');
            const cur = getCurrency();
            const now = new Date();
            const startMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            const filtered = mode === 'mes'
                ? orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega||o.fecha) >= startMes)
                : orders.filter(o => o.sta === 'entregado');

            document.getElementById('tec-report-period').innerText =
                mode === 'mes' ? `${now.toLocaleString('es-ES',{month:'long',year:'numeric'})}` : 'Todo el tiempo';

            // Agrupar por técnico
            const tecMap = {};
            filtered.forEach(o => {
                const tec = o.tecnico || '(Sin asignar)';
                if (!tecMap[tec]) tecMap[tec] = { ordenes:[], valor:0 };
                tecMap[tec].ordenes.push(o);
                tecMap[tec].valor += (o.val||0);
            });

            const stats = Object.entries(tecMap).map(([tec, data]) => {
                const dias = data.ordenes
                    .filter(o => o.fechaEntrega && o.fecha)
                    .map(o => Math.round((o.fechaEntrega - o.fecha) / 86400000));
                const promDias = dias.length ? Math.round(dias.reduce((a,b)=>a+b,0)/dias.length) : 0;
                const minDias  = dias.length ? Math.min(...dias) : 0;
                const maxDias  = dias.length ? Math.max(...dias) : 0;
                return { tec, total: data.ordenes.length, valor: data.valor, promDias, minDias, maxDias };
            }).sort((a,b) => b.total - a.total);

            const maxVal = Math.max(...stats.map(s => s.valor), 1);
            const container = document.getElementById('tecnicos-report-content');

            if (!stats.length) {
                container.innerHTML = '<p class="text-center text-slate-500 text-sm py-10">Sin órdenes entregadas en este período.</p>';
                return;
            }

            container.innerHTML = stats.map(s => `
                <div class="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-black text-white text-sm">👷 ${escapeHtml(s.tec)}</span>
                        <span class="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-bold">${s.total} órdenes</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] text-slate-400 w-16 flex-shrink-0">Ingresos</span>
                        <div class="bar-track">
                            <div class="bar-fill bg-gradient-to-r from-emerald-600 to-emerald-400" style="width:${Math.round(s.valor/maxVal*100)}%"></div>
                        </div>
                        <span class="text-[10px] font-black text-emerald-400 w-20 text-right">${cur}${s.valor.toLocaleString()}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-2">
                        <div class="text-center bg-white/5 rounded-xl p-2">
                            <p class="text-[9px] text-slate-500 font-bold">PROM. DÍAS</p>
                            <p class="text-base font-black text-blue-400">${s.promDias}d</p>
                        </div>
                        <div class="text-center bg-white/5 rounded-xl p-2">
                            <p class="text-[9px] text-slate-500 font-bold">MÁS RÁPIDO</p>
                            <p class="text-base font-black text-emerald-400">${s.minDias}d</p>
                        </div>
                        <div class="text-center bg-white/5 rounded-xl p-2">
                            <p class="text-[9px] text-slate-500 font-bold">MÁS LENTO</p>
                            <p class="text-base font-black text-amber-400">${s.maxDias}d</p>
                        </div>
                    </div>
                    <div class="mt-2 text-[10px] text-slate-500 text-right">Ticket prom: <span class="font-bold text-slate-300">${cur}${s.total ? Math.round(s.valor/s.total).toLocaleString() : 0}</span></div>
                </div>`).join('');
        }

        // ==================== REPORTE EQUIPOS MÁS REPARADOS ====================
        let _equReportMode = 'equipo';

        async function openEquiposReport() {
            document.getElementById('modal-equipos-report').classList.remove('hidden');
            await loadEquiposReport('equipo');
        }
        function closeEquiposReport() {
            document.getElementById('modal-equipos-report').classList.add('hidden');
        }

        async function loadEquiposReport(mode) {
            _equReportMode = mode;
            ['equipo','falla','valor'].forEach(m => {
                document.getElementById(`equ-tab-${m}`)?.classList.toggle('active', m === mode);
            });

            const orders = await getAll('orders');
            const cur = getCurrency();
            const container = document.getElementById('equipos-report-content');

            if (mode === 'equipo') {
                // Top equipos por frecuencia
                const equMap = {};
                orders.forEach(o => {
                    const key = (o.equ||'DESCONOCIDO').trim().toUpperCase();
                    if (!equMap[key]) equMap[key] = { total:0, entregados:0, valor:0 };
                    equMap[key].total++;
                    if (o.sta === 'entregado') { equMap[key].entregados++; equMap[key].valor += (o.val||0); }
                });
                const sorted = Object.entries(equMap).sort((a,b) => b[1].total - a[1].total).slice(0,15);
                const maxTotal = Math.max(...sorted.map(s => s[1].total), 1);

                container.innerHTML = sorted.length ? sorted.map(([equ, d], i) => `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3">
                        <span class="text-amber-400 font-black text-base w-6 text-center">${i+1}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-black text-white truncate">${escapeHtml(equ)}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="bar-track" style="max-width:100px;">
                                    <div class="bar-fill bg-gradient-to-r from-amber-600 to-amber-400" style="width:${Math.round(d.total/maxTotal*100)}%"></div>
                                </div>
                                <span class="text-[10px] text-slate-400">${d.total} reparaciones</span>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-[10px] font-black text-emerald-400">${cur}${d.valor.toLocaleString()}</p>
                            <p class="text-[9px] text-slate-500">${d.entregados} entregados</p>
                        </div>
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-10">Sin datos aún.</p>';

            } else if (mode === 'falla') {
                // ── Top fallas/diagnósticos frecuentes (normalizado) ──
                // 1) Quitar acentos y puntuación
                // 2) Filtrar textos que parecen mensajes al cliente (no fallas)
                // 3) Extraer la "raíz" de la falla: primeras 2-3 palabras significativas
                // 4) Agrupar por esa raíz y mostrar la versión más común como etiqueta

                // Palabras que indican que el texto es un aviso/mensaje, NO una falla
                const MENSAJE_HINTS = [
                    'HOLA','AMIGO','BUENAS','BUENOS','SEÑOR','SEÑORA','SRA','SR','DON','DOÑA',
                    'YA SU','SU EQUIPO','SU LAVADORA','SU NEVERA','SU LICUADORA','LISTO PUEDE','PUEDES PASAR',
                    'PUEDE PASAR','PUEDE RECOGER','FAVOR DE','LE INFORMO','LE AVISO','LE COMENTO',
                    'TE INFORMO','TE AVISO','TE COMENTO','GRACIAS','SALUDOS','CONFIRMADO'
                ];

                // Palabras sueltas que no son fallas útiles (artículos, preposiciones, verbos genéricos al inicio)
                const STOPWORDS = new Set([
                    'EL','LA','LOS','LAS','UN','UNA','UNOS','UNAS','DE','DEL','EN','CON','POR','PARA',
                    'SE','LE','LES','ME','TE','NOS','SU','SUS','MI','MIS','TU','TUS','QUE','Y','O','A',
                    'AL','ES','ESTA','ESTE','ESTO','ESA','ESE','ESO','HAY','HA','HAN','HUBO','FUE',
                    'SON','ERA','ERAN','PUDO','PUEDE','PUEDO','VOY','VAMOS','LISTA','LISTO','PASAR'
                ]);

                const normalizar = (s) => {
                    return (s||'')
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quitar acentos
                        .replace(/[.,;:¡!¿?()\-–—_"'“”]/g, ' ')              // quitar puntuación
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toUpperCase();
                };

                const esMensaje = (txt) => {
                    return MENSAJE_HINTS.some(h => txt.includes(h));
                };

                const extraerRaiz = (txt) => {
                    // Tomar hasta 3 primeras palabras significativas (no stopwords)
                    const palabras = txt.split(' ').filter(w => w && !STOPWORDS.has(w));
                    return palabras.slice(0, 3).join(' ');
                };

                const falMap = {}; // raíz -> { count, labels: {textoCompleto: count} }
                orders.forEach(o => {
                    const original = (o.det||'').trim();
                    const norm = normalizar(original);
                    // Filtros de limpieza
                    if (norm.length < 4) return;
                    if (esMensaje(norm)) return;
                    if (norm.split(' ').length < 1) return;
                    // Si el texto original es muy largo (>60 chars), probablemente es una nota/mensaje
                    if (original.length > 60) return;

                    const raiz = extraerRaiz(norm);
                    if (!raiz || raiz.length < 3) return;

                    if (!falMap[raiz]) falMap[raiz] = { count: 0, labels: {} };
                    falMap[raiz].count++;
                    // Guardar la forma original (con acentos y mayúsculas originales) para mostrar la más común
                    const labelKey = normalizar(original); // normalizado para agrupar variantes
                    falMap[raiz].labels[labelKey] = (falMap[raiz].labels[labelKey] || 0) + 1;
                });

                // Elegir la etiqueta más frecuente de cada raíz como texto a mostrar
                const items = Object.entries(falMap).map(([raiz, d]) => {
                    const topLabel = Object.entries(d.labels).sort((a,b) => b[1]-a[1])[0][0];
                    return { label: topLabel, count: d.count };
                });

                const sorted = items.sort((a,b) => b.count - a.count).slice(0,12);
                const maxN = Math.max(...sorted.map(s => s.count), 1);

                container.innerHTML = sorted.length ? sorted.map((it, i) => `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3">
                        <span class="text-rose-400 font-black text-sm w-5 text-center">${i+1}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] font-bold text-white" style="word-break:break-word;">${escapeHtml(it.label)}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="bar-track" style="max-width:80px;">
                                    <div class="bar-fill bg-gradient-to-r from-rose-600 to-rose-400" style="width:${Math.round(it.count/maxN*100)}%"></div>
                                </div>
                                <span class="text-[10px] text-slate-400">${it.count} ${it.count === 1 ? 'vez' : 'veces'}</span>
                            </div>
                        </div>
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-10">Sin diagnósticos registrados.</p>';

            } else if (mode === 'valor') {
                // Top equipos por valor generado
                const valMap = {};
                orders.filter(o => o.sta === 'entregado').forEach(o => {
                    const key = (o.equ||'DESCONOCIDO').trim().toUpperCase();
                    if (!valMap[key]) valMap[key] = { valor:0, total:0 };
                    valMap[key].valor += (o.val||0);
                    valMap[key].total++;
                });
                const sorted = Object.entries(valMap).sort((a,b) => b[1].valor - a[1].valor).slice(0,12);
                const maxVal2 = Math.max(...sorted.map(s=>s[1].valor),1);

                container.innerHTML = sorted.length ? sorted.map(([equ,d],i) => `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3">
                        <span class="text-emerald-400 font-black text-sm w-5 text-center">${i+1}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] font-black text-white truncate">${escapeHtml(equ)}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="bar-track" style="max-width:100px;">
                                    <div class="bar-fill bg-gradient-to-r from-emerald-600 to-emerald-400" style="width:${Math.round(d.valor/maxVal2*100)}%"></div>
                                </div>
                                <span class="text-[10px] text-emerald-400 font-bold">${cur}${d.valor.toLocaleString()}</span>
                            </div>
                        </div>
                        <span class="text-[10px] text-slate-500 flex-shrink-0">${d.total} órd.</span>
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-10">Sin datos aún.</p>';
            }
        }

        // ==================== BLOQUE 3: AUTO-TEMA POR HORARIO ====================
        let _autoThemeInterval = null;

