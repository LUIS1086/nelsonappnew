(function() {
        // ═══════════════════════════════════════════════════════════════
        // NELSON IA — Lógica completamente aislada en un IIFE
        // Usa Gemini 2.0 Flash (gratis hasta 1500 req/día)
        // ═══════════════════════════════════════════════════════════════

        const NIA_KEY_STORAGE = 'nia_gemini_key';
        const NIA_HISTORY_STORAGE = 'nia_chat_history';
        const NIA_MODEL = 'gemini-2.5-flash';
        const NIA_MAX_HISTORY = 10; // últimos 10 mensajes en contexto

        let niaHistory = []; // [{role:'user'|'model', text:''}]
        let niaSending = false;

        const SUGGESTIONS = [
            '💰 Ingresos del mes',
            '📊 Resumen general',
            '💳 ¿Cuánto me deben?',
            '📦 Repuestos por acabarse',
            '⏰ Órdenes atrasadas',
            '👥 Clientes sin volver',
            '🏆 Mejor técnico del mes',
            '📈 Comparar con mes pasado',
            '💡 ¿Qué debo hacer hoy?'
        ];

        // ──────────── Helpers ────────────
        function niaGetKey() {
            try { return localStorage.getItem(NIA_KEY_STORAGE) || ''; } catch(e) { return ''; }
        }
        function niaSetKey(k) {
            try { localStorage.setItem(NIA_KEY_STORAGE, k); } catch(e) {}
        }
        function niaLoadHistory() {
            try {
                const raw = sessionStorage.getItem(NIA_HISTORY_STORAGE);
                niaHistory = raw ? JSON.parse(raw) : [];
            } catch(e) { niaHistory = []; }
        }
        function niaSaveHistory() {
            try {
                // solo guardo en sessionStorage (se borra al cerrar app, es lo correcto)
                sessionStorage.setItem(NIA_HISTORY_STORAGE, JSON.stringify(niaHistory.slice(-NIA_MAX_HISTORY)));
            } catch(e) {}
        }

        // ──────────── Abrir / Cerrar ────────────
        window.niaOpen = function() {
            const modal = document.getElementById('nia-modal');
            const setup = document.getElementById('nia-setup');
            const messages = document.getElementById('nia-messages');
            const suggestions = document.getElementById('nia-suggestions');
            const inputWrap = document.getElementById('nia-input-wrap');

            modal.classList.add('open');
            document.body.classList.add('nia-open');

            const key = niaGetKey();
            if (!key) {
                // Primera vez: mostrar setup
                setup.classList.add('active');
                messages.style.display = 'none';
                suggestions.style.display = 'none';
                inputWrap.style.display = 'none';
                setTimeout(() => document.getElementById('nia-api-key-input').focus(), 300);
            } else {
                // Ya configurado
                setup.classList.remove('active');
                messages.style.display = 'flex';
                suggestions.style.display = 'flex';
                inputWrap.style.display = 'flex';
                niaLoadHistory();
                niaRenderMessages();
                niaRenderSuggestions();
                if (niaHistory.length === 0) niaShowWelcome();
                setTimeout(() => {
                    const inp = document.getElementById('nia-input');
                    if (inp && window.innerWidth >= 768) inp.focus();
                }, 300);
            }
        };

        window.niaClose = function() {
            document.getElementById('nia-modal').classList.remove('open');
            document.body.classList.remove('nia-open');
        };

        // ──────────── Guardar llave ────────────
        window.niaSaveKey = function() {
            const input = document.getElementById('nia-api-key-input');
            const key = (input.value || '').trim();
            if (!key || key.length < 20) {
                if (typeof showAlert === 'function') showAlert('⚠️ La llave parece inválida. Debe empezar con AIza...', 'warning');
                else alert('Llave inválida');
                return;
            }
            niaSetKey(key);
            if (typeof showAlert === 'function') showAlert('✅ Nelson IA activado correctamente', 'success');

            // Recargar UI
            document.getElementById('nia-setup').classList.remove('active');
            document.getElementById('nia-messages').style.display = 'flex';
            document.getElementById('nia-suggestions').style.display = 'flex';
            document.getElementById('nia-input-wrap').style.display = 'flex';
            niaShowWelcome();
            niaRenderSuggestions();
        };

        // ──────────── Pregunta rápida desde la tarjeta de Datos ────────────
        window.niaQuickAsk = function(question) {
            // Primero abro el modal
            niaOpen();
            // Espero a que esté abierto y a que el input esté visible
            setTimeout(() => {
                const key = niaGetKey();
                if (!key) {
                    // Si no hay llave configurada, solo abro el setup (ya lo abrió niaOpen)
                    return;
                }
                const inp = document.getElementById('nia-input');
                if (inp) {
                    inp.value = question;
                    niaSend();
                }
            }, 350);
        };

        // ──────────── Renderizar ────────────
        function niaShowWelcome() {
            niaHistory = [];
            niaSaveHistory();
            const wrap = document.getElementById('nia-messages');
            wrap.innerHTML = '';
            const msg = document.createElement('div');
            msg.className = 'nia-msg assistant';
            msg.innerHTML = '¡Hola Luis! 👋 Soy <strong>Nelson IA</strong>, tu asistente del taller.\n\nAhora puedo <strong style="color:#10b981;">enviarte a WhatsApp con el mensaje listo</strong> cuando pregunto por deudas, clientes, equipos listos, etc. Solo toca el botón verde que aparece. 🟢\n\nPrueba con:\n• <em>"¿Quién me debe plata?"</em>\n• <em>"¿Qué equipos están listos para avisar?"</em>\n• <em>"¿Qué garantías están por vencer?"</em>\n• <em>"Clientes que no han vuelto"</em>\n• <em>"¿Qué debo hacer hoy?"</em>';
            wrap.appendChild(msg);
        }

        function niaRenderMessages() {
            const wrap = document.getElementById('nia-messages');
            wrap.innerHTML = '';
            niaHistory.forEach(m => {
                if (m.role === 'user') {
                    const div = document.createElement('div');
                    div.className = 'nia-msg user';
                    div.textContent = m.text;
                    wrap.appendChild(div);
                } else {
                    // Separo texto normal de bloque de acciones
                    const { cleanText, actions } = niaParseActions(m.text);
                    const div = document.createElement('div');
                    div.className = 'nia-msg assistant';
                    div.innerHTML = niaFormatText(cleanText);
                    wrap.appendChild(div);
                    // Si hay acciones, renderizo los botones
                    if (actions && actions.length > 0) {
                        const actionsWrap = niaBuildActionsUI(actions);
                        wrap.appendChild(actionsWrap);
                    }
                }
            });
            wrap.scrollTop = wrap.scrollHeight;
        }

        function niaFormatText(text) {
            // Escapo HTML primero
            const esc = text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // Luego aplico formato markdown simple
            return esc
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>');
        }

        // Parsea el bloque de acciones de la respuesta.
        // Soporta: [[ACTIONS]]...[[/ACTIONS]], bloque abierto sin cierre (cortado por MAX_TOKENS),
        // variantes con ```json, backticks, espacios o saltos de línea.
        function niaParseActions(fullText) {
            if (!fullText) return { cleanText: '', actions: [] };

            // 1. Buscar donde COMIENZA el bloque de acciones (con varias variantes)
            //    [[ACTIONS]], [ACTIONS], ACTIONS:, ```json, etc.
            const startPatterns = [
                /\[\[ACTIONS\]\]/i,
                /\[ACTIONS\]/i,
                /```json\s*\n?\s*\{[\s\S]*?"items"/i, // bloque markdown con items
            ];
            let startIdx = -1;
            let startMatch = null;
            for (const pat of startPatterns) {
                const m = fullText.match(pat);
                if (m && (startIdx === -1 || m.index < startIdx)) {
                    startIdx = m.index;
                    startMatch = m[0];
                }
            }

            // Si no hay marcador de inicio, devuelve texto normal
            if (startIdx === -1) return { cleanText: fullText.trim(), actions: [] };

            // 2. Extraer texto limpio (todo antes del marcador)
            const cleanText = fullText.substring(0, startIdx).trim();

            // 3. Extraer el contenido desde el marcador hasta el cierre (o hasta el final)
            let rawBlock = fullText.substring(startIdx + startMatch.length);

            // Remover marcador de cierre si existe
            rawBlock = rawBlock
                .replace(/\[\[\/ACTIONS\]\]/gi, '')
                .replace(/\[\/ACTIONS\]/gi, '')
                .replace(/```/g, '')
                .trim();

            // 4. Intentar parseo directo (caso feliz)
            let actions = [];
            try {
                const parsed = JSON.parse(rawBlock);
                if (Array.isArray(parsed?.items)) {
                    actions = parsed.items;
                }
            } catch (e) {
                // 5. Parseo directo falló — intento recuperar items manualmente
                //    Busco objetos tipo {"label":..., "tel":..., "message":...}
                actions = niaExtractActionsFlexible(rawBlock);
            }

            // 6. Si aún no encontré nada con el bloque delimitado, intento buscar en todo el texto
            //    (por si el modelo no usó marcadores)
            if (actions.length === 0) {
                const fallback = niaExtractActionsFlexible(fullText);
                if (fallback.length > 0) {
                    actions = fallback;
                    // Usar el texto antes del primer { que parezca una acción como cleanText
                    const firstCurly = fullText.search(/\{\s*"(label|tel|message)"/);
                    if (firstCurly > 0) {
                        return { cleanText: fullText.substring(0, firstCurly).trim().replace(/\[\[ACTIONS\]\]/gi, '').trim(), actions };
                    }
                }
            }

            // 7. Validar y filtrar acciones
            const valid = actions
                .filter(a => a && typeof a === 'object' && a.tel && a.message && a.label)
                .slice(0, 5);

            return { cleanText, actions: valid };
        }

        // Extrae objetos {"label","tel","message"} de un texto libre (tolerante a JSON mal formado)
        function niaExtractActionsFlexible(text) {
            const results = [];
            // Busco bloques que contengan los 3 campos clave
            // Regex no-codicioso que captura desde { hasta el siguiente } que cierre balanceado
            const objRegex = /\{[^{}]*"label"[^{}]*"tel"[^{}]*"message"[^{}]*\}|\{[^{}]*"label"[^{}]*"message"[^{}]*"tel"[^{}]*\}|\{[^{}]*"tel"[^{}]*"label"[^{}]*"message"[^{}]*\}|\{[^{}]*"tel"[^{}]*"message"[^{}]*"label"[^{}]*\}|\{[^{}]*"message"[^{}]*"label"[^{}]*"tel"[^{}]*\}|\{[^{}]*"message"[^{}]*"tel"[^{}]*"label"[^{}]*\}/g;

            let match;
            while ((match = objRegex.exec(text)) !== null) {
                try {
                    const obj = JSON.parse(match[0]);
                    if (obj.label && obj.tel && obj.message) results.push(obj);
                } catch (e) {
                    // Si el JSON está algo roto, intento extraer campos manualmente con regex
                    const label   = (match[0].match(/"label"\s*:\s*"((?:[^"\\]|\\.)*)"/)   || [])[1];
                    const tel     = (match[0].match(/"tel"\s*:\s*"((?:[^"\\]|\\.)*)"/)     || [])[1];
                    const message = (match[0].match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1];
                    if (label && tel && message) {
                        results.push({
                            label: label.replace(/\\"/g, '"').replace(/\\n/g, '\n'),
                            tel: tel.replace(/\\"/g, '"'),
                            message: message.replace(/\\"/g, '"').replace(/\\n/g, '\n')
                        });
                    }
                }
            }
            return results;
        }

        // Construye los botones de acción
        function niaBuildActionsUI(actions) {
            const wrap = document.createElement('div');
            wrap.className = 'nia-actions';

            const lbl = document.createElement('div');
            lbl.className = 'nia-actions-label';
            lbl.textContent = actions.length === 1 ? 'Acción sugerida' : `${actions.length} acciones sugeridas`;
            wrap.appendChild(lbl);

            actions.forEach(a => {
                const btn = document.createElement('button');
                btn.className = 'nia-action-btn';
                btn.type = 'button';

                const txt = document.createElement('span');
                txt.className = 'nia-action-text';
                txt.textContent = a.label;

                const arrow = document.createElement('span');
                arrow.className = 'nia-action-arrow';
                arrow.textContent = '›';

                btn.appendChild(txt);
                btn.appendChild(arrow);

                btn.onclick = () => niaOpenWhatsApp(a.tel, a.message);
                wrap.appendChild(btn);
            });
            return wrap;
        }

        // Abre WhatsApp con el mensaje pre-escrito (mismo patrón que el resto de la app)
        function niaOpenWhatsApp(tel, message) {
            // Limpio el tel: solo dígitos
            const digitsOnly = String(tel).replace(/\D/g, '');
            if (!digitsOnly || digitsOnly.length < 7) {
                if (typeof showAlert === 'function') showAlert('Teléfono inválido', 'warning');
                return;
            }
            // Si ya tiene prefijo país (12+ dígitos) lo dejo, si no agrego 57 de Colombia
            const withCountry = digitsOnly.length >= 11 ? digitsOnly : ('57' + digitsOnly);
            const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
            try { sessionStorage.setItem('_waJump','1'); } catch(e) {}
            window.open(url, '_blank');
        }

        function niaRenderSuggestions() {
            const wrap = document.getElementById('nia-suggestions');
            wrap.innerHTML = '';
            SUGGESTIONS.forEach(s => {
                const chip = document.createElement('button');
                chip.className = 'nia-chip';
                chip.textContent = s;
                chip.onclick = () => {
                    document.getElementById('nia-input').value = s.replace(/^[^\s]+\s/, '');
                    niaSend();
                };
                wrap.appendChild(chip);
            });
        }

        // ──────────── Input helpers ────────────
        window.niaAutoGrow = function(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 100) + 'px';
        };

        window.niaKeyDown = function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                niaSend();
            }
        };

        // ──────────── Enviar mensaje ────────────
        window.niaSend = async function() {
            if (niaSending) return;
            const input = document.getElementById('nia-input');
            const text = (input.value || '').trim();
            if (!text) return;

            const key = niaGetKey();
            if (!key) {
                if (typeof showAlert === 'function') showAlert('Configura tu llave API primero', 'warning');
                return;
            }

            // Chequeo offline: la IA requiere internet
            if (!navigator.onLine) {
                if (typeof showAlert === 'function') showAlert('Sin conexión. La IA necesita internet para responder.', 'warning');
                return;
            }

            // Agregar mensaje del usuario
            niaHistory.push({ role: 'user', text });
            niaSaveHistory();
            niaRenderMessages();
            input.value = '';
            input.style.height = 'auto';
            niaSending = true;
            document.getElementById('nia-send').disabled = true;

            // Mostrar "escribiendo..."
            const wrap = document.getElementById('nia-messages');
            const typing = document.createElement('div');
            typing.className = 'nia-typing';
            typing.id = 'nia-typing-indicator';
            typing.innerHTML = '<span></span><span></span><span></span>';
            wrap.appendChild(typing);
            wrap.scrollTop = wrap.scrollHeight;

            try {
                // Obtener contexto de la app
                const context = await niaBuildContext();

                // Llamar a Gemini
                const answer = await niaCallGemini(key, text, context);

                // Remover indicador
                const t = document.getElementById('nia-typing-indicator');
                if (t) t.remove();

                // Agregar respuesta
                niaHistory.push({ role: 'model', text: answer });
                niaSaveHistory();
                niaRenderMessages();
            } catch (err) {
                const t = document.getElementById('nia-typing-indicator');
                if (t) t.remove();
                const errDiv = document.createElement('div');
                errDiv.className = 'nia-msg error';
                errDiv.textContent = '⚠️ ' + (err.message || 'Error al consultar a Nelson IA');
                wrap.appendChild(errDiv);
                wrap.scrollTop = wrap.scrollHeight;
            } finally {
                niaSending = false;
                document.getElementById('nia-send').disabled = false;
            }
        };

        // ──────────── Construir contexto desde IndexedDB ────────────
        // Campos reales de NelsonApp Pro:
        //   orders: {id, orderNum, nom, tel, equ, val, adelanto, saldo, sta, det, fecha(timestamp),
        //            alertSent, garantia, presupuesto, tecnico, fechaEstimada, notas, origen, fotos, fotosEntrega}
        //   sales:  {id, item, val, qty, stockId, fecha(timestamp), tipo?, ordenId?}
        //   stock:  {id, n(nombre), p(precio), c(cantidad), min(minimo), cat(categoria), codigo}
        //   gastos: {id, det, val, fecha(timestamp)}
        //   clientes: {nombre, tel?, ...}
        //   payments: {id, ordenId, monto, fecha}
        async function niaBuildContext() {
            const ahora = Date.now();
            const hoy = new Date();
            const ctx = {
                fechaActual: _ymdLocal(hoy),
                errores: []
            };

            // Helpers de fechas - timestamp en ms
            const T_INICIO_HOY  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
            const T_INICIO_MES  = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
            const T_INICIO_MES_PASADO = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1).getTime();
            const T_FIN_MES_PASADO    = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime() - 1;
            const T_HACE_7_DIAS  = ahora - (7*86400000);
            const T_HACE_30_DIAS = ahora - (30*86400000);
            const T_HACE_90_DIAS = ahora - (90*86400000);
            const tsToFecha = (ts) => ts ? _ymdLocal(new Date(ts)) : '';

            // Leer todo con catch individual
            let orders=[], stock=[], sales=[], gastos=[], clientes=[], payments=[];
            try { orders   = await getAll('orders');   } catch(e) { ctx.errores.push('orders: '+e.message); }
            try { stock    = await getAll('stock');    } catch(e) { ctx.errores.push('stock: '+e.message); }
            try { sales    = await getAll('sales');    } catch(e) { ctx.errores.push('sales: '+e.message); }
            try { gastos   = await getAll('gastos');   } catch(e) { ctx.errores.push('gastos: '+e.message); }
            try { clientes = await getAll('clientes'); } catch(e) { ctx.errores.push('clientes: '+e.message); }
            try { payments = await getAll('payments'); } catch(e) { ctx.errores.push('payments: '+e.message); }

            try {
                // ═══════ ÓRDENES ═══════
                // Estados en la app: recibido, diagnostico, presupuesto, reparando, listo, entregado, no-reparable
                const ordActivas    = orders.filter(o => o.sta !== 'entregado' && o.sta !== 'no-reparable');
                const ordEntregadas = orders.filter(o => o.sta === 'entregado');
                const ordEntregadasMes = ordEntregadas.filter(o => (o.fecha || 0) >= T_INICIO_MES);
                const ordAtrasadas  = orders.filter(o => {
                    if (o.sta === 'entregado' || o.sta === 'no-reparable') return false;
                    if (!o.fechaEstimada) return false;
                    return o.fechaEstimada < ctx.fechaActual;
                });
                const ordNuevasHoy = orders.filter(o => (o.fecha || 0) >= T_INICIO_HOY);

                ctx.ordenes = {
                    totalHistorico: orders.length,
                    activasAhora: ordActivas.length,
                    entregadasEsteMes: ordEntregadasMes.length,
                    entregadasHistorico: ordEntregadas.length,
                    atrasadas: ordAtrasadas.length,
                    nuevasHoy: ordNuevasHoy.length,
                    porEstado: {}
                };
                orders.forEach(o => {
                    const s = o.sta || 'sin_estado';
                    ctx.ordenes.porEstado[s] = (ctx.ordenes.porEstado[s] || 0) + 1;
                });

                // 12 órdenes activas más recientes
                ctx.ordenesActivasRecientes = ordActivas
                    .sort((a,b) => (b.fecha || 0) - (a.fecha || 0))
                    .slice(0, 12)
                    .map(o => ({
                        num: o.orderNum,
                        cliente: o.nom,
                        telefono: o.tel,
                        equipo: o.equ,
                        falla: (o.det || '').slice(0, 80),
                        estado: o.sta,
                        fecha: tsToFecha(o.fecha),
                        fechaEstimadaEntrega: o.fechaEstimada,
                        valor: o.val,
                        adelanto: o.adelanto,
                        saldo: (o.val || 0) - (o.adelanto || 0),
                        tecnico: o.tecnico
                    }));

                ctx.ordenesAtrasadas = ordAtrasadas.slice(0, 12).map(o => ({
                    num: o.orderNum,
                    cliente: o.nom,
                    telefono: o.tel,
                    equipo: o.equ,
                    estado: o.sta,
                    fechaEstimadaEntrega: o.fechaEstimada,
                    diasAtraso: Math.ceil((Date.now() - new Date(o.fechaEstimada).getTime()) / 86400000),
                    valor: o.val
                }));

                // ═══════ GARANTÍAS ═══════
                // Equipos entregados que tienen garantía aún válida o están a punto de vencer
                const ahora_ms = Date.now();
                const garantiasInfo = [];
                ordEntregadas.forEach(o => {
                    const dias = parseInt(o.garantia) || 0;
                    if (dias <= 0 || !o.fechaEntrega) return;
                    const expira = o.fechaEntrega + dias * 86400000;
                    const diasRestantes = Math.ceil((expira - ahora_ms) / 86400000);
                    // Solo nos interesan: activas + por vencer + vencidas hace ≤30 días
                    if (diasRestantes < -30) return;
                    let estado;
                    if (diasRestantes > 7)         estado = 'activa';
                    else if (diasRestantes >= 0)   estado = 'por_vencer';
                    else                            estado = 'vencida_recientemente';
                    garantiasInfo.push({
                        num: o.orderNum,
                        cliente: o.nom,
                        telefono: o.tel,
                        equipo: o.equ,
                        diasGarantia: dias,
                        fechaEntrega: tsToFecha(o.fechaEntrega),
                        fechaVencimiento: tsToFecha(expira),
                        diasRestantes,
                        estado
                    });
                });
                // Ordenar por urgencia (las que vencen antes primero)
                garantiasInfo.sort((a,b) => a.diasRestantes - b.diasRestantes);

                ctx.garantias = {
                    total: garantiasInfo.length,
                    activas: garantiasInfo.filter(g => g.estado === 'activa').length,
                    porVencer: garantiasInfo.filter(g => g.estado === 'por_vencer').length,
                    vencidasRecientemente: garantiasInfo.filter(g => g.estado === 'vencida_recientemente').length,
                    listado: garantiasInfo.slice(0, 15) // máximo 15 para no sobrecargar el contexto
                };

                // ═══════ INGRESOS (de sales + valor de órdenes entregadas) ═══════
                // Las ventas incluyen: ventas de stock + adelantos + cobros de entrega
                const ventasMes    = sales.filter(v => (v.fecha || 0) >= T_INICIO_MES);
                const ventasHoy    = sales.filter(v => (v.fecha || 0) >= T_INICIO_HOY);
                const ventas7dias  = sales.filter(v => (v.fecha || 0) >= T_HACE_7_DIAS);
                const ventasMesPasado = sales.filter(v => (v.fecha || 0) >= T_INICIO_MES_PASADO && (v.fecha || 0) <= T_FIN_MES_PASADO);

                const sumVal = arr => arr.reduce((s,v) => s + (v.val || 0), 0);

                // Clasifico sales por tipo (adelantos, cobros de entrega, ventas directas de stock)
                const ingresosMesPorTipo = { adelantos: 0, cobros_entrega: 0, ventas_stock: 0, otros: 0 };
                ventasMes.forEach(v => {
                    if (v.tipo === 'adelanto')        ingresosMesPorTipo.adelantos     += (v.val || 0);
                    else if (v.tipo === 'cobro_entrega') ingresosMesPorTipo.cobros_entrega += (v.val || 0);
                    else if (v.stockId)               ingresosMesPorTipo.ventas_stock   += (v.val || 0);
                    else                               ingresosMesPorTipo.otros          += (v.val || 0);
                });

                ctx.ingresos = {
                    totalHoy: sumVal(ventasHoy),
                    totalUltimos7Dias: sumVal(ventas7dias),
                    totalEsteMes: sumVal(ventasMes),
                    totalMesPasado: sumVal(ventasMesPasado),
                    cantidadTransaccionesHoy: ventasHoy.length,
                    cantidadTransaccionesMes: ventasMes.length,
                    desgloseMes: ingresosMesPorTipo,
                    variacionMensual: ventasMesPasado.length > 0
                        ? (sumVal(ventasMes) - sumVal(ventasMesPasado))
                        : null
                };

                // Últimos 10 movimientos de caja
                ctx.ultimosMovimientosCaja = sales
                    .sort((a,b) => (b.fecha || 0) - (a.fecha || 0))
                    .slice(0, 10)
                    .map(v => ({
                        fecha: tsToFecha(v.fecha),
                        concepto: v.item,
                        valor: v.val,
                        cantidad: v.qty,
                        tipo: v.tipo || (v.stockId ? 'venta_stock' : 'otro')
                    }));

                // ═══════ SALDOS PENDIENTES (órdenes entregadas o activas con saldo > 0) ═══════
                const ordConSaldo = orders.filter(o => {
                    const saldo = (o.val || 0) - (o.adelanto || 0);
                    return saldo > 0 && o.sta !== 'no-reparable';
                });
                ctx.cuentasPorCobrar = {
                    cantidadClientes: ordConSaldo.length,
                    montoTotal: ordConSaldo.reduce((s,o) => s + ((o.val||0) - (o.adelanto||0)), 0),
                    detalle: ordConSaldo
                        .sort((a,b) => ((b.val||0)-(b.adelanto||0)) - ((a.val||0)-(a.adelanto||0)))
                        .slice(0, 12)
                        .map(o => ({
                            orden: o.orderNum,
                            cliente: o.nom,
                            telefono: o.tel,
                            equipo: o.equ,
                            estado: o.sta,
                            saldoPendiente: (o.val||0) - (o.adelanto||0),
                            valorTotal: o.val,
                            adelantado: o.adelanto,
                            fechaOrden: tsToFecha(o.fecha)
                        }))
                };

                // ═══════ INVENTARIO (stock: n=nombre, p=precio, c=cantidad, min=minimo) ═══════
                const stockBajo    = stock.filter(s => (s.c || 0) <= (s.min || 3) && (s.c || 0) > 0);
                const stockAgotado = stock.filter(s => (s.c || 0) <= 0);
                ctx.inventario = {
                    totalProductos: stock.length,
                    valorInventarioAProducto: stock.reduce((s,i) => s + ((i.c||0) * (i.p||0)), 0),
                    productosStockBajo: stockBajo.length,
                    productosAgotados: stockAgotado.length,
                    itemsStockBajo: stockBajo.slice(0, 15).map(s => ({
                        nombre: s.n, cantidad: s.c, minimo: s.min, precio: s.p, codigo: s.codigo
                    })),
                    itemsAgotados: stockAgotado.slice(0, 10).map(s => ({
                        nombre: s.n, precio: s.p, codigo: s.codigo
                    }))
                };

                // ═══════ GASTOS ═══════
                const gastosMes   = gastos.filter(g => (g.fecha || 0) >= T_INICIO_MES);
                const gastos7dias = gastos.filter(g => (g.fecha || 0) >= T_HACE_7_DIAS);
                ctx.gastos = {
                    totalEsteMes: gastosMes.reduce((s,g) => s + (g.val || 0), 0),
                    totalUltimos7Dias: gastos7dias.reduce((s,g) => s + (g.val || 0), 0),
                    cantidadEsteMes: gastosMes.length,
                    ultimos10: gastos.sort((a,b) => (b.fecha||0)-(a.fecha||0)).slice(0,10).map(g => ({
                        fecha: tsToFecha(g.fecha),
                        motivo: g.det,
                        valor: g.val
                    }))
                };

                // ═══════ UTILIDAD (ingresos caja - gastos) ═══════
                ctx.utilidadEstimada = {
                    esteMes: ctx.ingresos.totalEsteMes - ctx.gastos.totalEsteMes,
                    ultimos7Dias: ctx.ingresos.totalUltimos7Dias - ctx.gastos.totalUltimos7Dias,
                    nota: 'Utilidad = ingresos de caja (ventas + adelantos + cobros) - gastos registrados. No incluye costo de repuestos.'
                };

                // ═══════ CLIENTES ═══════
                const clientesMap = {};
                orders.forEach(o => {
                    if (!o.nom) return;
                    if (!clientesMap[o.nom]) clientesMap[o.nom] = {
                        ordenes: 0, gastoTotalAcumulado: 0, saldoPendiente: 0,
                        ultimaOrdenTimestamp: 0, ultimaOrdenFecha: '', telefono: o.tel
                    };
                    const c = clientesMap[o.nom];
                    c.ordenes += 1;
                    c.gastoTotalAcumulado += (o.val || 0);
                    c.saldoPendiente += Math.max(0, (o.val || 0) - (o.adelanto || 0));
                    if ((o.fecha || 0) > c.ultimaOrdenTimestamp) {
                        c.ultimaOrdenTimestamp = o.fecha || 0;
                        c.ultimaOrdenFecha = tsToFecha(o.fecha);
                        if (o.tel) c.telefono = o.tel;
                    }
                });
                const clientesArr = Object.entries(clientesMap).map(([nombre, d]) => ({ nombre, ...d }));
                ctx.clientes = {
                    totalUnicos: clientesArr.length,
                    top10PorGasto: clientesArr
                        .sort((a,b) => b.gastoTotalAcumulado - a.gastoTotalAcumulado)
                        .slice(0, 10)
                        .map(c => ({
                            nombre: c.nombre, telefono: c.telefono,
                            totalOrdenes: c.ordenes,
                            gastoTotalCOP: c.gastoTotalAcumulado,
                            saldoPendienteCOP: c.saldoPendiente,
                            ultimaVisita: c.ultimaOrdenFecha
                        })),
                    sinVolverHace90Dias: clientesArr
                        .filter(c => c.ultimaOrdenTimestamp > 0 && c.ultimaOrdenTimestamp < T_HACE_90_DIAS)
                        .slice(0, 15)
                        .map(c => ({
                            nombre: c.nombre, telefono: c.telefono,
                            ultimaVisita: c.ultimaOrdenFecha,
                            totalOrdenesHistoricas: c.ordenes,
                            gastoTotalCOP: c.gastoTotalAcumulado
                        }))
                };

                // ═══════ TÉCNICOS (rendimiento del mes) ═══════
                const tecnicosMap = {};
                ordEntregadasMes.forEach(o => {
                    const t = o.tecnico || '(sin asignar)';
                    if (!tecnicosMap[t]) tecnicosMap[t] = { ordenesEntregadas: 0, ingresoGenerado: 0 };
                    tecnicosMap[t].ordenesEntregadas += 1;
                    tecnicosMap[t].ingresoGenerado += (o.val || 0);
                });
                ctx.rendimientoTecnicosEsteMes = Object.entries(tecnicosMap)
                    .map(([nombre, d]) => ({ nombre, ...d }))
                    .sort((a,b) => b.ingresoGenerado - a.ingresoGenerado);

                // ═══════ ORIGEN DE CLIENTES ═══════
                const origenMap = {};
                orders.forEach(o => {
                    const og = o.origen || '(no registrado)';
                    origenMap[og] = (origenMap[og] || 0) + 1;
                });
                ctx.comoNosConocen = origenMap;

            } catch (e) {
                ctx.errorCritico = 'Error procesando datos: ' + (e.message || e);
            }
            return ctx;
        }

        // ──────────── Llamada a Gemini ────────────
        async function niaCallGemini(apiKey, userMessage, context) {
            const systemPrompt = `Eres "Nelson IA", el asistente inteligente de "Todo Repuestos Nelson", un taller de reparación de electrodomésticos y venta de repuestos en Neiva, Huila, Colombia. El dueño es Luis Eduardo.

REGLAS DE COMPORTAMIENTO:
- Responde SIEMPRE en español colombiano, tono cercano y profesional (como un socio que conoce bien el negocio).
- Sé CONCRETO y ÚTIL. Nada de respuestas vagas. Usa los números reales del contexto.
- Formato: usa **negrillas** para destacar cifras clave, listas con • cuando ayude. Respuestas cortas (6-8 líneas, más solo si piden detalle).
- Moneda: pesos colombianos (COP). Formato: $1.250.000 (punto como separador de miles).
- Si detectas algo importante (mora grande, stock crítico, orden muy atrasada), señálalo aunque no te lo pregunten.
- NUNCA inventes datos. Solo usa lo del CONTEXTO JSON.
- Cuando des recomendaciones de negocio, sé directo y accionable.
- NO menciones el campo "errores" del contexto al usuario salvo que sea crítico.

═══ ACCIONES DE WHATSAPP (MUY IMPORTANTE) ═══
Cuando el usuario pregunte por clientes con deuda, clientes que no han vuelto, órdenes listas para avisar, órdenes atrasadas, o cualquier situación donde enviar un WhatsApp sea ÚTIL, debes proponer botones de acción.

Al final de tu respuesta (después del texto normal), agrega UN SOLO bloque así:

[[ACTIONS]]
{
  "items": [
    {
      "label": "💰 Cobrar a Martha ($150.000)",
      "tel": "3001234567",
      "message": "Hola Martha, soy Luis de Todo Repuestos Nelson. Le escribo para recordarle muy amablemente que tiene un saldo pendiente de $150.000 por la reparación de su lavadora (orden #234). ¿Podría ayudarme con el pago esta semana? Gracias! 🙏"
    }
  ]
}
[[/ACTIONS]]

REGLAS PARA LAS ACCIONES (MUY IMPORTANTE, sigue al pie de la letra):
- Antes del bloque [[ACTIONS]], tu texto explicativo debe ser CORTO (3-5 líneas máximo). NO hagas listas largas de los mismos clientes que luego vas a poner en acciones — eso duplica info.
- El JSON debe ser VÁLIDO: comillas dobles, sin comas sobrantes, sin comentarios.
- Escribe el JSON COMPACTO, en una sola línea por acción si es posible. NO uses sangría bonita con muchos espacios.
- "tel" = solo dígitos del teléfono, sin +57 ni espacios ni guiones. Si no hay teléfono en los datos, OMITE esa acción.
- "message" = mensaje completo listo para enviar, en español colombiano amable. Incluye nombre del cliente, orden/equipo, y petición clara. MANTÉN cada mensaje bajo 280 caracteres.
- "label" = texto corto del botón (máximo 40 caracteres), con emoji: 💰 para cobros, 📢 para avisos, 👋 para reactivación, ⏰ para retrasos.
- MÁXIMO 3 acciones por respuesta (no 5). Solo las MÁS urgentes. Prefiere calidad sobre cantidad.
- Si no hay acción útil, NO incluyas el bloque [[ACTIONS]].
- CIERRA SIEMPRE con [[/ACTIONS]]. No olvides el cierre.

EJEMPLOS DE CUÁNDO GENERAR ACCIONES:
• Usuario pregunta "¿Quién me debe?" → genera acciones para los 3-5 con mayor saldo.
• Usuario pregunta "Órdenes atrasadas" → genera acciones para avisar retraso a los clientes de órdenes atrasadas.
• Usuario pregunta "Clientes sin volver" → genera acciones para reactivar a los top 3 que no han vuelto.
• Usuario pregunta "Equipos listos" → genera acciones para avisar a los clientes de órdenes en estado "listo".

GUÍA DE DATOS (cómo está organizado el CONTEXTO JSON):

• **Ingresos / Ventas** → "ingresos". Todo el dinero que entró a caja. Usa "ingresos.totalEsteMes", "ingresos.totalHoy", "ingresos.totalUltimos7Dias", "ingresos.totalMesPasado".
• **Órdenes del taller** → "ordenes". Estados: recibido, diagnostico, presupuesto, reparando, listo, entregado, no-reparable.
• **Deudas / Cartera** → "cuentasPorCobrar". Cada item tiene "cliente", "telefono", "saldoPendiente", "orden", "equipo".
• **Inventario** → "inventario". "itemsStockBajo", "itemsAgotados".
• **Gastos** → "gastos".
• **Utilidad** → "utilidadEstimada".
• **Clientes** → "clientes.top10PorGasto" y "clientes.sinVolverHace90Dias" (cada uno con "telefono").
• **Técnicos** → "rendimientoTecnicosEsteMes".
• **Origen de clientes** → "comoNosConocen".

CONTEXTO EN VIVO DEL TALLER (JSON con datos reales leídos hace segundos de la app):
${JSON.stringify(context, null, 2)}`;

            // Construir historial para Gemini (excluyendo el último mensaje del usuario que ya se agregó a niaHistory)
            const historyForApi = niaHistory.slice(0, -1).slice(-NIA_MAX_HISTORY).map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));
            historyForApi.push({ role: 'user', parts: [{ text: userMessage }] });

            const body = {
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: historyForApi,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2500,
                    topP: 0.9
                }
            };

            // Intento primero con el modelo principal. Si falla por 429/404, cambio a Flash-Lite.
            const modelsToTry = [NIA_MODEL, 'gemini-2.5-flash-lite'];
            let lastError = null;

            for (let i = 0; i < modelsToTry.length; i++) {
                const model = modelsToTry[i];
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
                try {
                    const resp = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (!resp.ok) {
                        const errText = await resp.text().catch(() => '');

                        // Llave inválida: fallo inmediato, no tiene sentido reintentar
                        if (resp.status === 400 && (errText.includes('API_KEY') || errText.includes('API key'))) {
                            throw new Error('Llave API inválida. Toca "✕" arriba, luego el 🧠 otra vez para reconfigurar.');
                        }
                        if (resp.status === 403) {
                            throw new Error('Tu llave no tiene permiso. Crea una nueva en aistudio.google.com/apikey');
                        }

                        // 429 = límite. Si aún hay modelo para intentar, probamos el siguiente.
                        if (resp.status === 429) {
                            if (i < modelsToTry.length - 1) {
                                lastError = new Error('rate_limit');
                                continue; // prueba con Flash-Lite
                            }
                            // Ya no hay más modelos: explico claro qué pasó
                            throw new Error('Esperaste muy rápido entre consultas. El plan gratis permite 10-15 por minuto. Espera 30 segundos y vuelve a intentar.');
                        }

                        // 404 = modelo no existe/no disponible en tu región
                        if (resp.status === 404) {
                            if (i < modelsToTry.length - 1) {
                                lastError = new Error('model_not_found');
                                continue;
                            }
                            throw new Error('Los modelos de Gemini no están disponibles en tu cuenta. Verifica en aistudio.google.com');
                        }

                        // Otros errores del servidor: intenta con el siguiente modelo
                        if (resp.status >= 500 && i < modelsToTry.length - 1) {
                            lastError = new Error(`server_${resp.status}`);
                            continue;
                        }

                        throw new Error(`Error ${resp.status}: ${errText.slice(0, 150) || 'No se pudo conectar'}`);
                    }

                    const data = await resp.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) {
                        if (data?.promptFeedback?.blockReason) {
                            throw new Error('La pregunta fue bloqueada por el filtro de seguridad de Gemini.');
                        }
                        // A veces Gemini 2.5 devuelve respuesta vacía con finishReason MAX_TOKENS en "thinking"
                        if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
                            throw new Error('Respuesta demasiado larga. Intenta una pregunta más específica.');
                        }
                        if (i < modelsToTry.length - 1) {
                            lastError = new Error('empty_response');
                            continue;
                        }
                        throw new Error('Respuesta vacía de Gemini. Intenta de nuevo.');
                    }
                    return text.trim();
                } catch (fetchErr) {
                    // Error de red o timeout: intenta con el siguiente
                    if (fetchErr.message === 'rate_limit' || fetchErr.message === 'model_not_found' ||
                        fetchErr.message === 'empty_response' || fetchErr.message.startsWith('server_')) {
                        lastError = fetchErr;
                        continue;
                    }
                    throw fetchErr; // errores de llave inválida etc. se propagan inmediato
                }
            }

            throw lastError || new Error('No se pudo obtener respuesta de Gemini');
        }

        // ──────────── Acceso público: borrar llave (por si quiere resetear) ────────────
        window.niaReset = function() {
            if (!confirm('¿Borrar la llave API y el historial de Nelson IA?')) return;
            try { localStorage.removeItem(NIA_KEY_STORAGE); } catch(e) {}
            try { sessionStorage.removeItem(NIA_HISTORY_STORAGE); } catch(e) {}
            niaHistory = [];
            if (typeof showAlert === 'function') showAlert('Nelson IA reseteado', 'info');
            niaClose();
        };

    })();
