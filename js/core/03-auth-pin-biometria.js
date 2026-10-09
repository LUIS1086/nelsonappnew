/* Nelson App Pro · js/core/03-auth-pin-biometria.js
   Desbloqueo, PIN y biometria WebAuthn
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== PIN AUTH ====================
        // Función reutilizable: lo que pasa cuando el usuario se autentica con éxito
        // (ya sea por PIN correcto o por huella). Centraliza el flujo de desbloqueo.
        async function _unlockAppFromAuth() {
            document.getElementById('pin-modal').classList.add('hidden');
            document.getElementById('app-header').classList.remove('hidden');
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('hidden'));
            await initApp();
            // Manejar navegación/acción venida desde dashboard.html
            const dashTab    = sessionStorage.getItem('dashGoTab');
            const dashAction = sessionStorage.getItem('dashAction');
            sessionStorage.removeItem('dashGoTab');
            sessionStorage.removeItem('dashAction');
            if (dashTab) {
                tab(dashTab);
            } else if (dashAction === 'caja' || dashAction === 'report' || dashAction === 'stats') {
                tab('ventas');
            } else {
                tab('taller');
            }
            if (dashAction) {
                setTimeout(() => {
                    if (dashAction === 'notify') notifyAllReady();
                    if (dashAction === 'report') exportMonthlyReport();
                    if (dashAction === 'stats')  openStatsModal();
                    if (dashAction === 'caja')   openCajaModal();
                }, 350);
            }
            if (!localStorage.getItem('tutorialShown')) {
                const _biz = _safeBizConfig();
                const _bizName = _biz.name || 'Todo Repuestos Nelson';
                setTimeout(() => showAlert(`👋 ¡Bienvenido a ${_bizName}!\n\nDesliza entre pestañas, toca el nombre de un cliente para ver su historial, y usa el escáner 📷 en inventario.`, "info"), 600);
                localStorage.setItem('tutorialShown', 'true');
            }
        }

        async function verifyPin() {
            const input = document.getElementById('pin-input').value;
            const inputHash = await _hashPin(input);
            if (inputHash === _pinHash) {
                // Animación de éxito en dots + pequeña vibración positiva
                document.querySelectorAll('#pin-dots .pin-dot').forEach(d => {
                    d.classList.add('success');
                });
                if (navigator.vibrate) { try { navigator.vibrate(25); } catch(_) {} }
                setTimeout(() => { _unlockAppFromAuth(); }, 300);
            } else {
                // PIN incorrecto: shake + vibración + dots en rojo
                const dotsContainer = document.getElementById('pin-dots');
                dotsContainer.classList.add('shake');
                document.querySelectorAll('#pin-dots .pin-dot').forEach(d => {
                    d.classList.add('error');
                });
                // Vibración háptica en móviles compatibles
                if (navigator.vibrate) {
                    try { navigator.vibrate([60, 40, 60]); } catch(_) {}
                }
                setTimeout(() => {
                    dotsContainer.classList.remove('shake');
                    document.querySelectorAll('#pin-dots .pin-dot').forEach(d => {
                        d.classList.remove('error', 'filled');
                        d.style.background = '';
                        d.style.borderColor = '';
                    });
                    updatePinOkState();
                }, 550);
                document.getElementById('pin-input').value = '';
                document.getElementById('pin-error').innerText = '⚠️ PIN incorrecto';
                pinBuffer = '';
            }
        }

        function openChangePinModal() { document.getElementById('modal-pin-change').classList.remove('hidden'); }
        async function changePin() {
            const newPin     = document.getElementById('new-pin').value;
            const confirmPin = document.getElementById('confirm-pin').value;
            if (!/^\d{4,6}$/.test(newPin))    return showAlert("El PIN debe tener entre 4 y 6 dígitos numéricos.", "warning");
            if (newPin !== confirmPin)          return showAlert("Los PIN no coinciden. Inténtalo de nuevo.", "warning");
            _pinHash = await _hashPin(newPin);
            localStorage.setItem('appPinHash', _pinHash);
            localStorage.removeItem('appPin'); // asegurar que no quede texto plano
            closePinChangeModal();
            showAlert("PIN actualizado correctamente. ✅", "success");
        }
        function closePinChangeModal() { document.getElementById('modal-pin-change').classList.add('hidden'); }

        // ==================== HUELLA DIGITAL (WebAuthn) ====================
        // Implementación premium de biometría usando la API estándar WebAuthn.
        // Funciona en Chrome (PWABuilder/TWA, Chrome móvil, Chrome desktop).
        // El "secreto" nunca sale del dispositivo: la verificación es local.
        const _BIO_KEY_ENABLED = 'appBiometricEnabled';
        const _BIO_KEY_CRED    = 'appBiometricCredentialId';

        function isBiometricEnabled() {
            return localStorage.getItem(_BIO_KEY_ENABLED) === '1' && !!localStorage.getItem(_BIO_KEY_CRED);
        }

        async function _isBiometricAvailable() {
            if (!window.PublicKeyCredential) return false;
            if (!window.isSecureContext && location.hostname !== 'localhost') return false;
            try {
                return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            } catch(_) { return false; }
        }

        // Helpers base64 ↔ ArrayBuffer
        function _b64ToBuf(b64) {
            const bin = atob(b64.replace(/-/g,'+').replace(/_/g,'/'));
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            return buf;
        }
        function _bufToB64(buf) {
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
        }

        // Registrar huella nueva (lo invoca el toggle al activarse)
        async function enableBiometric() {
            if (!await _isBiometricAvailable()) {
                showAlert('Tu dispositivo no soporta huella digital o no tienes una huella registrada en el sistema. Configúrala primero en los ajustes de tu teléfono.', 'warning');
                return false;
            }
            try {
                const biz = _safeBizConfig();
                const rpName = biz.name || 'Todo Repuestos Nelson';
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const userId    = crypto.getRandomValues(new Uint8Array(16));
                const cred = await navigator.credentials.create({
                    publicKey: {
                        challenge,
                        rp: { name: rpName },
                        user: { id: userId, name: 'owner', displayName: rpName },
                        pubKeyCredParams: [
                            { type: 'public-key', alg: -7   }, // ES256
                            { type: 'public-key', alg: -257 }  // RS256
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: 'platform',
                            userVerification: 'required',
                            residentKey: 'preferred'
                        },
                        timeout: 60000,
                        attestation: 'none'
                    }
                });
                if (!cred || !cred.rawId) return false;
                localStorage.setItem(_BIO_KEY_CRED, _bufToB64(cred.rawId));
                localStorage.setItem(_BIO_KEY_ENABLED, '1');
                return true;
            } catch(e) {
                console.warn('[biometric register]', e);
                if (e && e.name === 'NotAllowedError') {
                    // Usuario canceló o se agotó el tiempo: silencio, no spamear alertas
                    return false;
                }
                showAlert('No se pudo registrar la huella. ' + (e.message || 'Inténtalo de nuevo.'), 'error');
                return false;
            }
        }

        function disableBiometric() {
            localStorage.removeItem(_BIO_KEY_ENABLED);
            localStorage.removeItem(_BIO_KEY_CRED);
        }

        // Verificar huella (intenta autenticar y, si pasa, desbloquea la app)
        async function verifyBiometricUnlock() {
            if (!isBiometricEnabled()) return;
            const btn   = document.getElementById('biometric-pin-btn');
            const label = document.getElementById('biometric-pin-label');
            if (!btn) return;
            // Reset visual
            btn.classList.remove('success','error');
            btn.classList.add('scanning');
            if (label) label.textContent = 'Coloca tu huella…';
            try {
                const credIdB64 = localStorage.getItem(_BIO_KEY_CRED);
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        allowCredentials: [{
                            type: 'public-key',
                            id: _b64ToBuf(credIdB64),
                            transports: ['internal']
                        }],
                        userVerification: 'required',
                        timeout: 60000
                    }
                });
                btn.classList.remove('scanning');
                if (!assertion) throw new Error('Sin respuesta del autenticador');
                btn.classList.add('success');
                if (label) label.textContent = '¡Bienvenido!';
                if (navigator.vibrate) { try { navigator.vibrate(25); } catch(_) {} }
                setTimeout(() => { _unlockAppFromAuth(); }, 380);
            } catch(e) {
                console.warn('[biometric verify]', e);
                btn.classList.remove('scanning');
                btn.classList.add('error');
                if (label) {
                    if (e && e.name === 'NotAllowedError') {
                        label.textContent = 'Cancelado · usa tu PIN';
                    } else {
                        label.textContent = 'No reconocida · usa tu PIN';
                    }
                }
                if (navigator.vibrate) { try { navigator.vibrate([60,40,60]); } catch(_) {} }
                setTimeout(() => {
                    btn.classList.remove('error');
                    if (label) label.textContent = 'Toca para usar huella';
                }, 1800);
            }
        }

        // Render del botón de huella en el modal de PIN (mostrar/ocultar según estado)
        function _renderBiometricInPinModal() {
            const wrap  = document.getElementById('biometric-pin-wrap');
            const label = document.getElementById('biometric-pin-label');
            const btn   = document.getElementById('biometric-pin-btn');
            if (!wrap) return;
            if (isBiometricEnabled()) {
                wrap.classList.remove('hidden');
                if (btn) btn.classList.remove('scanning','success','error');
                if (label) label.textContent = 'Toca para usar huella';
            } else {
                wrap.classList.add('hidden');
            }
        }

        // Render del switch en settings
        async function _renderBiometricToggle() {
            const sw  = document.getElementById('biometric-switch');
            const sub = document.getElementById('biometric-row-sub');
            const row = document.getElementById('biometric-row');
            if (!sw) return;
            const supported = await _isBiometricAvailable();
            if (!supported) {
                sw.classList.remove('active');
                if (sub) sub.textContent = 'No disponible en este dispositivo';
                if (row) row.style.opacity = '0.55';
                return;
            }
            if (row) row.style.opacity = '';
            if (isBiometricEnabled()) {
                sw.classList.add('active');
                if (sub) sub.textContent = 'Activa · toca para desactivar';
            } else {
                sw.classList.remove('active');
                if (sub) sub.textContent = 'Acceso rápido y seguro';
            }
        }

        // Toggle: activar o desactivar huella
        async function toggleBiometric() {
            const supported = await _isBiometricAvailable();
            if (!supported) {
                showAlert('Tu dispositivo no soporta huella digital, o no tienes una huella registrada en el sistema. Configúrala primero en los ajustes de tu teléfono.', 'warning');
                return;
            }
            if (isBiometricEnabled()) {
                // Desactivar (con confirmación)
                if (confirm('¿Desactivar el desbloqueo con huella?\nSeguirás pudiendo entrar con tu PIN.')) {
                    disableBiometric();
                    _renderBiometricToggle();
                    showAlert('Huella desactivada.', 'success');
                }
                return;
            }
            // Activar: pedir registro de huella
            const ok = await enableBiometric();
            await _renderBiometricToggle();
            if (ok) {
                if (navigator.vibrate) { try { navigator.vibrate(30); } catch(_) {} }
                showAlert('✅ Huella registrada.\nLa próxima vez podrás entrar tocando el sensor.', 'success');
            }
        }

        // Helper: muestra el modal de PIN y, si la huella está habilitada,
        // intenta autenticar automáticamente tras un breve delay para que
        // la animación del modal no se vea interrumpida.
        function showPinModal() {
            document.getElementById('pin-modal').classList.remove('hidden');
            _renderBiometricInPinModal();
            if (isBiometricEnabled()) {
                setTimeout(() => {
                    // Solo auto-trigger si el modal sigue visible (usuario no ha empezado a teclear)
                    const m = document.getElementById('pin-modal');
                    if (m && !m.classList.contains('hidden') && pinBuffer === '') {
                        verifyBiometricUnlock();
                    }
                }, 450);
            }
        }

