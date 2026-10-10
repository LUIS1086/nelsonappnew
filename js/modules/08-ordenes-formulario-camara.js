/* Nelson App Pro · js/modules/08-ordenes-formulario-camara.js
   Formulario de orden, camara y verificacion de cliente
   (extraido sin cambios de index.html; el orden de carga importa) */
        // Modificar updateTotal, etc. (resto del código igual excepto funciones de mejora 6 y 7)
        async function updateTotal() {
            const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
            const orders = await getAll('orders');
            const sales = await getAll('sales');
            const gastos = await getAll('gastos');
            const totalOrders = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) > lastCierre).reduce((a,b) => a + (b.val||0), 0);
            const totalSales = sales.filter(v => v.fecha > lastCierre && v.tipo !== 'adelanto' && v.tipo !== 'cobro_entrega').reduce((a,b) => a + (b.val||0), 0);
            const totalGastos = gastos.filter(g => g.fecha > lastCierre).reduce((a,b) => a + (b.val||0), 0);
            const total = totalOrders + totalSales - totalGastos;
            document.getElementById('total-cash').innerText = '$' + total.toLocaleString();
            if (!document.getElementById('view-ventas').classList.contains('hidden')) renderMovimientos();
            updateMetaBar();
        }

        function toggleStaMenu(id, e) {
            e.stopPropagation();
            // Cerrar otros menús abiertos
            document.querySelectorAll('[id^="sta-menu-"]').forEach(m => {
                if (m.id !== `sta-menu-${id}`) m.style.display = 'none';
            });
            const menu = document.getElementById(`sta-menu-${id}`);
            if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        function closeStaMenu(id) {
            const menu = document.getElementById(`sta-menu-${id}`);
            if (menu) menu.style.display = 'none';
        }
        // Cerrar menú al tocar fuera
        document.addEventListener('click', () => {
            document.querySelectorAll('[id^="sta-menu-"]').forEach(m => m.style.display = 'none');
        });

        function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
        // Lectura defensiva de businessConfig: nunca crashea aunque el JSON esté corrupto
        function _safeBizConfig() {
            try {
                const raw = localStorage.getItem('businessConfig');
                if (!raw) return {};
                const obj = JSON.parse(raw);
                return (obj && typeof obj === 'object') ? obj : {};
            } catch(e) {
                console.warn('[bizConfig] JSON corrupto, usando defaults:', e);
                return {};
            }
        }
        // Genera IDs únicos incluso cuando hay clicks en el mismo milisegundo
        function _uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }

        let cameraMode = 'recepcion';
        async function openCamera(mode = 'recepcion') {
            cameraMode = mode;
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            try {
                stream = await requestAppCameraStream();
                const video = document.getElementById('video');
                video.srcObject = stream;
                await video.play();
                document.getElementById('camera-modal').classList.remove('hidden');
            } catch(e) { showAlert(getAppCameraErrorMessage(e), "error"); }
        }
        function closeCamera() {
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            document.getElementById('camera-modal').classList.add('hidden');
            const video = document.getElementById('video');
            video.srcObject = null;
        }
        function closeCameraAndReturn() {
            const modoActual = cameraMode;
            closeCamera();
            if (modoActual === 'entrega') {
                document.getElementById('modal-delivery-photos').classList.remove('hidden');
            } else if (modoActual === 'retomar-recepcion' && _retomarOrdenId) {
                // Volver al visor de fotos de la orden
                openPhotoModal(_retomarOrdenId, 'recepcion');
            }
        }
        async function takePhoto() {
            const video = document.getElementById('video');
            if (!video.videoWidth) return;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.7));

            if (cameraMode === 'retomar-recepcion') {
                // Guardar foto directo en la orden existente sin tocar el formulario
                if (!_retomarOrdenId) { closeCamera(); return; }
                const orders = await getAll('orders');
                const o = orders.find(x => x.id === _retomarOrdenId);
                if (!o) { closeCamera(); return; }
                if ((o.fotos || []).length >= 3) {
                    showAlert('Máximo 3 fotos de recepción.', 'warning'); return;
                }
                o.fotos = [...(o.fotos || []), blob];
                await put('orders', o);
                showToast(`✅ Foto agregada (${o.fotos.length}/3)`, 'success');
                if (o.fotos.length >= 3) {
                    closeCamera();
                    await openPhotoModal(_retomarOrdenId, 'recepcion');
                }
            } else if (cameraMode === 'entrega') {
                if (currentDeliveryPhotos.length >= 3) { showAlert("Máximo 3 fotos de entrega.", "warning"); return; }
                currentDeliveryPhotos.push(blob);
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-14 h-14 object-cover rounded-xl border-2 border-emerald-500 shadow-md';
                document.getElementById('delivery-photos-preview').appendChild(img);
                if (currentDeliveryPhotos.length === 3) {
                    closeCamera();
                    document.getElementById('modal-delivery-photos').classList.remove('hidden');
                }
            } else {
                if (currentPhotos.length >= 3) { showAlert("Máximo 3 fotos por orden.", "warning"); return; }
                currentPhotos.push(blob);
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-14 h-14 object-cover rounded-xl border-2 border-orange-500 shadow-md';
                document.getElementById('previews').appendChild(img);
                if (currentPhotos.length === 3) closeCamera();
            }
        }

        // Wrapper con debounce para evitar correr checkClient en cada tecla
        let _checkClientTimer = null;
        function _debouncedCheckClient() {
            if (_checkClientTimer) clearTimeout(_checkClientTimer);
            _checkClientTimer = setTimeout(() => { checkClient(); }, 280);
        }

        async function checkClient() {
            const nom = document.getElementById('c-nom').value.trim().toUpperCase();
            const alertBox = document.getElementById('client-alert');
            const card = document.getElementById('client-info-card');
            if (!nom || nom.length < 3) {
                alertBox.innerText = '';
                if (card) card.classList.add('hidden');
                return;
            }
            try {
                const orders = await getAll('orders');
                const clientOrders = orders.filter(o => o.nom === nom);
                const count = clientOrders.length;

                if (count === 0) {
                    alertBox.innerText = '';
                    if (card) card.classList.add('hidden');
                    return;
                }

                // Calcular saldo pendiente (órdenes no canceladas con saldo > 0)
                const saldoPendiente = clientOrders.reduce((sum, o) => {
                    if (o.sta === 'cancelado' || o.sta === 'no-reparable') return sum;
                    const val = Number(o.val) || 0;
                    const ade = Number(o.adelanto) || 0;
                    const saldo = Math.max(0, val - ade);
                    // Solo contar si no está entregado o si está entregado pero con saldo pendiente
                    return sum + saldo;
                }, 0);

                // Última visita
                const lastOrder = clientOrders.slice().sort((a, b) => (b.fecha || 0) - (a.fecha || 0))[0];
                const diasUltima = lastOrder && lastOrder.fecha ? Math.floor((Date.now() - lastOrder.fecha) / 86400000) : null;

                // Detectar equipos AÚN EN GARANTÍA (cliente podría estar reclamando)
                const now = Date.now();
                const enGarantia = clientOrders.filter(o => {
                    if (o.sta !== 'entregado') return false;
                    if (!o.garantia || o.garantia <= 0) return false;
                    if (!o.fechaEntrega) return false;
                    const expMs = o.fechaEntrega + o.garantia * 86400000;
                    return expMs > now;
                });

                // Limpiar el alert viejo (la tarjeta es mejor)
                alertBox.innerText = '';

                // Poblar la tarjeta
                if (card) {
                    // Avatar con iniciales y color determinístico
                    const nameInitials = nom.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'C';
                    const avatarHues = [12, 35, 145, 200, 260, 320];
                    let hashVal = 0;
                    for (let i = 0; i < nom.length; i++) hashVal = (hashVal + nom.charCodeAt(i)) % avatarHues.length;
                    const hue = avatarHues[hashVal];
                    const avatarEl = document.getElementById('client-info-avatar');
                    if (avatarEl) {
                        avatarEl.style.background = `linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${hue},70%,40%))`;
                        avatarEl.textContent = nameInitials;
                    }

                    // Badge según frecuencia
                    const badgeEl = document.getElementById('client-info-badge');
                    if (badgeEl) {
                        if (count >= 5) badgeEl.innerHTML = '🏆 VIP · ' + count + ' órdenes';
                        else if (count >= 3) badgeEl.innerHTML = '⭐ Frecuente · ' + count + ' órdenes';
                        else badgeEl.innerHTML = '🔄 Recurrente · ' + count + (count === 1 ? ' orden' : ' órdenes');
                    }

                    // Badge de deuda (si aplica)
                    const deudaEl = document.getElementById('client-info-deuda');
                    if (deudaEl) {
                        if (enGarantia.length > 0) {
                            // PRIORIDAD: garantía activa gana sobre deuda (más importante avisar al técnico)
                            const equiposGar = enGarantia.map(o => o.equ).slice(0, 2).join(', ');
                            deudaEl.style.background = 'rgba(16,185,129,0.15)';
                            deudaEl.style.borderColor = 'rgba(16,185,129,0.3)';
                            deudaEl.style.color = '#6ee7b7';
                            deudaEl.textContent = `🛡️ ${enGarantia.length} equipo${enGarantia.length !== 1 ? 's' : ''} en garantía`;
                            deudaEl.title = equiposGar;
                            deudaEl.classList.remove('hidden');
                        } else if (saldoPendiente > 0) {
                            const cur = getCurrency();
                            deudaEl.style.background = 'rgba(251,146,60,0.15)';
                            deudaEl.style.borderColor = 'rgba(251,146,60,0.3)';
                            deudaEl.style.color = '#fdba74';
                            deudaEl.textContent = `💰 Debe ${cur}${saldoPendiente.toLocaleString()}`;
                            deudaEl.title = '';
                            deudaEl.classList.remove('hidden');
                        } else {
                            deudaEl.classList.add('hidden');
                        }
                    }

                    // Stats line (equipos distintos, última visita)
                    const statsEl = document.getElementById('client-info-stats');
                    if (statsEl) {
                        const equiposSet = new Set(clientOrders.map(o => (o.equ || '').trim()).filter(Boolean));
                        let ultimaTxt = '';
                        if (diasUltima !== null) {
                            if (diasUltima === 0) ultimaTxt = 'Hoy';
                            else if (diasUltima === 1) ultimaTxt = 'Ayer';
                            else if (diasUltima < 30) ultimaTxt = `Hace ${diasUltima}d`;
                            else if (diasUltima < 365) ultimaTxt = `Hace ${Math.floor(diasUltima/30)} meses`;
                            else ultimaTxt = `Hace ${Math.floor(diasUltima/365)} año${Math.floor(diasUltima/365) > 1 ? 's' : ''}`;
                        }
                        statsEl.innerHTML = `${equiposSet.size} equipo${equiposSet.size !== 1 ? 's' : ''} · Última: ${ultimaTxt} <span style="color:#64748b;font-weight:600;">· Click para ver historial</span>`;
                    }

                    card.classList.remove('hidden');
                }
            } catch (e) {
                console.warn('[checkClient]', e);
                if (card) card.classList.add('hidden');
            }
        }

