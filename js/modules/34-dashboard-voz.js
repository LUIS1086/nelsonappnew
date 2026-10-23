/* Nelson App Pro · js/modules/34-dashboard-voz.js
   Entrada por voz (Web Speech API) para los campos de texto de la app.
   NOTA: el "dashboard inline" que vivía aquí fue eliminado por estar muerto:
   el DOM que renderizaba (dashboard-inline-panel, dash-estados, dash-kpi-*,
   dash-alertas, dash-chart-ingresos…) no existe en ningún HTML del proyecto y
   sus funciones (toggleDashboardInline, openDashboardModal, closeDashboardModal,
   renderInlineDashboard, updateOverdueBadge) no tenían ningún caller.
   El dashboard real vive en dashboard.html + js/dashboard.js. */
        // ==================== 🎤 ENTRADA DE VOZ ====================
        let _voiceRecognition = null;
        let _voiceTargetId = null;
        let _voiceTriggerSearch = false;

        function startVoiceInput(targetId, triggerSearch = false) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToast('Tu dispositivo no soporta entrada de voz', 'warning');
                return;
            }
            // Si ya hay reconocimiento activo en este campo, cancelar
            if (_voiceRecognition && _voiceTargetId === targetId) {
                _voiceRecognition.stop();
                return;
            }
            // Cancelar cualquier otro activo
            if (_voiceRecognition) _voiceRecognition.stop();

            _voiceTargetId = targetId;
            _voiceTriggerSearch = triggerSearch;
            const btn = document.getElementById('voice-btn-' + (targetId === 'search-orders' ? 'search' : targetId));

            _voiceRecognition = new SpeechRecognition();
            _voiceRecognition.lang = 'es-CO';
            _voiceRecognition.continuous = false;
            _voiceRecognition.interimResults = false;

            _voiceRecognition.onstart = () => {
                if (btn) btn.classList.add('listening');
                if (btn) btn.textContent = '🔴';
                showToast('🎤 Escuchando...', 'info');
            };

            _voiceRecognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                const el = document.getElementById(targetId);
                if (!el) return;
                // Para textareas y inputs tipo text, agregar al texto existente
                const isTextarea = el.tagName === 'TEXTAREA';
                el.value = isTextarea ? (el.value ? el.value + ' ' + transcript : transcript) : transcript.toUpperCase();
                el.dispatchEvent(new Event('input', { bubbles: true }));
                if (_voiceTriggerSearch) onSearchInput && onSearchInput();
                if (targetId === 'c-fal') suggestDiagnosis && suggestDiagnosis();
                if (targetId === 'c-nom') checkClient && checkClient();
                showToast('✅ Texto capturado', 'success');
            };

            _voiceRecognition.onerror = (e) => {
                const msgs = { 'no-speech': 'No se detectó voz', 'not-allowed': 'Permiso de micrófono denegado', 'network': 'Error de red' };
                showToast('🎤 ' + (msgs[e.error] || 'Error al escuchar'), 'warning');
            };

            _voiceRecognition.onend = () => {
                if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
                _voiceRecognition = null;
                _voiceTargetId = null;
            };

            _voiceRecognition.start();
        }
