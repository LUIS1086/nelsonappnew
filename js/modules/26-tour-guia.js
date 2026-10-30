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
        async function downloadGuidePDF() {
            try {
                showToast('📄 Generando guía...', 'info');
                // Usar el helper centralizado: garantiza jsPDF + autoTable
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    if (!navigator.onLine) {
                        showAlert('Para generar la guía necesitas conexión a Internet (se descarga una librería la primera vez).\n\nIntenta de nuevo cuando tengas señal.', 'info');
                        return;
                    }
                }
                await _ensurePdfLibsReady();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const biz = _safeBizConfig();
                const bizName = biz.name || 'Todo Repuestos Nelson';
                const pageW = doc.internal.pageSize.getWidth();
                const pageH = doc.internal.pageSize.getHeight();

                // ═══ PÁGINA 1 — Portada y flujo básico ═══
                // Header con color
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageW, 48, 'F');
                doc.setFillColor(249, 115, 22);
                doc.rect(0, 46, pageW, 2, 'F');
                // Logo/título
                doc.setTextColor(254, 243, 199);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('Guía Rápida', pageW/2, 22, { align: 'center' });
                doc.setTextColor(252, 211, 77);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(bizName, pageW/2, 32, { align: 'center' });
                doc.setTextColor(156, 163, 175);
                doc.setFontSize(9);
                doc.text('Los pasos básicos para usar la app', pageW/2, 40, { align: 'center' });

                // Intro
                let y = 62;
                doc.setTextColor(31, 41, 55);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('📱 La app tiene 4 botones abajo:', 14, y);
                y += 8;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(75, 85, 99);
                const intros = [
                    ['🔧 TALLER', 'Para recibir equipos nuevos de los clientes.'],
                    ['📋 ÓRDENES', 'Lista de todos los equipos recibidos.'],
                    ['💵 CAJA', 'Ventas de repuestos, gastos e inventario.'],
                    ['📊 DATOS', 'Reportes, estadísticas y configuración.'],
                ];
                intros.forEach(([nombre, desc]) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(17, 24, 39);
                    doc.text(nombre, 18, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(75, 85, 99);
                    doc.text(desc, 60, y);
                    y += 7;
                });

                // Sección 1
                y += 4;
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('1. Cuando un cliente trae un equipo dañado', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos1 = [
                    '1) Toca el botón TALLER abajo.',
                    '2) Escribe el NOMBRE COMPLETO del cliente.',
                    '3) Escribe el NÚMERO DE WHATSAPP (sin espacios).',
                    '4) Describe el EQUIPO: marca, modelo, tipo.',
                    '5) Escribe la FALLA que reportó el cliente.',
                    '6) Pon el VALOR aproximado de la reparación.',
                    '7) Si dejó un adelanto, escríbelo en ADELANTO.',
                    '8) Al final, toca el botón naranja REGISTRAR.',
                ];
                pasos1.forEach(p => {
                    doc.text(p, 18, y);
                    y += 6.5;
                });
                y += 3;
                doc.setFillColor(220, 252, 231);
                doc.rect(10, y - 3, pageW - 20, 10, 'F');
                doc.setTextColor(6, 95, 70);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('💡 TIP: Si el cliente ya vino antes, sale una tarjeta azul con su', 14, y + 1);
                doc.text('historial. Puedes tocarla para ver qué le has reparado.', 14, y + 5);
                y += 14;

                // Sección 2
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('2. Cuando ya reparaste el equipo', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos2 = [
                    '1) Ve a ÓRDENES.',
                    '2) Busca la orden del cliente.',
                    '3) Toca el botón de ESTADO (dice "RECIBIDO", "EN REVISIÓN"...)',
                    '4) Cambia a REPARADO.',
                    '5) La app te preguntará qué repuestos usaste (opcional).',
                    '6) Avisa al cliente con el botón 💬 de WhatsApp.',
                ];
                pasos2.forEach(p => {
                    doc.text(p, 18, y);
                    y += 6.5;
                });

                // Footer página 1
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text('Página 1 de 2', pageW / 2, pageH - 8, { align: 'center' });

                // ═══ PÁGINA 2 — Entrega, Caja y Consejos ═══
                doc.addPage();
                // Header pág 2
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageW, 20, 'F');
                doc.setFillColor(249, 115, 22);
                doc.rect(0, 19, pageW, 1, 'F');
                doc.setTextColor(254, 243, 199);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Guía Rápida — ' + bizName, pageW/2, 13, { align: 'center' });

                y = 32;

                // Sección 3
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('3. Cuando el cliente viene a recoger', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos3 = [
                    '1) Abre la orden del cliente.',
                    '2) Cambia el estado a ENTREGADO.',
                    '3) Registra el pago final.',
                    '4) Si usaste efectivo, queda registrado en CAJA automáticamente.',
                ];
                pasos3.forEach(p => { doc.text(p, 18, y); y += 6.5; });
                y += 3;

                // Sección 4
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('4. Caja (ventas de repuestos y gastos)', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos4 = [
                    '• Para VENDER un repuesto: toca CAJA → Nueva Venta.',
                    '• Para registrar un GASTO: toca CAJA → Nuevo Gasto.',
                    '• El saldo de la caja se actualiza solo al final del día.',
                    '• Si ves que un repuesto baja de cantidad, es normal:',
                    '  la app descuenta el stock automáticamente al vender.',
                ];
                pasos4.forEach(p => { doc.text(p, 18, y); y += 6.5; });
                y += 3;

                // Sección 5 - Consejos
                doc.setFillColor(219, 234, 254);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(29, 78, 216);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('✨ Consejos importantes', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const consejos = [
                    '• En la parte de arriba de TALLER verás el "Panel de hoy":',
                    '  te dice cuántos equipos están listos, vencidos, o bajo stock.',
                    '',
                    '• Si te equivocas en una orden, puedes editarla:',
                    '  toca el nombre del cliente en la tarjeta de la orden.',
                    '',
                    '• Para GUARDAR tu información en la nube de Google:',
                    '  DATOS → Respaldar. Hazlo al menos una vez por semana.',
                    '',
                    '• Si quieres ver el tour otra vez:',
                    '  DATOS → AJUSTES → Primeros pasos.',
                    '',
                    '• Si algo no te funciona bien, cierra y vuelve a abrir la app.',
                ];
                consejos.forEach(p => {
                    if (p) doc.text(p, 18, y);
                    y += 5.5;
                });
                y += 2;

                // Botón de ayuda al final
                doc.setFillColor(254, 226, 226);
                doc.rect(10, y - 3, pageW - 20, 18, 'F');
                doc.setDrawColor(248, 113, 113);
                doc.setLineWidth(0.5);
                doc.rect(10, y - 3, pageW - 20, 18, 'S');
                doc.setTextColor(153, 27, 27);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('⚠️ ¿Te trabaste? Llama a Luis para que te ayude.', 14, y + 2);
                doc.setTextColor(127, 29, 29);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text('No te preocupes si algo sale mal, todo se puede corregir después.', 14, y + 9);

                // Footer
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text('Página 2 de 2', pageW / 2, pageH - 8, { align: 'center' });

                const today = new Date().toISOString().slice(0, 10);
                doc.save(`Guia-Rapida-${today}.pdf`);
                showToast('✅ Guía descargada · Imprímela y tenla cerca del taller', 'success');
            } catch (e) {
                console.warn('[downloadGuidePDF]', e);
                showAlert('Error al generar la guía. Intenta de nuevo.', 'error');
            }
        }

