/* Nelson App Pro · js/modules/26-tour-guia.js
   Tour guiado y guia PDF
   (extraido sin cambios de index.html; el orden de carga importa) */
        function tourShowWelcome() {
            const prevTab = document.querySelector('.app-view:not(.hidden)');
            // Asegurarnos de estar en la vista Taller antes del tour
            if (typeof tab === 'function') tab('taller');
            setTimeout(() => {
                document.getElementById('tour-welcome').classList.remove('hidden');
            }, 200);
        }

        function tourStart() {
            document.getElementById('tour-welcome').classList.add('hidden');
            document.getElementById('tour-complete').classList.add('hidden');
            _tourIdx = 0;
            _tourActive = true;
            _tourShowStep(0);
        }

        function tourNext() {
            if (_tourIdx >= _TOUR_STEPS.length - 1) {
                _tourHideUI();
                document.getElementById('tour-complete').classList.remove('hidden');
                return;
            }
            _tourIdx++;
            _tourShowStep(_tourIdx);
        }

        function tourPrev() {
            if (_tourIdx === 0) return;
            _tourIdx--;
            _tourShowStep(_tourIdx);
        }

        function tourEnd(markSeen) {
            _tourHideUI();
            document.getElementById('tour-welcome').classList.add('hidden');
            document.getElementById('tour-complete').classList.add('hidden');
            _tourActive = false;
            // Marcar como visto (tanto si completó como si decidió saltar)
            localStorage.setItem('tourCompleted', '1');
        }

        function _tourHideUI() {
            document.getElementById('tour-overlay').classList.add('hidden');
            document.getElementById('tour-highlight').classList.add('hidden');
            document.getElementById('tour-tooltip').classList.add('hidden');
        }

        function _tourShowStep(idx) {
            const step = _TOUR_STEPS[idx];
            if (!step) return;

            // Asegurarnos que estamos en vista Taller (muchos targets están ahí)
            if (typeof tab === 'function' && step.target && step.target.startsWith('#c-')) {
                const tallerView = document.getElementById('view-taller');
                if (tallerView && tallerView.classList.contains('hidden')) tab('taller');
            }

            // Localizar el elemento destacado
            setTimeout(() => {
                const targetEl = document.querySelector(step.target);
                if (!targetEl) {
                    // Si no existe, saltar el paso (evitar que el tour se rompa)
                    console.warn('[tour] target no encontrado:', step.target);
                    if (idx < _TOUR_STEPS.length - 1) {
                        _tourIdx++;
                        _tourShowStep(_tourIdx);
                    } else {
                        _tourHideUI();
                        document.getElementById('tour-complete').classList.remove('hidden');
                    }
                    return;
                }

                // Scroll al elemento si está fuera de vista
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                setTimeout(() => {
                    const rect = targetEl.getBoundingClientRect();
                    const highlight = document.getElementById('tour-highlight');
                    const overlay   = document.getElementById('tour-overlay');
                    const tooltip   = document.getElementById('tour-tooltip');
                    const emojiEl   = document.getElementById('tour-tooltip-emoji');
                    const stepEl    = document.getElementById('tour-tooltip-step');
                    const titleEl   = document.getElementById('tour-tooltip-title');
                    const textEl    = document.getElementById('tour-tooltip-text');
                    const prevBtn   = document.getElementById('tour-btn-prev');
                    const nextBtn   = document.getElementById('tour-btn-next');

                    // Posición del highlight (con pequeño padding)
                    const pad = 6;
                    highlight.style.left   = (rect.left - pad) + 'px';
                    highlight.style.top    = (rect.top - pad) + 'px';
                    highlight.style.width  = (rect.width + pad * 2) + 'px';
                    highlight.style.height = (rect.height + pad * 2) + 'px';
                    highlight.classList.remove('hidden');
                    overlay.classList.remove('hidden');

                    // Contenido del tooltip
                    emojiEl.textContent = step.emoji;
                    stepEl.textContent  = `Paso ${idx + 1} de ${_TOUR_STEPS.length}`;
                    titleEl.textContent = step.title;
                    textEl.textContent  = step.text;
                    prevBtn.disabled    = (idx === 0);
                    prevBtn.style.opacity = (idx === 0) ? '0.4' : '1';
                    nextBtn.textContent = (idx === _TOUR_STEPS.length - 1) ? 'Finalizar ✓' : 'Siguiente →';

                    // Calcular posición del tooltip (arriba o abajo del target)
                    tooltip.classList.remove('hidden');
                    // Esperar a que se renderice para medir altura real
                    requestAnimationFrame(() => {
                        const ttRect = tooltip.getBoundingClientRect();
                        const vw = window.innerWidth;
                        const vh = window.innerHeight;
                        const wantBelow = step.position === 'bottom';
                        const spaceBelow = vh - rect.bottom;
                        const spaceAbove = rect.top;
                        let top;
                        if (wantBelow && spaceBelow >= ttRect.height + 20) {
                            top = rect.bottom + 14;
                        } else if (spaceAbove >= ttRect.height + 20) {
                            top = rect.top - ttRect.height - 14;
                        } else if (spaceBelow >= ttRect.height + 20) {
                            top = rect.bottom + 14;
                        } else {
                            // No cabe ni arriba ni abajo — centrar vertical
                            top = Math.max(10, (vh - ttRect.height) / 2);
                        }
                        // Centrar horizontal relativo al target, sin salirse de pantalla
                        let left = rect.left + (rect.width / 2) - (ttRect.width / 2);
                        left = Math.max(10, Math.min(vw - ttRect.width - 10, left));
                        tooltip.style.left = left + 'px';
                        tooltip.style.top  = top + 'px';
                    });
                }, 350);
            }, 100);
        }

        // Verifica al inicio si se debe mostrar el tour de bienvenida
        function _maybeShowTourOnStart() {
            try {
                if (localStorage.getItem('tourCompleted') === '1') return;
                // Solo si no hay todavía órdenes (usuario realmente nuevo) o el flag explícito
                getAll('orders').then(orders => {
                    // Dar tiempo para que la UI cargue
                    setTimeout(() => tourShowWelcome(), 1800);
                }).catch(() => {});
            } catch(e) { console.warn('[tour init]', e); }
        }

        // Permite re-lanzar el tour desde un botón en Ajustes
        function tourRestart() {
            localStorage.removeItem('tourCompleted');
            tourShowWelcome();
        }

        // Generar PDF imprimible con guía básica de uso
        // NOTA: jsPDF con fuentes estándar (helvetica) NO dibuja emojis ni flechas Unicode;
        // salen como símbolos raros (Ø=Ü...). Por eso aquí todo es texto Latin-1 + formas vectoriales.
        async function downloadGuidePDF() {
            try {
                showToast('📄 Generando guía...', 'info');
                await _ensurePdfLibsReady();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const biz = _safeBizConfig();
                // Quita cualquier carácter que la fuente del PDF no pueda dibujar (emojis, etc.)
                const clean = s => String(s == null ? '' : s).replace(/[^\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018-\u201D\u2022\u2026]/g, '').replace(/\s+/g, ' ').trim();
                const bizName = clean(biz.name) || 'Todo Repuestos Nelson';
                const ayudaA = clean(biz.ownerName || biz.owner) || 'Luis';
                const PW = doc.internal.pageSize.getWidth();
                const PH = doc.internal.pageSize.getHeight();
                const M = 14;                 // margen lateral
                const CW = PW - M * 2;        // ancho útil
                const BOTTOM = PH - 18;       // límite inferior (deja espacio al pie)

                const C = {
                    navy: [15, 23, 42], orange: [249, 115, 22], ink: [30, 41, 59], text: [51, 65, 85],
                    muted: [100, 116, 139], line: [226, 232, 240], soft: [248, 250, 252],
                    white: [255, 255, 255]
                };
                const THEME = {
                    amber: { bg: [255, 247, 237], bar: [249, 115, 22], fg: [154, 52, 18] },
                    green: { bg: [236, 253, 245], bar: [16, 185, 129], fg: [6, 95, 70] },
                    blue:  { bg: [239, 246, 255], bar: [59, 130, 246], fg: [30, 64, 175] },
                    red:   { bg: [254, 242, 242], bar: [239, 68, 68],  fg: [153, 27, 27] }
                };
                const fill = c => doc.setFillColor(c[0], c[1], c[2]);
                const ink  = c => doc.setTextColor(c[0], c[1], c[2]);
                const stroke = c => doc.setDrawColor(c[0], c[1], c[2]);
                const lh = pt => pt * 0.3528 * 1.5;   // alto de línea en mm

                let y = 0;

                function pageHeader(big) {
                    const h = big ? 46 : 18;
                    fill(C.navy); doc.rect(0, 0, PW, h, 'F');
                    fill(C.orange); doc.rect(0, h, PW, 1.6, 'F');
                    if (big) {
                        // Monograma con la inicial del negocio
                        fill(C.orange); doc.roundedRect(M, 11, 22, 22, 5, 5, 'F');
                        ink(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
                        doc.text(bizName.charAt(0).toUpperCase(), M + 11, 25.2, { align: 'center' });
                        ink(C.white); doc.setFontSize(23);
                        doc.text('Guía Rápida de Uso', M + 30, 21.5);
                        ink([253, 186, 116]); doc.setFontSize(12.5); doc.setFont('helvetica', 'bold');
                        doc.text(bizName, M + 30, 29.5);
                        ink([148, 163, 184]); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
                        doc.text('Los pasos básicos para trabajar con la app, día a día', M + 30, 37);
                        y = h + 11;
                    } else {
                        ink(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
                        doc.text('Guía Rápida de Uso', M, 11.5);
                        ink([253, 186, 116]); doc.setFont('helvetica', 'normal');
                        doc.text(bizName, PW - M, 11.5, { align: 'right' });
                        y = h + 12;
                    }
                }

                function ensure(h) {
                    if (y + h > BOTTOM) { doc.addPage(); pageHeader(false); }
                }

                function sectionTitle(num, title) {
                    ensure(20);
                    y += 2;
                    fill(C.orange); doc.circle(M + 4.5, y - 1.3, 4.5, 'F');
                    ink(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
                    doc.text(String(num), M + 4.5, y + 0.1, { align: 'center' });
                    ink(C.ink); doc.setFontSize(13);
                    doc.text(clean(title), M + 13, y);
                    stroke(C.line); doc.setLineWidth(0.4);
                    doc.line(M, y + 3.6, PW - M, y + 3.6);
                    y += 11;
                }

                function steps(list) {
                    const tw = CW - 14;
                    list.forEach((t, i) => {
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
                        const lines = doc.splitTextToSize(clean(t), tw);
                        const h = Math.max(6, lines.length * lh(10.5));
                        ensure(h + 1);
                        fill(C.soft); stroke(C.line); doc.setLineWidth(0.25);
                        fill(C.orange); doc.circle(M + 4, y - 1.2, 3.2, 'F');
                        ink(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
                        doc.text(String(i + 1), M + 4, y - 0.1, { align: 'center' });
                        ink(C.text); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
                        doc.text(lines, M + 11, y);
                        y += h + 1.1;
                    });
                    y += 2.5;
                }

                function bullets(list) {
                    const tw = CW - 10;
                    list.forEach(t => {
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
                        const lines = doc.splitTextToSize(clean(t), tw);
                        const h = lines.length * lh(10.5);
                        ensure(h + 1);
                        fill(C.orange); doc.circle(M + 2.2, y - 1.2, 1.1, 'F');
                        ink(C.text); doc.text(lines, M + 8, y);
                        y += h + 1.8;
                    });
                    y += 3;
                }

                function callout(theme, title, lines) {
                    const t = THEME[theme];
                    const tw = CW - 12;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
                    const wrapped = lines.map(l => doc.splitTextToSize(clean(l), tw));
                    const bodyH = wrapped.reduce((s, w) => s + w.length * lh(10), 0);
                    const h = 6.5 + (title ? 6 : 0) + bodyH + 1.5;
                    ensure(h + 3);
                    fill(t.bg); doc.roundedRect(M, y, CW, h, 2.2, 2.2, 'F');
                    fill(t.bar); doc.roundedRect(M, y, 2.4, h, 1.2, 1.2, 'F');
                    let cy = y + 6.2;
                    if (title) {
                        ink(t.fg); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
                        doc.text(clean(title), M + 7, cy); cy += 6;
                    }
                    ink(t.fg); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
                    wrapped.forEach(w => { doc.text(w, M + 7, cy); cy += w.length * lh(10); });
                    y += h + 6;
                }

                // ═══ PÁGINA 1 ═══
                pageHeader(true);

                // Las 4 secciones de la app (tarjetas)
                ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
                doc.text('La app tiene 4 botones en la parte de abajo', M, y);
                y += 6;
                const cards = [
                    { n: 'TALLER',  d: 'Recibir equipos nuevos de los clientes.',      c: [249, 115, 22] },
                    { n: 'ÓRDENES', d: 'Lista de todos los equipos recibidos.',        c: [59, 130, 246] },
                    { n: 'CAJA',    d: 'Ventas de repuestos, gastos e inventario.',    c: [16, 185, 129] },
                    { n: 'DATOS',   d: 'Reportes, estadísticas y configuración.',      c: [139, 92, 246] }
                ];
                const gap = 4, cwid = (CW - gap * 3) / 4, chei = 29;
                cards.forEach((k, i) => {
                    const x = M + i * (cwid + gap);
                    fill(C.soft); stroke(C.line); doc.setLineWidth(0.3);
                    doc.roundedRect(x, y, cwid, chei, 2.2, 2.2, 'FD');
                    fill(k.c); doc.roundedRect(x, y, cwid, 4.2, 2.2, 2.2, 'F');
                    doc.rect(x, y + 2, cwid, 2.2, 'F');
                    fill(k.c); doc.circle(x + 5.5, y + 11.7, 1.7, 'F');
                    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
                    doc.text(k.n, x + 9.5, y + 13);
                    ink(C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3);
                    doc.text(doc.splitTextToSize(k.d, cwid - 7), x + 3.5, y + 19.5);
                });
                y += chei + 10;

                sectionTitle(1, 'Cuando un cliente trae un equipo dañado');
                steps([
                    'Toca el botón TALLER, abajo.',
                    'Escribe el NOMBRE COMPLETO del cliente.',
                    'Escribe el NÚMERO DE WHATSAPP (sin espacios).',
                    'Describe el EQUIPO: marca, modelo y tipo.',
                    'Escribe la FALLA que reportó el cliente.',
                    'Pon el VALOR aproximado de la reparación.',
                    'Si dejó un adelanto, escríbelo en ADELANTO.',
                    'Al final, toca el botón naranja REGISTRAR.'
                ]);
                callout('green', 'CONSEJO', [
                    'Si el cliente ya vino antes, aparece una tarjeta azul con su historial. Tócala para ver qué equipos le has reparado.'
                ]);

                sectionTitle(2, 'Cuando ya reparaste el equipo');
                steps([
                    'Ve a ÓRDENES.',
                    'Busca la orden del cliente.',
                    'Toca el botón de ESTADO (dice "RECIBIDO", "EN REVISIÓN"...).',
                    'Cambia el estado a REPARADO.',
                    'La app te preguntará qué repuestos usaste (es opcional).',
                    'Avisa al cliente con el botón de WhatsApp.'
                ]);

                // ═══ PÁGINA 2 (o continuación) ═══
                doc.addPage(); pageHeader(false);

                sectionTitle(3, 'Cuando el cliente viene a recoger');
                steps([
                    'Abre la orden del cliente.',
                    'Cambia el estado a ENTREGADO.',
                    'Registra el pago final.',
                    'Si el pago fue en efectivo, queda registrado en CAJA automáticamente.'
                ]);

                sectionTitle(4, 'Caja: ventas de repuestos y gastos');
                bullets([
                    'Para VENDER un repuesto: toca CAJA y luego "Nueva Venta".',
                    'Para registrar un GASTO: toca CAJA y luego "Nuevo Gasto".',
                    'El saldo de la caja se actualiza solo al final del día.',
                    'Si un repuesto baja de cantidad, es normal: la app descuenta el stock automáticamente al vender.'
                ]);

                callout('blue', 'CONSEJOS IMPORTANTES', [
                    '•  En la parte de arriba de TALLER está el "Panel de hoy": te dice cuántos equipos están listos, vencidos o con bajo stock.',
                    '•  Si te equivocas en una orden, puedes editarla: toca el nombre del cliente en la tarjeta de la orden.',
                    '•  Para GUARDAR tu información en la nube de Google: DATOS, Respaldar. Hazlo al menos una vez por semana.',
                    '•  Para ver el tour otra vez: DATOS, AJUSTES, Primeros pasos.',
                    '•  Si algo no funciona bien, cierra y vuelve a abrir la app.'
                ]);

                callout('red', '¿Te trabaste? Llama a ' + ayudaA + ' para que te ayude.', [
                    'No te preocupes si algo sale mal: todo se puede corregir después.'
                ]);

                // Pie de página en todas las hojas
                const total = doc.getNumberOfPages();
                const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                for (let i = 1; i <= total; i++) {
                    doc.setPage(i);
                    stroke(C.line); doc.setLineWidth(0.3);
                    doc.line(M, PH - 13, PW - M, PH - 13);
                    ink(C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
                    doc.text(bizName, M, PH - 8);
                    doc.text('Página ' + i + ' de ' + total, PW / 2, PH - 8, { align: 'center' });
                    doc.text(clean(fecha), PW - M, PH - 8, { align: 'right' });
                }

                const today = new Date().toISOString().slice(0, 10);
                doc.save(`Guia-Rapida-${today}.pdf`);
                showToast('✅ Guía descargada · Imprímela y tenla cerca del taller', 'success');
            } catch (e) {
                console.warn('[downloadGuidePDF]', e);
                showAlert('Error al generar la guía. Intenta de nuevo.', 'error');
            }
        }

