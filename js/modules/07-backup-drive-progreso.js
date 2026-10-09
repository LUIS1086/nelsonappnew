/* Nelson App Pro · js/modules/07-backup-drive-progreso.js
   Respaldo automatico y progreso de Drive
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== RESPALDO AUTOMÁTICO ====================
        function startAutoBackup() {
            if (autoBackupIntervalId) clearInterval(autoBackupIntervalId);
            const intervalHours = parseInt(localStorage.getItem('backupIntervalHours')) || 0;
            if (intervalHours > 0 && driveToken) {
                autoBackupIntervalId = setInterval(() => {
                    // Solo ejecutar si hay token de Drive activo
                    if (driveToken) {
                        driveBackupNow(true); // true = silencioso (sin toast de éxito)
                    }
                }, intervalHours * 3600000);
            }
        }

        // Modificar saveBackupInterval para reiniciar el timer
        function saveBackupInterval() {
            const hours = parseInt(document.getElementById('config-backup-interval').value);
            localStorage.setItem('backupIntervalHours', hours);
            startAutoBackup();
            if (hours === 0) {
                showToast('Respaldo automático desactivado', 'info');
            } else if (hours === 168) {
                showToast('Respaldo automático: semanal', 'success');
            } else {
                showToast(`Respaldo automático: cada ${hours} horas`, 'success');
            }
            // Refresh config UI if open
            if (typeof updateConfigBadges === 'function') updateConfigBadges();
            if (typeof updateConfigHealth === 'function') updateConfigHealth();
        }

        // ═══ Overlay de progreso de subida/descarga a Drive ═══
        function showDriveProgress(fileName, mode = 'upload') {
            let overlay = document.getElementById('drive-upload-overlay');
            if (overlay) overlay.remove();
            overlay = document.createElement('div');
            overlay.id = 'drive-upload-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;animation:dup-fadein 0.25s ease;';

            // Paleta distinta según sea subida o descarga
            const isDownload = mode === 'download';
            const accent     = isDownload ? '#10b981' : '#3b82f6';    // verde para bajada, azul para subida
            const accentDim  = isDownload ? '#059669' : '#1d4ed8';
            const accentLite = isDownload ? '#34d399' : '#60a5fa';
            const label      = isDownload ? 'Google Drive · Restaurar' : 'Google Drive';
            // SVG: flecha arriba para upload, flecha abajo para download
            const iconSvg = isDownload
                ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

            overlay.innerHTML = `
                <style>
                    @keyframes dup-fadein { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes dup-slidein { from { transform: translateY(20px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                    @keyframes dup-spin { to { transform: rotate(360deg); } }
                    @keyframes dup-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                    #dup-panel .dup-bar-fill { transition: width 0.18s cubic-bezier(0.4, 0, 0.2, 1); }
                </style>
                <div id="dup-panel" style="width:100%;max-width:360px;background:linear-gradient(180deg,#14162a 0%,#0d0f1a 100%);border-radius:24px;border:1px solid ${accent}40;padding:26px 22px;box-shadow:0 20px 60px rgba(0,0,0,0.6);animation:dup-slidein 0.35s cubic-bezier(0.16,1,0.3,1);">
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
                        <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,${accentDim},${accent});display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 18px ${accent}66;position:relative;">
                            ${iconSvg}
                            <div id="dup-spinner" style="position:absolute;inset:-3px;border-radius:19px;border:2px solid transparent;border-top-color:${accentLite};animation:dup-spin 1s linear infinite;"></div>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:10px;font-weight:900;letter-spacing:2.5px;color:${accentLite};text-transform:uppercase;margin-bottom:3px;">${label}</div>
                            <div id="dup-status" style="font-size:15px;font-weight:800;color:#fff;line-height:1.3;">${isDownload ? 'Preparando...' : 'Preparando respaldo...'}</div>
                        </div>
                    </div>
                    <div style="background:#0a0c17;border-radius:14px;padding:14px 16px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
                            <span id="dup-percent" style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;font-variant-numeric:tabular-nums;">0%</span>
                            <span id="dup-size" style="font-size:11px;font-weight:700;color:#94a3b8;font-variant-numeric:tabular-nums;">— / —</span>
                        </div>
                        <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;position:relative;">
                            <div class="dup-bar-fill" id="dup-bar" style="height:100%;width:0%;background:linear-gradient(90deg,${accent} 0%,${accentLite} 50%,${accent} 100%);background-size:200% 100%;animation:dup-shimmer 2s linear infinite;border-radius:999px;box-shadow:0 0 12px ${accent}99;"></div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;margin-bottom:14px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <span id="dup-filename" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;">${fileName || ''}</span>
                    </div>
                    <!-- Botón de cancelar -->
                    <button id="dup-cancel-btn" onclick="cancelDriveOperation()" style="
                        width:100%;padding:12px;border-radius:12px;
                        background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.1);
                        color:#94a3b8;font-size:11px;font-weight:900;letter-spacing:1.5px;
                        text-transform:uppercase;cursor:pointer;
                        transition:all 0.2s ease;
                    " ontouchstart="this.style.transform='scale(0.97)'" ontouchend="this.style.transform='scale(1)'">
                        ✕ CANCELAR
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
            // Escape para cancelar
            const escHandler = (e) => {
                if (e.key === 'Escape' && document.getElementById('drive-upload-overlay')) {
                    cancelDriveOperation();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            return overlay;
        }

        function updateDriveProgress(percent, loaded, total, status) {
            const overlay = document.getElementById('drive-upload-overlay');
            if (!overlay) return;
            const pct = Math.max(0, Math.min(100, Math.round(percent)));
            const bar = overlay.querySelector('#dup-bar');
            const pctEl = overlay.querySelector('#dup-percent');
            const sizeEl = overlay.querySelector('#dup-size');
            const statusEl = overlay.querySelector('#dup-status');
            const cancelBtn = overlay.querySelector('#dup-cancel-btn');
            if (bar) bar.style.width = pct + '%';
            if (pctEl) pctEl.textContent = pct + '%';
            if (sizeEl && loaded != null && total != null) {
                const fmt = (n) => {
                    if (n < 1024) return n + ' B';
                    if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
                    return (n/1024/1024).toFixed(2) + ' MB';
                };
                sizeEl.textContent = `${fmt(loaded)} / ${fmt(total)}`;
            }
            if (status && statusEl) statusEl.textContent = status;
            // Al 100% deshabilitar el cancelar para evitar confusión
            if (cancelBtn && pct >= 100) {
                cancelBtn.style.opacity = '0.4';
                cancelBtn.style.pointerEvents = 'none';
                cancelBtn.innerHTML = '✓ LISTO';
            }
        }

        function hideDriveProgress(delay = 0) {
            const overlay = document.getElementById('drive-upload-overlay');
            if (!overlay) return;
            setTimeout(() => {
                overlay.style.transition = 'opacity 0.25s ease';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 260);
            }, delay);
        }

        // XHR activo actual (para poder cancelar desde el overlay)
        let _activeDriveXhr = null;
        let _driveProgressTimeout = null; // detecta si se queda sin avance

        function cancelDriveOperation() {
            try {
                if (_activeDriveXhr) {
                    _activeDriveXhr.abort();
                    _activeDriveXhr = null;
                }
            } catch(_) {}
            if (_driveProgressTimeout) { clearTimeout(_driveProgressTimeout); _driveProgressTimeout = null; }
            hideDriveProgress();
            showToast('Operación cancelada', 'warning');
        }

        // Sube un FormData a Drive con progreso real usando XHR
        function uploadToDriveWithProgress(url, method, form, token, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                _activeDriveXhr = xhr;
                xhr.open(method, url, true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                let lastProgressAt = Date.now();
                if (xhr.upload && typeof onProgress === 'function') {
                    xhr.upload.onprogress = (e) => {
                        lastProgressAt = Date.now();
                        if (e.lengthComputable) {
                            onProgress((e.loaded / e.total) * 100, e.loaded, e.total);
                        }
                    };
                }
                // Watchdog: si pasan más de 45s sin progreso, mostrar botón "Cancelar" prominente
                const watchdog = setInterval(() => {
                    if (Date.now() - lastProgressAt > 45000) {
                        const cancelBtn = document.getElementById('dup-cancel-btn');
                        if (cancelBtn) {
                            cancelBtn.style.background = 'rgba(244,63,94,0.2)';
                            cancelBtn.style.borderColor = 'rgba(244,63,94,0.5)';
                            cancelBtn.style.color = '#fb7185';
                            cancelBtn.innerHTML = '⚠️ PARECE COLGADO · CANCELAR';
                        }
                        const statusEl = document.getElementById('dup-status');
                        if (statusEl) statusEl.textContent = 'Sin respuesta de Drive...';
                    }
                }, 5000);
                xhr.onload = () => {
                    clearInterval(watchdog);
                    _activeDriveXhr = null;
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch(_) { resolve({}); }
                    } else {
                        const err = new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0,200)}`);
                        err.status = xhr.status;
                        reject(err);
                    }
                };
                xhr.onerror = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Error de red al subir a Drive')); };
                xhr.onabort = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Subida cancelada')); };
                xhr.send(form);
            });
        }

        // Modificar driveBackupNow para aceptar parámetro silent
        async function driveBackupNow(silent = false) {
            if (!driveToken) { if(!silent) showAlert('Primero conecta tu cuenta de Google.', 'warning'); return; }

            // Chequeo offline: si no hay red, no intentar backup
            if (!navigator.onLine) {
                if (!silent) showAlert('Sin conexión. El backup se realizará cuando vuelva internet.', 'warning');
                return;
            }

            const fileName = `nelson_backup_${new Date().toISOString().slice(0,10)}.json`;
            if (!silent) showDriveProgress(fileName);

            try {
                if (!silent) updateDriveProgress(0, 0, 0, 'Leyendo base de datos...');
                const orders   = await getAll('orders');
                const stock    = await getAll('stock');
                const sales    = await getAll('sales');
                const gastos   = await getAll('gastos');
                const clientes = await getAll('clientes');
                const payments = await getAll('payments');
                const calificaciones = await getAll('calificaciones');

                if (!silent) updateDriveProgress(0, 0, 0, 'Empaquetando fotos...');
                const exportOrders = [];
                for (let o of orders) {
                    exportOrders.push({ ...o, fotos: await blobsToB64(o.fotos || []), fotosEntrega: await blobsToB64(o.fotosEntrega || []) });
                }

                const jsonStr  = JSON.stringify({ orders: exportOrders, stock, sales, gastos, clientes, payments, calificaciones, date: new Date().toISOString() });
                const folderId = await ensureDriveFolder();

                const blob = new Blob([jsonStr], { type: 'application/json' });
                let url    = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
                let method = 'POST';
                let form   = new FormData();

                if (!silent) updateDriveProgress(0, 0, blob.size, 'Conectando con Drive...');

                // Verificar si ya existe un archivo con ese nombre para sobreescribirlo
                try {
                    const searchExisting = await fetch(
                        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false&fields=files(id)`,
                        { headers: { Authorization: 'Bearer ' + driveToken } }
                    ).then(r => r.json());

                    if (searchExisting.files && searchExisting.files.length > 0) {
                        const existId = searchExisting.files[0].id;
                        url    = `https://www.googleapis.com/upload/drive/v3/files/${existId}?uploadType=multipart`;
                        method = 'PATCH';
                        form   = new FormData();
                        form.append('metadata', new Blob([JSON.stringify({ name: fileName })], { type: 'application/json' }));
                        form.append('file', blob);
                    } else {
                        const metadata = { name: fileName, parents: folderId ? [folderId] : [] };
                        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                        form.append('file', blob);
                    }
                } catch(_) {
                    const metadata = { name: fileName, parents: folderId ? [folderId] : [] };
                    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                    form.append('file', blob);
                }

                if (!silent) updateDriveProgress(0, 0, blob.size, 'Subiendo respaldo...');

                let result;
                if (!silent) {
                    // Subida con progreso visible
                    result = await uploadToDriveWithProgress(url, method, form, driveToken, (pct, loaded, total) => {
                        updateDriveProgress(pct, loaded, total, pct >= 99 ? 'Finalizando...' : 'Subiendo respaldo...');
                    });
                } else {
                    // Subida silenciosa (backup automático) - sin UI, con timeout de 60s
                    const ctrl = new AbortController();
                    const timeoutId = setTimeout(() => ctrl.abort(), 60000);
                    try {
                        const resp = await fetch(url, {
                            method,
                            headers: { Authorization: 'Bearer ' + driveToken },
                            body: form,
                            signal: ctrl.signal
                        });
                        clearTimeout(timeoutId);
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        result = await resp.json();
                    } catch(err) {
                        clearTimeout(timeoutId);
                        if (err.name === 'AbortError') throw new Error('Backup automático: timeout (60s)');
                        throw err;
                    }
                }

                if (result.id) {
                    localStorage.setItem('driveLastBackup', new Date().toLocaleString('es-ES'));
                    if (!silent) {
                        updateDriveProgress(100, blob.size, blob.size, '✓ Respaldo completado');
                        hideDriveProgress(900);
                        setTimeout(() => {
                            showAlert(`✅ Respaldo guardado en Google Drive\n📁 Carpeta: ${DRIVE_FOLDER}\n📄 Archivo: ${fileName}`, 'success');
                        }, 950);
                    }
                } else {
                    throw new Error(JSON.stringify(result));
                }
            } catch(e) {
                if (!silent) hideDriveProgress();
                const isAuthErr = (e.status === 401) || (e.message && e.message.includes('401'));
                if (isAuthErr) {
                    driveToken = null; updateDriveUI(false);
                    if (!silent) showAlert('Sesión de Google expirada. Vuelve a conectar.', 'warning');
                } else {
                    if (!silent) showAlert('Error al subir a Drive: ' + e.message, 'error');
                }
            }
        }

