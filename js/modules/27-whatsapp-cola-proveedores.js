/* Nelson App Pro · js/modules/27-whatsapp-cola-proveedores.js
   Cola de WhatsApp offline y pedidos a proveedores
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ════════════════════════════════════════════════════════════════════════
        // COLA DE MENSAJES WHATSAPP PENDIENTES (se usa cuando hay offline)
        // El indicador visual principal lo maneja showNetBadge (net-badge)
        // ════════════════════════════════════════════════════════════════════════
        function _getPendingMessagesCount() {
            try {
                const q = JSON.parse(localStorage.getItem('waQueue') || '[]');
                return Array.isArray(q) ? q.length : 0;
            } catch(e) { return 0; }
        }

        async function _flushWhatsappQueue() {
            try {
                const queue = JSON.parse(localStorage.getItem('waQueue') || '[]');
                if (!queue.length) return;
                showToast(`Abriendo ${queue.length} mensaje${queue.length !== 1 ? 's' : ''} pendiente${queue.length !== 1 ? 's' : ''}...`, 'info');
                for (let i = 0; i < queue.length; i++) {
                    const m = queue[i];
                    if (!m || !m.url) continue;
                    sessionStorage.setItem('_waJump', '1');
                    window.open(m.url, '_blank');
                    if (i < queue.length - 1) await new Promise(r => setTimeout(r, 1500));
                }
                localStorage.setItem('waQueue', '[]');
                showToast('✅ Todos los mensajes fueron abiertos', 'success');
            } catch(e) { console.warn('[flushWhatsappQueue]', e); }
        }

        // Helper: encolar o enviar al instante un mensaje según conexión real
        function _sendOrQueueWA(url, label) {
            if (_isReallyOnline()) {
                sessionStorage.setItem('_waJump', '1');
                window.open(url, '_blank');
                return 'sent';
            } else {
                try {
                    const q = JSON.parse(localStorage.getItem('waQueue') || '[]');
                    q.push({ url, label: label || '', ts: Date.now() });
                    localStorage.setItem('waQueue', JSON.stringify(q));
                    showToast(`📥 Guardado · Se abrirá cuando vuelva la señal`, 'info');
                    return 'queued';
                } catch(e) { return 'failed'; }
            }
        }

        // Estado real de conexión (combina navigator.onLine + último ping verificado)
        let _lastOnlineVerified = true;
        function _isReallyOnline() {
            // Si navigator.onLine dice false, confiar en eso (está 100% desconectado del sistema)
            if (!navigator.onLine) return false;
            // Si navigator.onLine dice true, usar el resultado de nuestro último ping
            return _lastOnlineVerified;
        }

        // Ping real a internet para verificar conexión más allá de navigator.onLine
        // (algunos Android/WebView reportan onLine=false aunque haya datos, y al revés)
        async function _verifyRealConnection() {
            if (!navigator.onLine) {
                _lastOnlineVerified = false;
                return false;
            }
            try {
                // Ping ligero a Google (imagen transparente de 1 pixel, sin caché)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const response = await fetch('https://www.google.com/generate_204', {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                _lastOnlineVerified = true;
                return true;
            } catch (e) {
                // Si falla el ping, intentar con un fallback más tolerante
                try {
                    await fetch('https://cdnjs.cloudflare.com/favicon.ico', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-store'
                    });
                    _lastOnlineVerified = true;
                    return true;
                } catch(e2) {
                    _lastOnlineVerified = false;
                    return false;
                }
            }
        }

        async function pedirAProveedor(stockId) {
            try {
                const stock = await getAll('stock');
                const item  = stock.find(s => s.id === stockId);
                if (!item) return showAlert('Repuesto no encontrado', 'error');
                if (!item.supplier || !item.supplier.trim()) return showAlert('Este repuesto no tiene proveedor asignado. Edítalo y agrega el proveedor.', 'info');

                const cantidadSugerida = Math.max(1, (item.minStock || 3) * 2 - (item.q || 0));
                const qtyInput = document.getElementById(`oc-qty-${stockId}`);
                const cantidad = (qtyInput && qtyInput.value) ? parseInt(qtyInput.value) : cantidadSugerida;

                // Buscar match en tabla de proveedores (por nombre, case-insensitive)
                const provs = await getAll('proveedores');
                const supplierNorm = item.supplier.trim().toLowerCase();
                const matchProv = provs.find(p => (p.nombre || '').trim().toLowerCase() === supplierNorm)
                                || provs.find(p => (p.nombre || '').trim().toLowerCase().includes(supplierNorm))
                                || provs.find(p => supplierNorm.includes((p.nombre || '').trim().toLowerCase()));

                const biz = _safeBizConfig();
                const bizName = biz.name || 'Todo Repuestos Nelson';

                let mensaje = `Hola, ${matchProv && matchProv.nombre ? matchProv.nombre.split(' ')[0] : ''}\n\n`;
                mensaje += `Te escribo de *${bizName}*. Necesito el siguiente repuesto:\n\n`;
                mensaje += `📦 *${item.n}*\n`;
                if (item.code) mensaje += `🔖 Código: ${item.code}\n`;
                mensaje += `🔢 Cantidad: *${cantidad} unidad${cantidad !== 1 ? 'es' : ''}*\n\n`;
                mensaje += `¿Tienes disponibilidad y cuál sería el precio?\n\nGracias.`;

                // Si hay proveedor con teléfono, abrir WhatsApp directo
                if (matchProv && matchProv.telefono) {
                    const tel = matchProv.telefono.replace(/\D/g, '');
                    const prefix = tel.length === 10 ? '57' : '';
                    const url = `https://wa.me/${prefix}${tel}?text=${encodeURIComponent(mensaje)}`;
                    sessionStorage.setItem('_waJump', '1');
                    window.open(url, '_blank');
                    showToast(`📱 Enviando a ${matchProv.nombre}`, 'success');
                } else {
                    // No hay match con teléfono → solo copiar el mensaje al portapapeles
                    try {
                        await navigator.clipboard.writeText(mensaje);
                        showAlert(`El proveedor "${item.supplier}" no tiene teléfono guardado.\n\nEl mensaje se copió al portapapeles — pégalo en tu WhatsApp.`, 'info');
                    } catch (e) {
                        showAlert(`Proveedor "${item.supplier}" no encontrado.\n\nNo se pudo armar el WhatsApp automático. Llámalo directamente.`, 'info');
                    }
                }
            } catch (e) {
                console.warn('[pedirAProveedor]', e);
                showAlert('Error al armar el pedido', 'error');
            }
        }

        async function _buildOCText() {
            const stock  = await getAll('stock');
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            const bajos  = stock.filter(s => s.q <= (s.minStock || threshold));
            const biz    = _safeBizConfig();
            const notas  = document.getElementById('oc-notas').value.trim();
            const provId = document.getElementById('oc-proveedor').value;
            const provs  = await getAll('proveedores');
            const prov   = provs.find(p => p.id === Number(provId));
            const fecha  = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});

            let txt = `📦 *ORDEN DE COMPRA*\n`;
            txt += `🏢 ${biz.name || 'TODO REPUESTOS NELSON'}\n`;
            txt += `📅 ${fecha}\n`;
            if (prov) txt += `👤 Proveedor: *${prov.nombre}*\n`;
            txt += `\n*ARTÍCULOS REQUERIDOS:*\n`;
            bajos.forEach(s => {
                const qty = parseInt(document.getElementById(`oc-qty-${s.id}`)?.value) || 1;
                txt += `• ${s.n}${s.code ? ` (${s.code})` : ''} — *${qty} uds*\n`;
            });
            if (notas) txt += `\n📝 Notas: ${notas}`;
            return { txt, prov };
        }

        async function sendOCWhatsApp() {
            const { txt, prov } = await _buildOCText();
            if (!prov?.tel) return showAlert('Selecciona un proveedor con teléfono registrado para enviar por WhatsApp.', 'warning');
            const num = prov.tel.replace(/\D/g,'');
            const prefix = num.startsWith('57') ? '' : '57';
            sessionStorage.setItem('_waJump','1'); window.open(`https://wa.me/${prefix}${num}?text=${encodeURIComponent(txt)}`, '_blank');
        }

        async function copyOCText() {
            const { txt } = await _buildOCText();
            try {
                await navigator.clipboard.writeText(txt);
                showToast('Orden copiada al portapapeles ✅', 'success');
            } catch(e) {
                showAlert('No se pudo copiar automáticamente. Selecciona el texto manualmente.', 'info');
            }
        }

