/* Nelson App Pro · js/modules/24-plantillas-whatsapp-tecnicos.js
   Plantillas WhatsApp y tecnicos
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== PLANTILLAS WHATSAPP ====================
        function saveWhatsappTemplates() {
            const tpls = {
                recepcion:   document.getElementById('tpl-recepcion').value,
                revision:    document.getElementById('tpl-revision').value,
                presupuesto: document.getElementById('tpl-presupuesto').value,
                listo:       document.getElementById('tpl-listo').value,
                garantia:    document.getElementById('tpl-garantia').value,
                norepara:    document.getElementById('tpl-norepara').value,
                retraso:     document.getElementById('tpl-retraso').value,
                cobro:       document.getElementById('tpl-cobro').value
            };
            localStorage.setItem('whatsappTemplates', JSON.stringify(tpls));
            showToast('Plantillas guardadas', 'success');
        }
        function loadWhatsappTemplates() {
            const saved = localStorage.getItem('whatsappTemplates');
            if (!saved) return;
            const tpls = JSON.parse(saved);
            // Migración suave: si una plantilla guardada NO incluye {negocio}, agregárselo al inicio
            // (esto solo corre una vez por instalación gracias al flag)
            const migrated = localStorage.getItem('tplsBizMigrated_v1');
            if (!migrated) {
                let changedAny = false;
                Object.keys(tpls).forEach(k => {
                    if (tpls[k] && !tpls[k].includes('{negocio}')) {
                        tpls[k] = '🔧 *{negocio}*\n\n' + tpls[k];
                        changedAny = true;
                    }
                });
                if (changedAny) {
                    localStorage.setItem('whatsappTemplates', JSON.stringify(tpls));
                    console.log('[NelsonApp] Plantillas WhatsApp migradas para incluir nombre del negocio');
                }
                localStorage.setItem('tplsBizMigrated_v1', '1');
            }
            const ids = ['recepcion','revision','presupuesto','listo','garantia','norepara','retraso','cobro'];
            ids.forEach(k => {
                const el = document.getElementById('tpl-' + k);
                if (el) el.value = tpls[k] || '';
            });
        }
        function buildWhatsappMsg(type, order) {
            const saved = localStorage.getItem('whatsappTemplates');
            const tpls  = saved ? JSON.parse(saved) : {};
            const biz   = _safeBizConfig();
            const bizName = ((biz.name || 'Todo Repuestos Nelson').trim()).toUpperCase();
            const defaults = {
                recepcion:   '🔧 *{negocio}*\n\nHola {cliente}, recibimos tu {equipo}. Orden {orden}. Te avisamos cuando esté listo. ¡Gracias por confiar en nosotros! 🙌',
                revision:    '🔧 *{negocio}*\n\nHola {cliente}, tu {equipo} está siendo revisado y diagnosticado. En breve te informamos el estado 🔍',
                presupuesto: '🔧 *{negocio}*\n\nHola {cliente}, el presupuesto para reparar tu {equipo} es de ${valor}. Por favor confírmanos si apruebas la reparación ✅',
                listo:       '🔧 *{negocio}*\n\nHola {cliente}, tu {equipo} ya está listo! Valor: ${valor}. Puedes pasar a recogerlo cuando gustes 🎉',
                garantia:    '🔧 *{negocio}*\n\nHola {cliente}, recuerda que tu {equipo} tiene garantía de {dias} días desde la fecha de entrega. Estamos a tu servicio 🛡️',
                norepara:    '🔧 *{negocio}*\n\nHola {cliente}, lamentamos informarte que tu {equipo} no tiene reparación posible o no conseguimos el repuesto. Puedes pasar a recogerlo cuando gustes 😔',
                retraso:     '🔧 *{negocio}*\n\nHola {cliente}, te informamos que la reparación de tu {equipo} está tomando un poco más de tiempo del previsto. Te avisamos en cuanto esté listo, gracias por tu paciencia ⏳',
                cobro:       '🔧 *{negocio}*\n\nHola {cliente}, tienes un saldo pendiente de ${valor} por la reparación de tu {equipo}. Te agradecemos pasar a cancelar cuando gustes 🙏'
            };
            let msg = tpls[type] || defaults[type] || '';
            msg = msg
                .replace(/{negocio}/g, bizName)
                .replace(/{cliente}/g, order.nom || '')
                .replace(/{equipo}/g,  order.equ || '')
                .replace(/{valor}/g,   (order.val || 0).toLocaleString())
                .replace(/{orden}/g,   formatOrderNum(order.orderNum || 0))
                .replace(/{dias}/g,    order.garantia || '');
            return msg;
        }

        // ==================== TÉCNICOS ====================
        function getTecnicos() { return JSON.parse(localStorage.getItem('tecnicos') || '[]'); }
        function saveTecnicos(list) { localStorage.setItem('tecnicos', JSON.stringify(list)); }
        function addTecnico() {
            const input = document.getElementById('new-tecnico');
            const name  = input.value.trim().toUpperCase();
            if (!name) return;
            const list = getTecnicos();
            if (list.includes(name)) { showToast('Ya existe ese técnico', 'warning'); return; }
            list.push(name);
            saveTecnicos(list);
            input.value = '';
            renderTecnicosList();
            _refreshTecnicosSelects();
            showToast(`Técnico ${name} agregado`, 'success');
        }
        function removeTecnico(name) {
            saveTecnicos(getTecnicos().filter(t => t !== name));
            renderTecnicosList();
        }
