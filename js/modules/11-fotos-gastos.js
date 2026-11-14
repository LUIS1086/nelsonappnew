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
        let _lastRepaintAt = 0;
        function _forceRepaintAfterWAReturn() {
            // Los eventos visibilitychange/pageshow pueden llegar juntos: un repintado basta.
            if (Date.now() - _lastRepaintAt < 1000) return;
            _lastRepaintAt = Date.now();
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
            if (!o) return;
            const fotos = (tipo === 'entrega' ? o.fotosEntrega : o.fotos) || [];
            // Entrega sin fotos se maneja desde su propio modal; recepción sin fotos abre el visor para poder tomarlas ahora
            if (!fotos.length && tipo === 'entrega') return showAlert('Esta orden no tiene fotos de entrega registradas.', "info");

            _fotoModalOrderId = id;
            _fotoModalTipo = tipo;

            const color = tipo === 'entrega' ? 'text-emerald-400' : 'text-orange-500';
            const icon  = tipo === 'entrega' ? '📷' : '📸';
            const label = tipo === 'entrega' ? 'ENTREGA' : 'RECEPCIÓN';
            document.getElementById('modal-fotos-title').className = `font-black mb-3 text-center text-xl ${color}`;
            document.getElementById('modal-fotos-title').innerText = `${icon} ${label} · ${o.equ || ''} (${fotos.length}${tipo === 'entrega' ? '' : '/3'})`;

            // Botón retomar: color según tipo
            const btnRetomar = document.getElementById('btn-retomar-fotos');
            if (tipo === 'entrega') {
                btnRetomar.className = 'flex-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition';
                btnRetomar.innerHTML = '📷 RETOMAR FOTOS';
            } else {
                btnRetomar.className = 'flex-1 bg-orange-600/20 border border-orange-500/40 text-orange-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition';
                btnRetomar.innerHTML = '📸 RETOMAR FOTOS';
            }

            // Botón principal según cuántas fotos hay: tomar / agregar / máximo
            const btnBorrar = document.getElementById('btn-borrar-fotos');
            if (tipo !== 'entrega') {
                btnRetomar.disabled = false; btnRetomar.style.opacity = ''; 
                if (fotos.length === 0) btnRetomar.innerHTML = '📸 TOMAR FOTO AHORA';
                else if (fotos.length < 3) btnRetomar.innerHTML = `📸 AGREGAR FOTO (${fotos.length}/3)`;
                else { btnRetomar.innerHTML = '📸 MÁXIMO 3 FOTOS'; btnRetomar.disabled = true; btnRetomar.style.opacity = '.5'; }
            }
            if (btnBorrar) btnBorrar.style.display = fotos.length ? '' : 'none';

            const container = document.getElementById('modal-fotos-container');
            container.innerHTML = '';
            if (!fotos.length) {
                container.innerHTML = '<div style="text-align:center;padding:28px 16px;border:1px dashed rgba(251,146,60,.4);border-radius:18px;color:#fdba74;font-weight:700;font-size:13px;line-height:1.5;">📷 Esta orden aún no tiene fotos de recepción.<br><span style="color:#94a3b8;font-weight:600;font-size:11px;">Toma hasta 3 fotos del equipo tal como llegó.</span></div>';
            }

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

        window._fotosCambiaron = false;   // true si se agregaron fotos a una orden ya registrada
        function closePhotoModal() {
            document.getElementById('modal-fotos').classList.add('hidden');
            document.getElementById('modal-fotos-container').innerHTML = '';
            _fotoModalOrderId = null;
            if (window._fotosCambiaron) { window._fotosCambiaron = false; if (typeof renderOrders === 'function') renderOrders(); }
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
                    releaseAppCameraStreams(); stream = null;
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
            if(!movs.length) { container.innerHTML = '<div class="text-center py-4 text-slate-500 text-xs">Sin movimientos en la caja actual</div>'; try { renderCajaResumen(); } catch (e) { /* no crítico */ } return; }
            const _mi = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
            const _rec = _mi('<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 2 1.5V2l-2 1.5L17 2l-3 2-3-2-3 2-3-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>');
            const _del = _mi('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>');
            const _hr = ms => { try { return new Date(ms).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }).replace(/\s+/g, ' '); } catch (e) { return ''; } };
            container.innerHTML = movs.map(m => m.type==='sale'
                ? `<div class="mv-row"><div class="mv-main"><p class="mv-t">${escapeHtml(m.item)}</p><p class="mv-s">${m.qty} ${m.qty==1?'unidad':'unidades'} · ${_hr(m.fecha)}</p></div><span class="mv-amt mv-in">+${cur}${m.val.toLocaleString()}</span><button type="button" class="mv-btn" onclick="openSaleTicket(${m.id})" title="Ver comprobante" aria-label="Ver comprobante">${_rec}</button><button type="button" class="mv-btn mv-del" onclick="annulSale(${m.id})" title="Anular venta" aria-label="Anular venta">${_del}</button></div>`
                : `<div class="mv-row"><div class="mv-main"><p class="mv-t">${escapeHtml(m.det)}</p><p class="mv-s">Gasto · ${_hr(m.fecha)}</p></div><span class="mv-amt mv-out">-${cur}${m.val.toLocaleString()}</span><button type="button" class="mv-btn mv-del" onclick="annulGasto(${m.id})" title="Eliminar gasto" aria-label="Eliminar gasto">${_del}</button></div>`).join('');
            try { renderCajaResumen(); } catch (e) { /* no crítico */ }
        }
        async function renderCajaResumen() {
            const neto = document.getElementById('cj-neto'); if (!neto) return;
            const cur = getCurrency();
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const [orders, sales, gastos] = [await getOrdersLite(), await getAll('sales'), await getAll('gastos')];
            const ingOrd = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) > lastCierre).reduce((a, b) => a + (b.val || 0), 0);
            const ingVen = sales.filter(v => v.fecha > lastCierre && v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega').reduce((a, b) => a + (b.val || 0), 0);
            const gas = gastos.filter(g => g.fecha > lastCierre).reduce((a, b) => a + (b.val || 0), 0);
            const ing = ingOrd + ingVen, tot = ing - gas;
            neto.textContent = (tot < 0 ? '-' : '') + cur + Math.abs(tot).toLocaleString();
            neto.classList.toggle('cj-neg', tot < 0);
            const ei = document.getElementById('cj-ing'), eg = document.getElementById('cj-gas');
            if (ei) ei.textContent = cur + ing.toLocaleString();
            if (eg) eg.textContent = (gas ? '-' : '') + cur + gas.toLocaleString();
        }
        async function annulGasto(id) { showConfirm("¿Eliminar este gasto?", async () => { await del('gastos', id); await updateTotal(); }); }

        // ==================== INVENTARIO MEJORADO ====================
        let activeStockCategory = '';

