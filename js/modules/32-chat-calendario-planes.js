/* Nelson App Pro · js/modules/32-chat-calendario-planes.js
   Chat de orden, calendario y planes de pago
   (extraido sin cambios de index.html; el orden de carga importa) */
        async function openOrderChat(orderId) {
            _chatOrderId = orderId;
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === orderId);
            if (!o) return;
            document.getElementById('chat-order-subtitle').innerText =
                `${formatOrderNum(o.orderNum||0)} · ${o.nom} · ${o.equ}`;
            await renderChatMessages();
            document.getElementById('modal-order-chat').classList.remove('hidden');
            document.getElementById('chat-input').focus();
        }

        function closeOrderChat() {
            document.getElementById('modal-order-chat').classList.add('hidden');
            _chatOrderId = null;
        }

        async function renderChatMessages() {
            if (!_chatOrderId) return;
            const msgs = await getAll('orderChat');
            const ordenMsgs = msgs
                .filter(m => m.ordenId === _chatOrderId)
                .sort((a,b) => a.fecha - b.fecha);

            const container = document.getElementById('chat-messages');
            if (!ordenMsgs.length) {
                container.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">
                    <p class="text-2xl mb-2">💬</p>
                    <p>Sin notas aún. Usa el chat para registrar<br>el seguimiento de esta orden.</p>
                </div>`;
                return;
            }

            const autorColors = { 'Taller':'cyan', 'Sistema':'slate' };
            container.innerHTML = ordenMsgs.map(m => {
                const fecha = new Date(m.fecha).toLocaleString('es-ES',
                    {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                const color = autorColors[m.autor] || 'orange';
                return `<div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2">
                        <span class="text-[9px] font-black text-${color}-400">${escapeHtml(m.autor)}</span>
                        <span class="text-[9px] text-slate-600">${fecha}</span>
                    </div>
                    <div class="bg-${color === 'cyan' ? 'cyan' : 'slate'}-900/40 border border-${color === 'cyan' ? 'cyan' : 'slate'}-500/20 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-slate-200 max-w-[90%]">
                        ${escapeHtml(m.texto)}
                    </div>
                </div>`;
            }).join('');
            // Scroll al final
            container.scrollTop = container.scrollHeight;
        }

        async function sendChatMsg() {
            const input = document.getElementById('chat-input');
            const texto = input.value.trim();
            if (!texto || !_chatOrderId) return;
            await put('orderChat', {
                id: _uid(), ordenId: _chatOrderId,
                texto, autor: 'Taller', fecha: Date.now()
            });
            input.value = '';
            await renderChatMessages();
        }

        async function quickChat(texto) {
            if (!_chatOrderId) return;
            await put('orderChat', {
                id: _uid(), ordenId: _chatOrderId,
                texto, autor: 'Taller', fecha: Date.now()
            });
            await renderChatMessages();
        }

        // Auto-registrar mensajes del sistema al cambiar estado
        async function logChatSistema(ordenId, texto) {
            await put('orderChat', {
                id: _uid(), ordenId,
                texto, autor: 'Sistema', fecha: Date.now()
            });
        }

        // ==================== BLOQUE A: CALENDARIO DE ENTREGAS ====================
        let _calOffset = 0; // semanas desde hoy
        let _calSelectedDay = null;

        async function openCalendarioEntregas() {
            _calOffset = 0;
            _calSelectedDay = null;
            document.getElementById('modal-calendario').classList.remove('hidden');
            await renderCalendario();
        }

        function closeCalendario() {
            document.getElementById('modal-calendario').classList.add('hidden');
        }

        async function navCalendario(dir) {
            _calOffset += dir;
            await renderCalendario();
        }

        async function renderCalendario() {
            const orders = await getAll('orders');
            const hoy    = new Date();
            // Inicio de la semana actual + offset
            const startOfWeek = new Date(hoy);
            startOfWeek.setDate(hoy.getDate() - hoy.getDay() + 1 + (_calOffset * 7)); // lunes
            startOfWeek.setHours(0,0,0,0);

            const weekDays = Array.from({length:7}, (_,i) => {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                return d;
            });

            // Label de la semana
            const opts = {day:'2-digit',month:'short'};
            document.getElementById('cal-week-label').innerText =
                `${weekDays[0].toLocaleDateString('es-ES',opts)} – ${weekDays[6].toLocaleDateString('es-ES',opts)}`;
            document.getElementById('cal-period-label').innerText =
                weekDays[0].toLocaleDateString('es-ES',{month:'long',year:'numeric'});

            // Órdenes con fecha estimada activas
            const activas = orders.filter(o => o.sta !== 'entregado' && o.fechaEstimada);

            const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
            const grid = document.getElementById('cal-grid');
            grid.innerHTML = weekDays.map((d, i) => {
                const dStr    = d.toISOString().slice(0,10);
                const todayStr= hoy.toISOString().slice(0,10);
                const isToday = dStr === todayStr;
                const isSel   = _calSelectedDay === dStr;
                const dayOrds = activas.filter(o => o.fechaEstimada === dStr);
                const nowTs   = Date.now();
                const hasLate = dayOrds.some(o => new Date(o.fechaEstimada+'T23:59:59').getTime() < nowTs);
                const hasToday= dayOrds.some(o => o.fechaEstimada === todayStr);

                let dotColor = 'bg-emerald-400';
                if (hasLate)  dotColor = 'bg-rose-400';
                else if (hasToday) dotColor = 'bg-amber-400';

                return `<button onclick="selectCalDay('${dStr}')"
                    class="flex flex-col items-center py-2 rounded-xl transition active:scale-95
                    ${isSel ? 'bg-violet-600 text-white' : isToday ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-700/60'}">
                    <span class="text-[9px] font-bold">${dayNames[i]}</span>
                    <span class="text-base font-black">${d.getDate()}</span>
                    ${dayOrds.length ? `<span class="${dotColor} w-1.5 h-1.5 rounded-full mt-0.5"></span>` : '<span class="w-1.5 h-1.5 mt-0.5"></span>'}
                </button>`;
            }).join('');

            if (_calSelectedDay) await renderCalDayOrders(activas);
            else {
                document.getElementById('cal-day-title').innerText = 'Toca un día para ver las órdenes';
                document.getElementById('cal-day-orders').innerHTML = '';
            }
        }

        async function selectCalDay(dStr) {
            _calSelectedDay = dStr;
            const orders  = await getAll('orders');
            const activas = orders.filter(o => o.sta !== 'entregado' && o.fechaEstimada);
            await renderCalDayOrders(activas);
            // Redibujar grid para marcar selección
            await renderCalendario();
        }

        async function renderCalDayOrders(activas) {
            const dStr  = _calSelectedDay;
            const cur   = getCurrency();
            const nowTs = Date.now();
            const dayOrds = activas.filter(o => o.fechaEstimada === dStr);

            const dateLabel = new Date(dStr + 'T12:00:00').toLocaleDateString('es-ES',
                {weekday:'long',day:'numeric',month:'long'});
            document.getElementById('cal-day-title').innerText =
                dayOrds.length ? `${dateLabel} — ${dayOrds.length} entrega${dayOrds.length>1?'s':''}` : `${dateLabel} — Sin entregas`;

            const container = document.getElementById('cal-day-orders');
            if (!dayOrds.length) {
                container.innerHTML = '<p class="text-center text-slate-500 text-xs py-4">Sin órdenes programadas para este día</p>';
                return;
            }

            container.innerHTML = dayOrds.map(o => {
                const isLate   = new Date(o.fechaEstimada+'T23:59:59').getTime() < nowTs;
                const staEmoji = {recibido:'📥',revisión:'🔍',reparado:'✅',entregado:'📦'}[o.sta]||'📋';
                const color    = isLate ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/10 bg-black/20';
                return `<div class="rounded-xl p-3 border ${color} flex justify-between items-center">
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-black text-white truncate">${staEmoji} ${escapeHtml(o.nom)}</p>
                        <p class="text-[10px] text-slate-400 truncate">${escapeHtml(o.equ)}</p>
                        ${o.tecnico ? `<p class="text-[9px] text-slate-500">👷 ${escapeHtml(o.tecnico)}</p>` : ''}
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                        <p class="text-xs font-black text-emerald-400">${cur}${(o.val||0).toLocaleString()}</p>
                        ${isLate ? `<p class="text-[9px] text-rose-400 font-bold">⚠️ Vencida</p>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        // ==================== BLOQUE A: PLANES DE PAGO ====================
        let _planOrderId  = null;
        let _planOrderVal = 0;

        async function openPaymentPlan(orderId) {
            _planOrderId = orderId;
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === orderId);
            if (!o) return;
            _planOrderVal = o.val || 0;
            const cur = getCurrency();
            document.getElementById('plan-order-subtitle').innerText =
                `${formatOrderNum(o.orderNum||0)} · ${o.nom} · ${escapeHtml(o.equ)}`;
            document.getElementById('plan-total').innerText   = cur + _planOrderVal.toLocaleString('es-CO');
            document.getElementById('plan-ncuotas').value     = 3;
            previewCuotas();
            await renderPlanCuotas();
            document.getElementById('modal-payment-plan').classList.remove('hidden');
        }

        function closePaymentPlan() {
            document.getElementById('modal-payment-plan').classList.add('hidden');
            _planOrderId = null;
        }

        function previewCuotas() {
            const n   = parseInt(document.getElementById('plan-ncuotas')?.value) || 1;
            const cur = getCurrency();
            const val = Math.ceil(_planOrderVal / n);
            const el  = document.getElementById('plan-cuota-preview');
            if (el) el.innerText = cur + val.toLocaleString('es-CO');
        }

        async function createPaymentPlan() {
            if (!_planOrderId) return;
            const n   = parseInt(document.getElementById('plan-ncuotas').value) || 1;
            const cur = getCurrency();
            // Eliminar plan anterior de esta orden si existe
            const existing = await getAll('paymentPlans');
            for (const p of existing.filter(p => p.ordenId === _planOrderId)) {
                await del('paymentPlans', p.id);
            }
            // Crear cuotas nuevas
            const valCuota = Math.ceil(_planOrderVal / n);
            for (let i = 0; i < n; i++) {
                await put('paymentPlans', {
                    id: Date.now() + i,
                    ordenId: _planOrderId,
                    numero: i + 1,
                    total: n,
                    monto: i === n-1 ? _planOrderVal - valCuota*(n-1) : valCuota, // última cuota ajustada
                    pagado: false,
                    fechaPago: null,
                    createdAt: Date.now()
                });
            }
            await renderPlanCuotas();
            showToast(`Plan de ${n} cuota${n>1?'s':''} creado ✅`, 'success');
        }

        async function renderPlanCuotas() {
            if (!_planOrderId) return;
            const plans = await getAll('paymentPlans');
            const cuotas = plans
                .filter(p => p.ordenId === _planOrderId)
                .sort((a,b) => a.numero - b.numero);
            const cur = getCurrency();

            const totalPagado  = cuotas.filter(p => p.pagado).reduce((s,p) => s + p.monto, 0);
            const totalPend    = cuotas.filter(p => !p.pagado).reduce((s,p) => s + p.monto, 0);
            document.getElementById('plan-paid').innerText    = cur + totalPagado.toLocaleString('es-CO');
            document.getElementById('plan-pending').innerText = cur + totalPend.toLocaleString('es-CO');

            const container = document.getElementById('plan-cuotas-list');
            if (!cuotas.length) {
                container.innerHTML = '<p class="text-center text-slate-500 text-xs py-4">Sin plan creado. Define las cuotas arriba.</p>';
                return;
            }

            container.innerHTML = cuotas.map(c => {
                const fechaStr = c.fechaPago
                    ? new Date(c.fechaPago).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})
                    : '—';
                return `<div class="flex items-center gap-3 p-3 rounded-xl ${c.pagado ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-black/20 border border-white/5'}">
                    <div class="flex-1">
                        <p class="text-xs font-black ${c.pagado ? 'text-emerald-400' : 'text-white'}">
                            Cuota ${c.numero} de ${c.total}
                        </p>
                        <p class="text-[10px] text-slate-400">
                            ${cur}${c.monto.toLocaleString('es-CO')}
                            ${c.pagado ? `· Pagado el ${fechaStr}` : ''}
                        </p>
                    </div>
                    ${!c.pagado
                        ? `<button onclick="markCuotaPagada(${c.id})"
                            class="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-[10px] font-black active:scale-95 transition">
                            ✅ Pagar
                          </button>`
                        : `<span class="text-emerald-400 text-lg">✅</span>`
                    }
                </div>`;
            }).join('');
        }

        async function markCuotaPagada(cuotaId) {
            const plans = await getAll('paymentPlans');
            const cuota = plans.find(p => p.id === cuotaId);
            if (!cuota) return;
            cuota.pagado    = true;
            cuota.fechaPago = Date.now();
            await put('paymentPlans', cuota);
            // Registrar en caja como pago parcial
            await put('sales', {
                id: _uid(), item: `Cuota ${cuota.numero}/${cuota.total} — Plan de pago`,
                val: cuota.monto, qty: 1, stockId: null,
                fecha: Date.now(), tipo: 'cuota', ordenId: _planOrderId
            });
            await updateTotal();
            await renderPlanCuotas();
            showToast(`Cuota ${cuota.numero} marcada como pagada ✅`, 'success');
        }

