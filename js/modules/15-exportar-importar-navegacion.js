/* Nelson App Pro · js/modules/15-exportar-importar-navegacion.js
   Exportar/importar respaldo, escaner y navegacion por tabs
   (extraido sin cambios de index.html; el orden de carga importa) */
        function showExportFallback(jsonStr, fileName) {
            const existing = document.getElementById('modal-export-fallback');
            if (existing) existing.remove();
            const modal = document.createElement('div');
            modal.id = 'modal-export-fallback';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';
            modal.innerHTML = `
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:24px;width:100%;max-width:400px;overflow:hidden;">
                    <div style="background:linear-gradient(to right,#f97316,#ea580c);padding:16px;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="color:white;font-weight:900;font-size:16px;">📤 GUARDAR RESPALDO</h3>
                        <button onclick="document.getElementById('modal-export-fallback').remove()" style="color:white;background:rgba(0,0,0,0.3);width:32px;height:32px;border-radius:50%;font-weight:bold;font-size:16px;">✕</button>
                    </div>
                    <div style="padding:20px;space-y:12px;">
                        <p style="color:#94a3b8;font-size:12px;margin-bottom:12px;">Elige cómo guardar tu respaldo <strong style="color:#f97316;">${fileName}</strong>:</p>
                        <button onclick="exportViaShare('${encodeURIComponent(jsonStr)}','${fileName}')" style="width:100%;background:#10b981;color:white;padding:14px;border-radius:12px;font-weight:900;font-size:13px;margin-bottom:8px;display:block;">📨 COMPARTIR / ENVIAR POR WHATSAPP</button>
                        <button onclick="exportViaCopy('${encodeURIComponent(jsonStr)}')" style="width:100%;background:#3b82f6;color:white;padding:14px;border-radius:12px;font-weight:900;font-size:13px;margin-bottom:8px;display:block;">📋 COPIAR AL PORTAPAPELES</button>
                        <p style="color:#475569;font-size:10px;text-align:center;margin-top:8px;">Puedes pegar el contenido en un archivo .txt y renombrarlo a .json</p>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        async function exportViaShare(encodedJson, fileName) {
            try {
                const jsonStr = decodeURIComponent(encodedJson);
                const file = new File([jsonStr], fileName, { type: 'application/json' });
                await navigator.share({ files: [file], title: 'Respaldo Nelson App' });
                document.getElementById('modal-export-fallback')?.remove();
            } catch(e) { showAlert('No se pudo compartir: ' + e.message, 'error'); }
        }

        async function exportViaCopy(encodedJson) {
            try {
                const jsonStr = decodeURIComponent(encodedJson);
                await navigator.clipboard.writeText(jsonStr);
                showAlert('✅ Contenido copiado al portapapeles. Pégalo en un archivo .json para guardarlo.', 'success');
                document.getElementById('modal-export-fallback')?.remove();
            } catch(e) { showAlert('No se pudo copiar: ' + e.message, 'error'); }
        }

        async function blobsToB64(blobs) {
            if (!blobs || !blobs.length) return [];
            return Promise.all(blobs.map(b => {
                if (typeof b === 'string') return b;
                return new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(b); });
            }));
        }

        function b64toBlob(b64) {
            try {
                const [header, data] = b64.split(',');
                const mime = header.match(/:(.*?);/)[1];
                const binary = atob(data);
                const arr = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                return new Blob([arr], { type: mime });
            } catch(e) { return null; }
        }

        // ── Validación de respaldos: descarta registros con tipos inválidos ──
        // Si el archivo viene corrupto o modificado, evita meter basura en IndexedDB.
        function _validateBackup(data) {
            if (!data || typeof data !== 'object') return { ok:false, msg:'Archivo vacío o inválido' };
            if (!Array.isArray(data.orders)) return { ok:false, msg:'No tiene órdenes (formato Nelson incorrecto)' };
            // Filtros: cada registro debe tener id numérico y campos críticos del tipo correcto
            const validOrder = (o) => o && typeof o === 'object' && (typeof o.id === 'number' || typeof o.id === 'string') && typeof o.nom === 'string' && typeof o.equ === 'string';
            const validNum   = (x) => x && typeof x === 'object' && (typeof x.id === 'number' || typeof x.id === 'string') && (typeof x.val === 'number' || typeof x.val === 'undefined');
            const validKeyed = (x) => x && typeof x === 'object' && (typeof x.id === 'number' || typeof x.id === 'string');
            data.orders        = data.orders.filter(validOrder);
            data.stock         = Array.isArray(data.stock) ? data.stock.filter(validKeyed) : [];
            data.sales         = Array.isArray(data.sales) ? data.sales.filter(validNum) : [];
            data.gastos        = Array.isArray(data.gastos) ? data.gastos.filter(validNum) : [];
            data.clientes      = Array.isArray(data.clientes) ? data.clientes.filter(c => c && typeof c === 'object' && typeof c.nombre === 'string') : [];
            data.payments      = Array.isArray(data.payments) ? data.payments.filter(validKeyed) : [];
            data.calificaciones= Array.isArray(data.calificaciones) ? data.calificaciones.filter(validKeyed) : [];
            data.stockHistory  = Array.isArray(data.stockHistory) ? data.stockHistory.filter(validKeyed) : [];
            data.orderChat     = Array.isArray(data.orderChat) ? data.orderChat.filter(validKeyed) : [];
            data.paymentPlans  = Array.isArray(data.paymentPlans) ? data.paymentPlans.filter(validKeyed) : [];
            return { ok:true, data };
        }

        async function importData(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if(!file) return;
            // Límite de tamaño: respaldos > 100MB son sospechosos
            if (file.size > 100 * 1024 * 1024) {
                showAlert("❌ Archivo demasiado grande (>100MB). ¿Estás seguro que es un respaldo Nelson?", "error"); return;
            }
            let data;
            try {
                const text = await file.text();
                data = JSON.parse(text);
            } catch(err) {
                showAlert("❌ El archivo no es un JSON válido.", "error"); return;
            }
            const v = _validateBackup(data);
            if (!v.ok) { showAlert("❌ " + v.msg, "error"); return; }
            data = v.data;
            const summary = `Órdenes: ${data.orders.length} · Inventario: ${data.stock.length} · Ventas: ${data.sales.length} · Clientes: ${data.clientes.length}`;
            showConfirm(`¿Importar este respaldo?\n\n${summary}\n\nSe reemplazará TODA la información actual.`, async () => {
                try {
                    await clearStore('orders'); await clearStore('stock'); await clearStore('sales');
                    await clearStore('gastos'); await clearStore('clientes'); await clearStore('payments');
                    await clearStore('stockHistory'); await clearStore('orderChat');
                    await clearStore('paymentPlans'); await clearStore('calificaciones');
                    for(let o of data.orders) {
                        const fotos = [];
                        if(o.fotos && Array.isArray(o.fotos)) {
                            for(let b64 of o.fotos) { if(typeof b64==='string'&&b64.startsWith('data:')){ const blob=b64toBlob(b64); if(blob) fotos.push(blob); } }
                        }
                        const fotosEntrega = [];
                        if(o.fotosEntrega && Array.isArray(o.fotosEntrega)) {
                            for(let b64 of o.fotosEntrega) { if(typeof b64==='string'&&b64.startsWith('data:')){ const blob=b64toBlob(b64); if(blob) fotosEntrega.push(blob); } }
                        }
                        await put('orders', {...o, fotos, fotosEntrega});
                    }
                    for(let s of data.stock) await put('stock', _normStock(s));
                    for(let s of data.sales) await put('sales', s);
                    for(let g of data.gastos) await put('gastos', g);
                    for(let c of data.clientes) await put('clientes', c);
                    for(let p of data.payments) await put('payments', p);
                    for(let c of data.calificaciones) await put('calificaciones', c);
                    for(let h of data.stockHistory) await put('stockHistory', h);
                    for(let m of data.orderChat) await put('orderChat', m);
                    for(let p of data.paymentPlans) await put('paymentPlans', p);
                    // Limpiar campos duplicados y normalizar tipos por si el backup era viejo
                    await _migrateStockFields();
                    await updateTotal(); await updateSuggestions(); await renderCartera();
                    showAlert("✅ Importación exitosa. La app se recargará.", "success", () => location.reload());
                } catch(err) { showAlert("Error al importar: " + err.message, "error"); }
            });
        }

        // Escáner de código de barras
        async function scanBarcode() {
            if (!('BarcodeDetector' in window)) {
                showAlert("Tu navegador no soporta escaneo de códigos. Usa la búsqueda manual.", "warning");
                return;
            }
            cameraMode = 'barcode';
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            try {
                stream = await requestAppCameraStream();
                const video = document.getElementById('video'); video.srcObject = stream; await video.play();
                document.getElementById('camera-modal').classList.remove('hidden');
                const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code'] });
                const interval = setInterval(async () => {
                    if (!video.videoWidth) return;
                    const barcodes = await detector.detect(video);
                    if (barcodes.length > 0) {
                        clearInterval(interval);
                        closeCamera();
                        const code = barcodes[0].rawValue;
                        const stock = await getAll('stock');
                        const product = stock.find(p => p.barcode === code || p.n.includes(code));
                        if (product) {
                            showAlert(`Producto encontrado: ${product.n}\nStock actual: ${product.q} unidades`, "success");
                            document.getElementById('stock-search').value = product.n;
                            renderStock();
                        } else {
                            showConfirm(`Código ${code} no registrado.\n¿Deseas agregarlo como nuevo producto?`, () => {
                                document.getElementById('stock-modal-id').value = '';
                                document.getElementById('stock-modal-name').value = code.toUpperCase();
                                document.getElementById('stock-modal-price').value = '';
                                document.getElementById('stock-modal-qty').value = '0';
                                document.getElementById('stock-modal-title').innerText = 'NUEVO REPUESTO';
                                document.getElementById('modal-stock-form').classList.remove('hidden');
                            }, "info");
                        }
                    }
                }, 1000);
            } catch(e) { releaseAppCameraStreams(); stream = null; showAlert(getAppCameraErrorMessage(e), "error"); }
        }

        // Swipe entre tabs — DESACTIVADO
        // Razón: en una app de trabajo con 4 modos muy distintos (formulario, lista,
        // transaccional, config), el swipe horizontal genera cambios accidentales
        // mientras scrolleás vertical. Es preferible la navegación explícita con los
        // botones de abajo (mobile), el sidebar (desktop/tablet) o los atajos 1-4.

        function tab(t) {
            // ═══ PASO 1: actualización visual INSTANTÁNEA (sin esperas) ═══
            // La animación del botón y el cambio de vista deben ser inmediatos
            if (cameraMode !== 'entrega') closeCamera();
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${t}`).classList.remove('hidden');
            // Sync nav bar inferior mobile
            document.querySelectorAll('nav.bottom-nav-mobile .nav-btn').forEach(b => b.classList.remove('nav-active'));
            const mobileBtn = document.getElementById(`btn-${t}`);
            if (mobileBtn) mobileBtn.classList.add('nav-active');
            // Sync sidebar
            ['taller','ordenes','ventas','admin'].forEach(name => {
                const sEl = document.getElementById(`sidebar-btn-${name}`);
                if (sEl) sEl.classList.toggle('active', name === t);
            });
            // Sync desktop topbar title
            const tabTitles = { taller:'Nueva Recepción', ordenes:'Órdenes', ventas:'Caja & Inventario', admin:'Datos & Config' };
            const dtTitle = document.getElementById('desktop-topbar-title');
            if (dtTitle) dtTitle.innerText = tabTitles[t] || 'NELSON';
            window.scrollTo(0,0);

            // ═══ PASO 2: renderizados pesados en segundo plano (no bloqueantes) ═══
            // Dejamos que el navegador pinte primero, luego cargamos los datos
            requestAnimationFrame(() => {
                setTimeout(async () => {
                    try {
                        if (t === 'ordenes') {
                            await renderOrders();
                        } else if (t === 'ventas') {
                            // Paralelizar las 4 cargas en vez de secuencial
                            await Promise.all([
                                renderStock(),
                                renderMovimientos(),
                                updateVentaSelect(),
                                renderCartera()
                            ]);
                        } else if (t === 'taller') {
                            _refreshDailyPanel();
                        }
                        syncSidebarCash();
                    } catch(e) { console.warn('[tab async render]', e); }
                }, 0);
            });
        }

