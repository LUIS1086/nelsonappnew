/* NelsonApp — 70-qr.js
 * Escáner, códigos QR y etiquetas
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== BLOQUE 3: ESCÁNER QR / CÓDIGO DE BARRAS ====================
        let _qrStream    = null;
        let _qrMode      = 'stock';
        let _qrAnimFrame = null;

        async function openQRScanner(mode = 'stock') {
            _qrMode = mode;
            document.getElementById('qr-scan-hint').innerText =
                mode === 'stock' ? 'Apunta al código del repuesto' : 'Apunta al código QR de la orden';
            document.getElementById('modal-qr-scanner').classList.remove('hidden');
            document.getElementById('qr-manual-input').value = '';
            try {
                _qrStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                const video = document.getElementById('qr-video');
                video.srcObject = _qrStream;
                await video.play();
                _startQRDetection(video);
            } catch(e) {
                showToast('Sin acceso a cámara — usa el campo manual', 'warning');
            }
        }

        async function _startQRDetection(video) {
            // Usar BarcodeDetector si el navegador lo soporta (Chrome Android ≥ 83)
            if (!(await window._ensureBarcodeDetector())) { if (typeof showToast === 'function') showToast('Este navegador no soporta el escaneo automático. Escribe el código a mano.', 'warning'); return; }
            if (!_qrStream) return;
            const detector = new BarcodeDetector({ formats: ['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e','data_matrix'] });
            function detect() {
                if (!_qrStream) return;
                detector.detect(video).then(codes => {
                    if (codes.length > 0) {
                        const code = codes[0].rawValue;
                        applyQRCode(code);
                    } else {
                        _qrAnimFrame = requestAnimationFrame(detect);
                    }
                }).catch(() => {
                    _qrAnimFrame = requestAnimationFrame(detect);
                });
            }
            _qrAnimFrame = requestAnimationFrame(detect);
        }

        function closeQRScanner() {
            if (_qrAnimFrame) cancelAnimationFrame(_qrAnimFrame);
            if (_qrStream) { _qrStream.getTracks().forEach(t => t.stop()); _qrStream = null; }
            const video = document.getElementById('qr-video');
            video.srcObject = null;
            document.getElementById('modal-qr-scanner').classList.add('hidden');
        }

        async function applyQRCode(code) {
            if (!code || !code.trim()) return;
            closeQRScanner();
            const q = code.trim().toUpperCase();
            if (_qrMode === 'stock') {
                // Buscar en inventario por código o nombre
                const stock = await getAll('stock');
                const match = stock.find(s =>
                    (s.code || '').toUpperCase() === q ||
                    (s.n || '').toUpperCase().includes(q)
                );
                if (match) {
                    // Rellenar el buscador de stock y filtrar
                    const searchEl = document.getElementById('stock-search');
                    if (searchEl) { searchEl.value = match.n; renderStock(); }
                    tab('ventas');
                    showToast(`🔩 Encontrado: ${match.n}`, 'success');
                } else {
                    // Si no encuentra, rellenar el campo código en el modal de nuevo repuesto
                    addStockItem();
                    setTimeout(() => {
                        const codeEl = document.getElementById('stock-modal-code');
                        if (codeEl) codeEl.value = q;
                        showToast(`Código ${q} no encontrado — completa los datos`, 'info');
                    }, 300);
                }
            }
        }

        // ==================== QR ETIQUETAS DE ARTÍCULOS ====================
        let _qrCurrentItem = null;
        let _qrSize = 110;

        async function openQRItemModal(id) {
            const stock = await getAll('stock');
            const item  = stock.find(s => s.id === id);
            if (!item) return;
            _qrCurrentItem = item;
            _qrSize = 110;

            const biz   = _safeBizConfig();
            const cur   = getCurrency();

            // Subtítulo modal
            document.getElementById('qr-item-subtitle').innerText = item.n;

            // Logo del negocio
            const logo    = localStorage.getItem('businessLogo');
            const logoEl  = document.getElementById('qr-label-logo');
            const logoImg = document.getElementById('qr-label-logo-img');
            if (logo) { logoImg.src = logo; logoEl.style.display = 'block'; }
            else       { logoEl.style.display = 'none'; }

            // Nombre del negocio
            document.getElementById('qr-label-biz').innerText = biz.shortName || biz.name || '';

            // Imagen del producto
            const prodImgBox = document.getElementById('qr-label-product-img');
            const prodImgEl  = document.getElementById('qr-label-product-img-el');
            if (item.img) { prodImgEl.src = item.img; prodImgBox.style.display = 'block'; }
            else           { prodImgBox.style.display = 'none'; }

            // Nombre, código, precio, categoría
            document.getElementById('qr-label-name').innerText  = item.n;
            document.getElementById('qr-label-code').innerText  = item.code ? `Cód: ${item.code}` : '';
            document.getElementById('qr-label-price').innerText = cur + item.p.toLocaleString('es-CO');
            document.getElementById('qr-label-cat').innerText   = item.cat || '';

            // Generar QR
            _buildQR(item, _qrSize);

            // Actualizar botones de tamaño
            _updateQRSizeBtns(_qrSize);

            document.getElementById('modal-qr-item').classList.remove('hidden');
        }

        function _buildQR(item, size) {
            const canvas = document.getElementById('qr-code-canvas');
            canvas.innerHTML = '';
            // Contenido del QR: datos del producto en formato legible
            const content = [
                item.n,
                item.code ? `COD:${item.code}` : '',
                `PRECIO:${getCurrency()}${item.p.toLocaleString('es-CO')}`,
                item.cat ? `CAT:${item.cat}` : ''
            ].filter(Boolean).join(' | ');

            new QRCode(canvas, {
                text: content,
                width:  size,
                height: size,
                colorDark:  '#111827',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }

        function regenerateQR(size) {
            if (!_qrCurrentItem) return;
            _qrSize = size;
            _buildQR(_qrCurrentItem, size);
            _updateQRSizeBtns(size);
        }

        function _updateQRSizeBtns(activeSize) {
            const sizes = [80, 110, 140];
            document.querySelectorAll('.qr-size-btn').forEach((btn, i) => {
                btn.className = `qr-size-btn flex-1 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${sizes[i] === activeSize ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-violet-700'}`;
            });
        }

        function closeQRItemModal() {
            document.getElementById('modal-qr-item').classList.add('hidden');
            _qrCurrentItem = null;
        }

        async function downloadQRLabel() {
            const card = document.getElementById('qr-label-card');
            try {
                const canvas = await html2canvas(card, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
                const name   = (_qrCurrentItem?.n || 'etiqueta').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                await downloadImageCompat(canvas, `QR_${name}.png`);
                showToast('Etiqueta descargada ✅', 'success');
            } catch(e) {
                showAlert('Error al generar la imagen. Inténtalo de nuevo.', 'error');
            }
        }

        function printQRLabel() {
            const card = document.getElementById('qr-label-card');
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:100mm;';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                    @page { size: 80mm auto; margin: 4mm; }
                    body  { margin:0; display:flex; justify-content:center; font-family:sans-serif; }
                    @media print { body { margin:0; } }
                </style>
            </head><body>
                ${card.outerHTML}
                <script>window.onload=()=>{window.print();setTimeout(()=>document.body.parentElement?.remove?.(),1200);}<\/script>
            </body></html>`);
            doc.close();
            showToast('Abriendo impresora…', 'info');
        }

        // ── QR EN LOTE ──
        async function openQRBulk() {
            const stock = await getAll('stock');
            const list  = document.getElementById('qr-bulk-list');
            const cur   = getCurrency();
            if (!stock.length) return showAlert('No hay artículos en el inventario.', 'info');

            list.innerHTML = stock
                .sort((a,b) => a.n.localeCompare(b.n))
                .map(s => `
                <label class="flex items-center gap-3 p-3 rounded-xl bg-black/20 cursor-pointer hover:bg-violet-500/10 transition">
                    <input type="checkbox" class="qr-bulk-check w-4 h-4 rounded accent-violet-500" data-id="${s.id}" checked>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-white truncate">${escapeHtml(s.n)}</p>
                        <p class="text-[10px] text-slate-400">${s.code ? `${s.code} · ` : ''}${cur}${s.p.toLocaleString()}</p>
                    </div>
                    <span class="text-[10px] text-slate-500">${s.q} uds</span>
                </label>`).join('');

            document.getElementById('modal-qr-bulk').classList.remove('hidden');
        }

        function closeQRBulk() {
            document.getElementById('modal-qr-bulk').classList.add('hidden');
        }

        function selectAllQRItems(val) {
            document.querySelectorAll('.qr-bulk-check').forEach(cb => cb.checked = val);
        }

        async function printQRBulk() {
            const checked = [...document.querySelectorAll('.qr-bulk-check:checked')];
            if (!checked.length) return showAlert('Selecciona al menos un artículo.', 'warning');

            const stock   = await getAll('stock');
            const biz     = _safeBizConfig();
            const cur     = getCurrency();
            const logo    = localStorage.getItem('businessLogo');
            const bizName = biz.shortName || biz.name || '';

            // Generar QR en base64 para cada artículo seleccionado
            const ids   = checked.map(cb => parseInt(cb.dataset.id));
            const items = ids.map(id => stock.find(s => s.id === id)).filter(Boolean);

            // Construir HTML de impresión con múltiples etiquetas
            let labelsHTML = '';
            for (const item of items) {
                const content = [
                    item.n,
                    item.code ? `COD:${item.code}` : '',
                    `PRECIO:${cur}${item.p.toLocaleString('es-CO')}`,
                    item.cat ? `CAT:${item.cat}` : ''
                ].filter(Boolean).join(' | ');

                // Generar QR en canvas oculto
                const tmpDiv = document.createElement('div');
                tmpDiv.style.cssText = 'position:absolute;left:-9999px;top:0;';
                document.body.appendChild(tmpDiv);
                new QRCode(tmpDiv, { text: content, width: 100, height: 100,
                    colorDark: '#111827', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
                await new Promise(r => setTimeout(r, 80));
                const qrImg = tmpDiv.querySelector('img')?.src || tmpDiv.querySelector('canvas')?.toDataURL() || '';
                tmpDiv.remove();

                const logoHtml = logo ? `<img src="${logo}" style="width:32px;height:32px;object-fit:contain;border-radius:6px;display:block;margin:0 auto 4px;">` : '';
                const prodImgHtml = item.img ? `<img src="${item.img}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;margin:0 auto 4px;display:block;">` : '';

                labelsHTML += `
                <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 12px;width:72mm;display:inline-flex;flex-direction:column;align-items:center;gap:6px;margin:3mm;vertical-align:top;box-sizing:border-box;">
                    ${logoHtml}
                    ${bizName ? `<p style="font-size:7px;font-weight:800;color:#f97316;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:sans-serif;">${escapeHtml(bizName)}</p>` : ''}
                    ${prodImgHtml}
                    <p style="font-size:11px;font-weight:900;color:#111;text-align:center;margin:0;font-family:sans-serif;line-height:1.3;">${escapeHtml(item.n)}</p>
                    ${item.code ? `<p style="font-size:9px;color:#6b7280;font-family:monospace;margin:0;">${item.code}</p>` : ''}
                    ${qrImg ? `<img src="${qrImg}" style="width:90px;height:90px;border:1px solid #e5e7eb;border-radius:6px;padding:4px;background:white;">` : ''}
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:4px 14px;text-align:center;width:100%;box-sizing:border-box;">
                        <p style="font-size:7px;color:#16a34a;font-weight:700;margin:0;letter-spacing:1px;font-family:sans-serif;">PRECIO VENTA</p>
                        <p style="font-size:17px;font-weight:900;color:#15803d;margin:0;font-family:sans-serif;">${cur}${item.p.toLocaleString('es-CO')}</p>
                    </div>
                    ${item.cat ? `<p style="font-size:8px;color:#9ca3af;margin:0;font-family:sans-serif;">${escapeHtml(item.cat)}</p>` : ''}
                </div>`;
            }

            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                    @page { size: A4; margin: 8mm; }
                    body  { margin:0; font-family:sans-serif; }
                    .labels { display:flex; flex-wrap:wrap; justify-content:flex-start; }
                    @media print { body { margin:0; } }
                </style>
            </head><body>
                <div class="labels">${labelsHTML}</div>
                <script>window.onload=()=>{window.print();setTimeout(()=>document.body.parentElement?.remove?.(),1500);}<\/script>
            </body></html>`);
            doc.close();
            closeQRBulk();
            showToast(`Imprimiendo ${items.length} etiqueta${items.length>1?'s':''}…`, 'info');
        }

