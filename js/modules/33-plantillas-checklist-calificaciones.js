/* Nelson App Pro · js/modules/33-plantillas-checklist-calificaciones.js
   Plantillas, checklist y calificaciones
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== BLOQUE C: PLANTILLAS DE ÓRDENES ====================
        async function openPlantillasModal() {
            await renderPlantillasList();
            document.getElementById('modal-plantillas').classList.remove('hidden');
        }
        function closePlantillasModal() { document.getElementById('modal-plantillas').classList.add('hidden'); }

        async function renderPlantillasList() {
            const plantillas = JSON.parse(localStorage.getItem('ordenPlantillas') || '[]');
            const list = document.getElementById('plantillas-list');
            if (!plantillas.length) {
                list.innerHTML = `<p class="text-center text-slate-500 text-sm py-8">Sin plantillas guardadas aún.<br>
                    Rellena el formulario de nueva orden y toca "+ Guardar como plantilla".</p>`;
                return;
            }
            const cur = getCurrency();
            list.innerHTML = plantillas.map((p, i) => `
                <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3 border border-indigo-500/20">
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-black text-white truncate">📋 ${escapeHtml(p.nombre)}</p>
                        <p class="text-[10px] text-indigo-300 truncate">${escapeHtml(p.equ)} · ${escapeHtml(p.det||'').substring(0,40)}</p>
                        ${p.val ? `<p class="text-[10px] text-emerald-400 font-bold">${cur}${p.val.toLocaleString()}</p>` : ''}
                    </div>
                    <div class="flex gap-1 flex-shrink-0">
                        <button onclick="aplicarPlantilla(${i})"
                            class="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-xl text-[10px] font-black active:scale-95 transition">
                            Usar
                        </button>
                        <button onclick="eliminarPlantilla(${i})"
                            class="bg-rose-500/10 text-rose-400 w-7 h-7 rounded-lg text-xs flex items-center justify-center active:scale-95">
                            🗑️
                        </button>
                    </div>
                </div>`).join('');
        }

        function openGuardarPlantilla() {
            document.getElementById('plantilla-nombre').value = '';
            document.getElementById('modal-guardar-plantilla').classList.remove('hidden');
        }
        function closeGuardarPlantilla() { document.getElementById('modal-guardar-plantilla').classList.add('hidden'); }

        function guardarPlantilla() {
            const nombre = document.getElementById('plantilla-nombre').value.trim();
            if (!nombre) return showAlert('Ingresa un nombre para la plantilla.', 'warning');
            const equ  = document.getElementById('c-equ')?.value.trim().toUpperCase() || '';
            const det  = document.getElementById('c-fal')?.value.trim().toUpperCase() || '';
            const val  = parseFloat(document.getElementById('c-val')?.value) || 0;
            const gar  = parseInt(document.getElementById('c-garantia')?.value) || 30;
            const tec  = document.getElementById('c-tecnico')?.value || '';
            if (!equ && !det) return showAlert('El formulario está vacío. Rellena al menos el equipo o la falla.', 'warning');
            const plantillas = JSON.parse(localStorage.getItem('ordenPlantillas') || '[]');
            plantillas.push({ nombre, equ, det, val, gar, tec, createdAt: Date.now() });
            localStorage.setItem('ordenPlantillas', JSON.stringify(plantillas));
            closeGuardarPlantilla();
            renderPlantillasList();
            showToast(`Plantilla "${nombre}" guardada ✅`, 'success');
        }

        function aplicarPlantilla(i) {
            const plantillas = JSON.parse(localStorage.getItem('ordenPlantillas') || '[]');
            const p = plantillas[i];
            if (!p) return;
            if (p.equ)  document.getElementById('c-equ').value  = p.equ;
            if (p.det)  document.getElementById('c-fal').value  = p.det;
            if (p.val)  document.getElementById('c-val').value  = p.val;
            if (p.gar)  document.getElementById('c-garantia').value = p.gar;
            if (p.tec)  document.getElementById('c-tecnico').value  = p.tec;
            closePlantillasModal();
            showToast(`Plantilla "${p.nombre}" aplicada ✅`, 'success');
        }

        function eliminarPlantilla(i) {
            showConfirm('¿Eliminar esta plantilla?', () => {
                const plantillas = JSON.parse(localStorage.getItem('ordenPlantillas') || '[]');
                plantillas.splice(i, 1);
                localStorage.setItem('ordenPlantillas', JSON.stringify(plantillas));
                renderPlantillasList();
                showToast('Plantilla eliminada', 'info');
            });
        }

        // ==================== BLOQUE C: CHECKLIST DE DIAGNÓSTICO ====================
        const _checklists = {
            licuadora: [
                'Motor enciende al conectar','Ruido anormal en el motor','Cuchillas en buen estado',
                'Acople/samurai en buen estado','Empaque de jarra sin grietas','Vaso/jarra sin fisuras',
                'Botones/suiche funcionan','Cable de poder sin daños','Base sin golpes visibles'
            ],
            ventilador: [
                'Motor gira al encender','Ruido o vibración excesiva','Todas las velocidades funcionan',
                'Condensador en buen estado','Cableado interno sin quemaduras','Aspas/élices completas y rectas',
                'Rejilla sin deformaciones','Base o pie estable','Oscilación funciona (si aplica)'
            ],
            olla: [
                'Empaque principal en buen estado','Válvula de presión limpia y libre','Tapón de seguridad OK',
                'Manija sin fisuras','Cuerpo sin deformaciones','Cierre hermético verificado',
                'Sin óxido interno visible','Sello de goma sin desgaste'
            ],
            plancha: [
                'Suela sin rayones profundos','Cable sin pelados ni dobleces','Vapor funciona (si aplica)',
                'Termostato responde','Luz indicadora enciende','Tapa superior sin grietas',
                'Botón de vapor sin atasco'
            ],
            lavadora: [
                'Tablero de control responde','Agitador/tambor gira correctamente','Sin ruidos metálicos al girar',
                'Mangueras sin grietas','Bomba de desagüe funciona','Programa completo sin interrupción',
                'Puerta/tapa cierra bien','Nivel de agua correcto','Sin fugas visibles'
            ],
            nevera: [
                'Compresor enciende','Temperatura alcanza nivel mínimo','Ventilador interno funciona',
                'Termostato responde','Puerta sella herméticamente','Sin escarchas excesivas',
                'Bandeja de agua bien ubicada','Sin ruidos anormales','Luz interior funciona'
            ],
            tv: [
                'Enciende y apaga correctamente','Imagen sin líneas o manchas','Audio sin distorsión',
                'Control remoto funciona','Entradas HDMI/USB OK','Sin parpadeos al calentar',
                'Bordes de pantalla sin oscuridad','Menú y configuración accesibles'
            ],
            general: [
                'Verificación visual de daños externos','Cable de alimentación en buen estado',
                'Componentes internos sin quemaduras','Tornillos y carcasa completos',
                'Prueba de encendido/apagado','Función principal verificada','Sin olores a quemado'
            ]
        };

        let _checklistMarcados = {};

        function openChecklistModal() {
            _checklistMarcados = {};
            renderChecklist();
            document.getElementById('modal-checklist').classList.remove('hidden');
        }
        function closeChecklistModal() { document.getElementById('modal-checklist').classList.add('hidden'); }

        function renderChecklist() {
            const tipo  = document.getElementById('checklist-tipo').value;
            const items = _checklists[tipo] || [];
            _checklistMarcados = {};
            document.getElementById('checklist-subtitle').innerText =
                `${items.length} puntos · ${document.getElementById('checklist-tipo').options[document.getElementById('checklist-tipo').selectedIndex].text}`;

            document.getElementById('checklist-items').innerHTML = items.map((item, i) => `
                <label class="flex items-center gap-3 p-3 rounded-xl bg-black/20 cursor-pointer hover:bg-teal-500/10 transition">
                    <input type="checkbox" class="checklist-cb w-4 h-4 rounded accent-teal-500" data-i="${i}" data-txt="${escapeHtml(item)}"
                        onchange="_checklistMarcados[${i}]=this.checked">
                    <span class="text-xs text-slate-200 font-bold">${escapeHtml(item)}</span>
                </label>`).join('');
        }

        function aplicarChecklist() {
            const tipo  = document.getElementById('checklist-tipo').value;
            const items = _checklists[tipo] || [];
            const marcados = items.filter((_, i) => _checklistMarcados[i]);
            const noMarcados = items.filter((_, i) => !_checklistMarcados[i]);

            let resumen = '';
            if (marcados.length)   resumen += 'OK: ' + marcados.join(', ') + '. ';
            if (noMarcados.length) resumen += 'REVISAR: ' + noMarcados.join(', ') + '.';

            const falEl = document.getElementById('c-fal');
            if (falEl) {
                const actual = falEl.value.trim();
                falEl.value = actual ? actual + '\n' + resumen.toUpperCase() : resumen.toUpperCase();
            }
            closeChecklistModal();
            showToast('Checklist aplicado al diagnóstico ✅', 'success');
        }

        // ==================== BLOQUE C: CALIFICACIONES DEL SERVICIO ====================
        let _calOrderId   = null;
        let _calStarSel   = 0;

        function promptCalificacion(o) {
            _calOrderId = o.id;
            _calStarSel = 0;
            document.getElementById('pedir-cal-cliente').innerText = `${o.nom} · ${o.equ}`;
            document.getElementById('cal-comentario').value = '';
            // Reset estrellas
            document.querySelectorAll('.cal-star').forEach(s => s.style.opacity = '0.35');
            document.getElementById('modal-pedir-calificacion').classList.remove('hidden');
        }

        function closePedirCalificacion() {
            document.getElementById('modal-pedir-calificacion').classList.add('hidden');
            _calOrderId = null;
        }

        function selectStar(val) {
            _calStarSel = val;
            document.querySelectorAll('.cal-star').forEach((s, i) => {
                s.style.opacity = i < val ? '1' : '0.3';
                s.style.transform = i < val ? 'scale(1.15)' : 'scale(1)';
            });
        }

        async function guardarCalificacion() {
            if (!_calStarSel) return showAlert('Selecciona al menos 1 estrella.', 'warning');
            const orders   = await getAll('orders');
            const o        = orders.find(x => x.id === _calOrderId);
            const cal = {
                id:          Date.now(),
                ordenId:     _calOrderId,
                cliente:     o?.nom    || '',
                equipo:      o?.equ    || '',
                estrellas:   _calStarSel,
                comentario:  document.getElementById('cal-comentario').value.trim(),
                fecha:       Date.now()
            };
            // Guardar en IndexedDB (incluido en backups)
            await put('calificaciones', cal);
            closePedirCalificacion();
            showToast(`⭐ Calificación de ${_calStarSel} estrella${_calStarSel!==1?'s':''} guardada`, 'success');
        }

        async function openCalificacionesModal() {
            // Migración automática: mover calificaciones viejas de localStorage a IndexedDB (solo una vez)
            if (!localStorage.getItem('_calMigrated')) {
                const legacy = localStorage.getItem('calificaciones');
                if (legacy) {
                    try {
                        const viejas = JSON.parse(legacy);
                        for (const c of viejas) await put('calificaciones', c);
                        localStorage.removeItem('calificaciones');
                    } catch(e) { /* ignorar error de migración */ }
                }
                localStorage.setItem('_calMigrated', '1');
            }

            const cals = (await getAll('calificaciones')).sort((a,b) => b.fecha - a.fecha);
            const cur  = getCurrency();
            const promedio = cals.length ? (cals.reduce((s,c) => s+c.estrellas,0) / cals.length).toFixed(1) : '—';
            const dist = [5,4,3,2,1].map(n => ({ n, count: cals.filter(c=>c.estrellas===n).length }));

            document.getElementById('cal-avg-label').innerText =
                cals.length ? `⭐ ${promedio} · ${cals.length} reseña${cals.length!==1?'s':''}` : 'Sin reseñas aún';

            const stars  = n => '⭐'.repeat(n) + '☆'.repeat(5-n);
            const maxDist = Math.max(...dist.map(d => d.count), 1);

            document.getElementById('calificaciones-content').innerHTML = `
                <!-- Distribución -->
                <div class="bg-black/30 rounded-2xl p-4 space-y-2">
                    <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Distribución</p>
                    ${dist.map(d => `
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-slate-300 w-4">${d.n}</span>
                            <div class="flex-1 h-2 bg-white/08 rounded-full overflow-hidden bg-white/5">
                                <div class="h-full bg-yellow-400 rounded-full transition-all duration-700"
                                    style="width:${Math.round((d.count/maxDist)*100)}%"></div>
                            </div>
                            <span class="text-[10px] text-slate-400 w-4 text-right">${d.count}</span>
                        </div>`).join('')}
                </div>
                <!-- Lista reseñas -->
                ${cals.length ? cals.slice(0,20).map(c => `
                    <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                        <div class="flex justify-between items-start">
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-black text-white truncate">${escapeHtml(c.cliente)}</p>
                                <p class="text-[10px] text-slate-400 truncate">${escapeHtml(c.equipo)}</p>
                            </div>
                            <div class="text-right flex-shrink-0 ml-2">
                                <p class="text-sm">${'⭐'.repeat(c.estrellas)}</p>
                                <p class="text-[9px] text-slate-500">${new Date(c.fecha).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</p>
                            </div>
                        </div>
                        ${c.comentario ? `<p class="text-[10px] text-slate-300 mt-1 italic">"${escapeHtml(c.comentario)}"</p>` : ''}
                    </div>`).join('')
                : '<p class="text-center text-slate-500 text-sm py-8">Sin calificaciones aún.<br>Aparecerán aquí después de cada entrega.</p>'}`;

            document.getElementById('modal-calificaciones').classList.remove('hidden');
        }

        function closeCalificacionesModal() {
            document.getElementById('modal-calificaciones').classList.add('hidden');
        }

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

