/* Nelson App Pro · js/modules/23-google-drive.js
   Google Drive: login, token, respaldo y restauracion
   (extraido sin cambios de index.html; el orden de carga importa) */
        // Crea (o retorna) el cliente OAuth. Reutilizamos el mismo cliente para todas
        // las operaciones (sign in inicial + renovaciones silenciosas).
        function getDriveTokenClient() {
            if (driveTokenClient) return driveTokenClient;
            if (!window.google || !google.accounts) return null;
            driveTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: DRIVE_CLIENT_ID,
                scope: DRIVE_SCOPES,
                callback: () => {} // sobrescrito antes de cada requestAccessToken
            });
            return driveTokenClient;
        }

        // Renueva el token SIN mostrar popup, usando la sesión activa de Google.
        // Funciona si el usuario sigue logueado en Google en este navegador/WebView.
        function driveSilentRefresh() {
            return new Promise((resolve, reject) => {
                if (!navigator.onLine) { reject(new Error('sin conexión')); return; }
                const client = getDriveTokenClient();
                if (!client) { reject(new Error('GIS no cargado aún')); return; }
                // prompt '' = intento silencioso (no pide confirmación al usuario)
                client.callback = (resp) => {
                    if (resp && resp.error) { reject(new Error(resp.error)); return; }
                    if (!resp || !resp.access_token) { reject(new Error('sin token')); return; }
                    driveToken = resp.access_token;
                    sessionStorage.setItem('driveToken', driveToken);
                    const lifeMs = (parseInt(resp.expires_in, 10) || 3600) * 1000;
                    driveTokenExpiresAt = Date.now() + lifeMs;
                    localStorage.setItem('driveTokenExpiresAt', String(driveTokenExpiresAt));
                    scheduleNextDriveRefresh();
                    console.log('[Drive] Token renovado silenciosamente, expira en', Math.round(lifeMs/60000), 'min');
                    resolve(driveToken);
                };
                try {
                    client.requestAccessToken({ prompt: '' });
                } catch(e) { reject(e); }
            });
        }

        // Programa la próxima renovación 5 minutos antes de que expire el token
        function scheduleNextDriveRefresh() {
            if (driveRefreshTimerId) { clearTimeout(driveRefreshTimerId); driveRefreshTimerId = null; }
            if (!driveTokenExpiresAt) return;
            const msLeft = driveTokenExpiresAt - Date.now() - (5 * 60 * 1000);
            // Mínimo 60s, máximo 55min (por si el sistema se despertó del sleep)
            const delay = Math.min(55 * 60 * 1000, Math.max(60 * 1000, msLeft));
            driveRefreshTimerId = setTimeout(() => {
                driveSilentRefresh().catch(e => {
                    console.warn('[Drive] Refresh proactivo falló:', e.message);
                    // Reintentar en 2 minutos si falló
                    driveRefreshTimerId = setTimeout(() => {
                        driveSilentRefresh().catch(() => {});
                    }, 2 * 60 * 1000);
                });
            }, delay);
        }


        function driveSignIn() {
            if (!navigator.onLine) {
                showAlert('Sin conexión. Conecta a internet para iniciar sesión con Google.', 'warning'); return;
            }
            if (!window.google || !google.accounts) {
                showAlert('Google API aún cargando. Intenta en unos segundos.', 'warning'); return;
            }
            const client = getDriveTokenClient();
            if (!client) { showAlert('Google API aún cargando. Intenta en unos segundos.', 'warning'); return; }
            client.callback = async (resp) => {
                if (resp.error) { showAlert('Error al conectar con Google: ' + resp.error, 'error'); return; }
                driveToken = resp.access_token;
                sessionStorage.setItem('driveToken', driveToken);
                // Guardar timestamp de expiración para el sistema de refresh automático
                const lifeMs = (parseInt(resp.expires_in, 10) || 3600) * 1000;
                driveTokenExpiresAt = Date.now() + lifeMs;
                localStorage.setItem('driveTokenExpiresAt', String(driveTokenExpiresAt));
                scheduleNextDriveRefresh();
                try {
                    const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: 'Bearer ' + driveToken }
                    }).then(r => r.json());
                    localStorage.setItem('driveEmail', info.email || '');
                    updateDriveUI(true, info.email);
                } catch(e) { updateDriveUI(true, 'Conectado'); }
                await ensureDriveFolder();
                startAutoBackup(); // reiniciar respaldo automático al conectar
            };
            client.requestAccessToken();
        }

        function driveSignOut() {
            driveToken = null; driveFolderId = null;
            driveTokenExpiresAt = 0;
            if (driveRefreshTimerId) { clearTimeout(driveRefreshTimerId); driveRefreshTimerId = null; }
            sessionStorage.removeItem('driveToken');
            localStorage.removeItem('driveEmail');
            localStorage.removeItem('driveFolderId');
            localStorage.removeItem('driveTokenExpiresAt');
            updateDriveUI(false);
            if (autoBackupIntervalId) clearInterval(autoBackupIntervalId);
            autoBackupIntervalId = null;
            showToast('Sesión de Google cerrada', 'info');
        }

        function updateDriveUI(connected, email = '') {
            const statusText = document.getElementById('drive-status-text');
            const connectBtn = document.getElementById('drive-connect-btn');
            const actions    = document.getElementById('drive-actions');
            if (connected) {
                statusText.innerHTML = `<span class="text-emerald-400 font-bold">✅ ${email || 'Conectado'}</span>`;
                connectBtn.innerText = 'DESCONECTAR';
                connectBtn.onclick = driveSignOut;
                connectBtn.className = 'text-[10px] bg-slate-700 text-white px-4 py-2 rounded-xl font-black uppercase active:scale-95 transition';
                actions.classList.remove('hidden');
            } else {
                statusText.innerText = 'No conectado';
                connectBtn.innerText = 'CONECTAR';
                connectBtn.onclick = driveSignIn;
                connectBtn.className = 'text-[10px] bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase active:scale-95 transition';
                actions.classList.add('hidden');
            }
        }

        async function ensureDriveFolder() {
            if (!driveToken) return null;
            try {
                const saved = localStorage.getItem('driveFolderId');
                if (saved) { driveFolderId = saved; return driveFolderId; }
                const search = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
                    { headers: { Authorization: 'Bearer ' + driveToken } }
                ).then(r => r.json());
                if (search.files && search.files.length > 0) {
                    driveFolderId = search.files[0].id;
                } else {
                    const created = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + driveToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' })
                    }).then(r => r.json());
                    driveFolderId = created.id;
                }
                localStorage.setItem('driveFolderId', driveFolderId);
                return driveFolderId;
            } catch(e) { console.warn('Drive folder error:', e); return null; }
        }

        // driveBackupNow ya está redefinido arriba con el parámetro silent
        // driveRestore original

        // Descarga desde Drive con progreso real usando XHR
        function downloadFromDriveWithProgress(fileId, token, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                _activeDriveXhr = xhr;
                xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                xhr.responseType = 'text';
                let lastProgressAt = Date.now();
                if (typeof onProgress === 'function') {
                    xhr.onprogress = (e) => {
                        lastProgressAt = Date.now();
                        if (e.lengthComputable) {
                            onProgress((e.loaded / e.total) * 100, e.loaded, e.total);
                        } else {
                            onProgress(-1, e.loaded, 0);
                        }
                    };
                }
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
                        resolve(xhr.responseText);
                    } else {
                        const err = new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0,200)}`);
                        err.status = xhr.status;
                        reject(err);
                    }
                };
                xhr.onerror = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Error de red al descargar desde Drive')); };
                xhr.onabort = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Descarga cancelada')); };
                xhr.send();
            });
        }

        async function driveRestore() {
            if (!driveToken) { showAlert('Primero conecta tu cuenta de Google.', 'warning'); return; }
            if (!navigator.onLine) { showAlert('Sin conexión. Conecta a internet para restaurar desde Drive.', 'warning'); return; }
            showToast('Buscando respaldos en Drive...', 'info');
            try {
                const folderId = await ensureDriveFolder();
                const query    = folderId
                    ? `'${folderId}' in parents and name contains 'nelson_backup' and trashed=false`
                    : `name contains 'nelson_backup' and trashed=false`;
                const list = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,modifiedTime)`,
                    { headers: { Authorization: 'Bearer ' + driveToken } }
                ).then(r => r.json());

                if (!list.files || !list.files.length) { showAlert('No se encontraron respaldos en Drive.', 'info'); return; }

                const modal = document.createElement('div');
                modal.id = 'modal-drive-restore';
                modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';
                const items = list.files.map(f => {
                    const date = new Date(f.modifiedTime).toLocaleString('es-ES');
                    return `<button onclick="driveRestoreFile('${f.id}','${f.name}')" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;margin-bottom:8px;text-align:left;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                        <p style="color:#fff;font-weight:900;font-size:13px;">📄 ${f.name}</p>
                        <p style="color:#64748b;font-size:11px;margin-top:2px;">📅 ${date}</p>
                    </button>`;
                }).join('');
                modal.innerHTML = `<div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:24px;width:100%;max-width:400px;overflow:hidden;">
                    <div style="background:linear-gradient(to right,#3b82f6,#2563eb);padding:16px;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="color:white;font-weight:900;font-size:16px;">⬇️ RESTAURAR DESDE DRIVE</h3>
                        <button onclick="document.getElementById('modal-drive-restore').remove()" style="color:white;background:rgba(0,0,0,0.3);width:32px;height:32px;border-radius:50%;font-weight:bold;">✕</button>
                    </div>
                    <div style="padding:16px;max-height:60vh;overflow-y:auto;">${items}</div>
                </div>`;
                document.body.appendChild(modal);
            } catch(e) { showAlert('Error al acceder a Drive: ' + e.message, 'error'); }
        }

        async function driveRestoreFile(fileId, fileName) {
            document.getElementById('modal-drive-restore')?.remove();
            showConfirm(`¿Restaurar "${fileName}"?\nEsto reemplazará TODOS los datos actuales.`, async () => {
                // Reutilizo el overlay de progreso (mismo estilo que la subida pero en verde)
                showDriveProgress(fileName, 'download');
                updateDriveProgress(0, 0, 0, 'Conectando con Drive...');
                try {
                    const content = await downloadFromDriveWithProgress(fileId, driveToken, (pct, loaded, total) => {
                        if (pct < 0) {
                            // Progreso indeterminado (sin Content-Length): solo mostrar bytes
                            updateDriveProgress(0, loaded, loaded, 'Descargando respaldo...');
                        } else {
                            updateDriveProgress(pct, loaded, total, pct >= 99 ? 'Finalizando descarga...' : 'Descargando respaldo...');
                        }
                    });

                    updateDriveProgress(100, 0, 0, 'Aplicando respaldo...');

                    const blob = new Blob([content], { type: 'application/json' });
                    const file = new File([blob], fileName, { type: 'application/json' });
                    const dt   = new DataTransfer();
                    dt.items.add(file);
                    const input = document.getElementById('import-file');
                    Object.defineProperty(input, 'files', { value: dt.files, writable: false });

                    // Cerrar el overlay antes de que importData dispare su propio confirm/alert
                    hideDriveProgress(400);
                    setTimeout(() => importData({ target: input }), 450);
                } catch(e) {
                    hideDriveProgress();
                    const isAuthErr = (e.status === 401) || (e.message && e.message.includes('401'));
                    if (isAuthErr) {
                        driveToken = null; updateDriveUI(false);
                        showAlert('Sesión de Google expirada. Vuelve a conectar.', 'warning');
                    } else {
                        showAlert('Error al restaurar: ' + e.message, 'error');
                    }
                }
            });
        }

        function tryDriveReconnect() {
            const email = localStorage.getItem('driveEmail');
            if (!email) return; // nunca se conectó, no hacer nada

            // 1) Restaurar token en memoria desde sessionStorage (persiste mientras la app siga abierta)
            const storedToken = sessionStorage.getItem('driveToken');
            const storedExp   = parseInt(localStorage.getItem('driveTokenExpiresAt') || '0', 10);
            if (storedToken) { driveToken = storedToken; driveTokenExpiresAt = storedExp; }

            // 2) UI como conectado (optimista, mejor UX que mostrar "desconectado")
            updateDriveUI(true, email);

            // 3) Decidir si renovar ahora o agendar
            const now = Date.now();
            const aboutToExpire = !driveTokenExpiresAt || driveTokenExpiresAt <= now + 5 * 60 * 1000;
            if (aboutToExpire) {
                // Token vencido o casi vencido → renovar silenciosamente
                driveSilentRefresh().catch(e => {
                    console.warn('[Drive] Refresh automático al iniciar falló:', e.message);
                    // Si falla, no mostramos alerta. El usuario tendrá que reconectar
                    // manualmente si llega a intentar un respaldo.
                });
            } else {
                // Token aún válido → solo agendar el siguiente refresh
                scheduleNextDriveRefresh();
            }
        }

        // Cuando la app vuelve del segundo plano (WhatsApp, etc.), revisamos si el token
        // está por expirar. Esto cubre el caso donde el teléfono estuvo en sleep y el
        // setTimeout se pausó.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return;
            if (!localStorage.getItem('driveEmail')) return; // no estaba conectado
            const now = Date.now();
            const needsRefresh = !driveToken || !driveTokenExpiresAt || driveTokenExpiresAt <= now + 10 * 60 * 1000;
            if (needsRefresh) {
                driveSilentRefresh().catch(e => {
                    console.warn('[Drive] Refresh al volver del background falló:', e.message);
                });
            }
        });

