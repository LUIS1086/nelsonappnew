/* Nelson App Pro · js/modules/11-fotos-gastos.js
   Fix pantalla negra, fotos de ordenes y gastos
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ===== FIX PANTALLA NEGRA AL VOLVER DE WHATSAPP =====
        // ════════════════════════════════════════════════════════════════════════
        // FIX PANTALLA NEGRA AL VOLVER DE WHATSAPP (WebView Android)
        // El WebView de Android a veces se queda con la pantalla "congelada" cuando
        // la app vuelve a primer plano después de saltar a otra app (WhatsApp).
        // Aplicamos varias técnicas de repaint para forzar al WebView a re-pintar.
        // ════════════════════════════════════════════════════════════════════════
        function _forceRepaintAfterWAReturn() {
            try {
                // Técnica 1: scroll micro para forzar repaint
                const sx = window.scrollX, sy = window.scrollY;
                window.scrollTo(sx, sy + 1);
                requestAnimationFrame(() => window.scrollTo(sx, sy));

                // Técnica 2: forzar reflow del root con transform
                const root = document.documentElement;
                root.style.transform = 'translateZ(0)';
                requestAnimationFrame(() => {
                    root.style.transform = '';
                });

                // Técnica 3: forzar repaint del body con visibility
                // (más confiable que display:none en algunos WebView)
                const body = document.body;
                body.style.visibility = 'hidden';
                // Trigger reflow leyendo offsetHeight
                // eslint-disable-next-line no-unused-expressions
                void body.offsetHeight;
                requestAnimationFrame(() => {
                    body.style.visibility = '';
                    // Técnica 4: re-renderizar la vista activa por si quedó incompleta
                    setTimeout(() => {
                        try {
                            const activeView = document.querySelector('.app-view:not(.hidden)');
                            if (activeView) {
                                // Forzar opacity flip — ayuda en WebView problemáticos
                                activeView.style.opacity = '0.999';
                                requestAnimationFrame(() => {
                                    activeView.style.opacity = '';
                                });
                            }
                        } catch(_) {}
                    }, 30);
                });
            } catch(e) { console.warn('[WA repaint]', e); }
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && sessionStorage.getItem('_waJump')) {
                sessionStorage.removeItem('_waJump');
                _forceRepaintAfterWAReturn();
            }
        });
        // También aplicar al volver con el botón Atrás / pageshow
        window.addEventListener('pageshow', (e) => {
            if (e.persisted || sessionStorage.getItem('_waJump')) {
                sessionStorage.removeItem('_waJump');
                _forceRepaintAfterWAReturn();
            }
        });
        // Backup: cualquier vuelta de "background" que dure más de 1 segundo merece repaint
        let _wasHidden = false;
        let _hiddenSince = 0;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                _wasHidden = true;
                _hiddenSince = Date.now();
            } else if (document.visibilityState === 'visible' && _wasHidden) {
                _wasHidden = false;
                // Si estuvo más de 1s en background, forzar repaint también
                // (cubre casos donde _waJump no se setea)
                if (Date.now() - _hiddenSince > 1000) {
                    _forceRepaintAfterWAReturn();
                }
            }
        });
        let _fotoModalOrderId = null;
        let _fotoModalTipo = 'recepcion';

        async function openPhotoModal(id, tipo = 'recepcion') {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            const fotos = tipo === 'entrega' ? o?.fotosEntrega : o?.fotos;
            if (!fotos?.length) return showAlert(`Esta orden no tiene fotos de ${tipo === 'entrega' ? 'entrega' : 'recepción'} registradas.`, "info");

            _fotoModalOrderId = id;
            _fotoModalTipo = tipo;

            const color = tipo === 'entrega' ? 'text-emerald-400' : 'text-orange-500';
            const icon  = tipo === 'entrega' ? '📷' : '📸';
            const label = tipo === 'entrega' ? 'ENTREGA' : 'RECEPCIÓN';
            document.getElementById('modal-fotos-title').className = `font-black mb-3 text-center text-xl ${color}`;
            document.getElementById('modal-fotos-title').innerText = `${icon} ${label} · ${escapeHtml(o.equ)} (${fotos.length})`;

            // Botón retomar: color según tipo
            const btnRetomar = document.getElementById('btn-retomar-fotos');
            if (tipo === 'entrega') {
                btnRetomar.className = 'flex-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition';
                btnRetomar.innerHTML = '📷 RETOMAR FOTOS';
            } else {
                btnRetomar.className = 'flex-1 bg-orange-600/20 border border-orange-500/40 text-orange-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition';
                btnRetomar.innerHTML = '📸 RETOMAR FOTOS';
            }

            const container = document.getElementById('modal-fotos-container');
            container.innerHTML = '';

            fotos.forEach((blob, idx) => {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:relative;';
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-full rounded-2xl shadow-xl';
                img.style.border = tipo === 'entrega' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.2)';
                // Botón borrar foto individual
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '🗑️';
                delBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:rgba(220,38,38,0.85);backdrop-filter:blur(4px);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);';
                delBtn.title = 'Borrar esta foto';
                delBtn.onclick = () => borrarFotoIndividual(idx);
                wrapper.appendChild(img);
                wrapper.appendChild(delBtn);
                container.appendChild(wrapper);
            });

            document.getElementById('modal-fotos').classList.remove('hidden');
        }

        function closePhotoModal() {
            document.getElementById('modal-fotos').classList.add('hidden');
            document.getElementById('modal-fotos-container').innerHTML = '';
            _fotoModalOrderId = null;
        }

        async function borrarFotoIndividual(idx) {
            if (!_fotoModalOrderId) return;
            showConfirm('¿Borrar esta foto?', async () => {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _fotoModalOrderId);
                if (!o) return;
                if (_fotoModalTipo === 'entrega') {
                    o.fotosEntrega = (o.fotosEntrega || []).filter((_, i) => i !== idx);
                } else {
                    o.fotos = (o.fotos || []).filter((_, i) => i !== idx);
                }
                await put('orders', o);
                showToast('Foto borrada', 'success');
                const fotos = _fotoModalTipo === 'entrega' ? o.fotosEntrega : o.fotos;
                if (!fotos.length) {
                    closePhotoModal();
                    await renderOrders();
                } else {
                    await openPhotoModal(_fotoModalOrderId, _fotoModalTipo);
                }
            });
        }

        async function borrarTodasFotos() {
            if (!_fotoModalOrderId) return;
            const label = _fotoModalTipo === 'entrega' ? 'entrega' : 'recepción';
            showConfirm(`¿Borrar TODAS las fotos de ${label}?`, async () => {
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _fotoModalOrderId);
                if (!o) return;
                if (_fotoModalTipo === 'entrega') o.fotosEntrega = [];
                else o.fotos = [];
                await put('orders', o);
                closePhotoModal();
                await renderOrders();
                showToast(`Fotos de ${label} borradas`, 'success');
            });
        }

        let _retomarOrdenId = null;

        async function retomarFotos() {
            if (!_fotoModalOrderId) return;
            const id = _fotoModalOrderId;
            const tipo = _fotoModalTipo;
            closePhotoModal();
            if (tipo === 'entrega') {
                await openDeliveryPhotosModal(id);
            } else {
                // Abrir cámara y guardar foto directo en la orden existente (sin ir a pestaña taller)
                _retomarOrdenId = id;
                cameraMode = 'retomar-recepcion';
                if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
                try {
                    stream = await requestAppCameraStream();
                    const video = document.getElementById('video');
                    video.srcObject = stream;
                    await video.play();
                    document.getElementById('camera-modal').classList.remove('hidden');
                    showToast('Captura la nueva foto de recepción', 'info');
                } catch(e) {
                    showAlert(getAppCameraErrorMessage(e), 'error');
                }
            }
        }

        async function saveGasto() {
            const det = document.getElementById('g-det').value.trim().toUpperCase();
            const val = parseInt(document.getElementById('g-val').value);
            if(!det || isNaN(val) || val <= 0) return showAlert("Ingresa un motivo y un valor válido.", "warning");
            await put('gastos', { id: _uid(), det, val, fecha: Date.now() });
            document.getElementById('g-det').value = ''; document.getElementById('g-val').value = '';
            await updateTotal();
            await renderMovimientos();
            showToast(`Gasto ${getCurrency()}${val.toLocaleString()} registrado`, 'success');
        }

        async function renderMovimientos() {
            const cur = getCurrency();
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const sales = await getAll('sales');
            const gastos = await getAll('gastos');
            const movs = [...sales.filter(s=>s.fecha>lastCierre && s.tipo!=='adelanto' && s.tipo!=='cobro_entrega').map(s=>({...s,type:'sale'})), ...gastos.filter(g=>g.fecha>lastCierre).map(g=>({...g,type:'gasto'}))].sort((a,b)=>b.fecha-a.fecha);
            const container = document.getElementById('movimientos-history');
            if(!movs.length) { container.innerHTML = '<div class="text-center py-4 text-slate-500 text-xs">Sin movimientos en la caja actual</div>'; return; }
            container.innerHTML = movs.map(m => m.type==='sale' ? `<div class="flex justify-between bg-emerald-500/10 p-2 rounded-xl"><div><p class="text-xs font-bold">+ ${escapeHtml(m.item)}</p><p class="text-[9px]">${m.qty} unid</p></div><div class="flex gap-2"><p class="text-xs font-black text-emerald-400">+${cur}${m.val.toLocaleString()}</p><button onclick="annulSale(${m.id})" class="text-rose-400 text-[10px] bg-rose-500/20 px-2 py-1 rounded-lg">✕</button></div></div>` : `<div class="flex justify-between bg-rose-500/10 p-2 rounded-xl"><div><p class="text-xs font-bold">- ${escapeHtml(m.det)}</p><p class="text-[9px]">Gasto</p></div><div class="flex gap-2"><p class="text-xs font-black text-rose-400">-${cur}${m.val.toLocaleString()}</p><button onclick="annulGasto(${m.id})" class="text-rose-400 text-[10px] bg-rose-500/20 px-2 py-1 rounded-lg">✕</button></div></div>`).join('');
        }
        async function annulGasto(id) { showConfirm("¿Eliminar este gasto?", async () => { await del('gastos', id); await updateTotal(); }); }

        // ==================== INVENTARIO MEJORADO ====================
        let activeStockCategory = '';

