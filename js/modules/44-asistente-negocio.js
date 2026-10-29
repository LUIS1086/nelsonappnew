/* Nelson App Pro · js/modules/44-asistente-negocio.js
   Asistente de primera instalación (marca blanca): pide los datos del negocio la primera vez que se abre la app. */
        function _necesitaAsistenteNegocio() {
            try {
                if (localStorage.getItem('setupNegocioHecho') === '1') return false;
                const c = JSON.parse(localStorage.getItem('businessConfig') || '{}');
                return !(c && c.name);
            } catch (e) { return false; }
        }
        function abrirAsistenteNegocio() {
            if (document.getElementById('modal-asistente-negocio')) return;
            const campo = (id, ph, extra) => '<input type="text" id="' + id + '" placeholder="' + ph + '" ' + (extra || '') + ' style="width:100%;padding:13px 14px;margin-top:9px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:15px;">';
            const el = document.createElement('div');
            el.id = 'modal-asistente-negocio';
            el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            el.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,7,18,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
            el.innerHTML = '<div style="width:100%;max-width:420px;max-height:92dvh;overflow:auto;border-radius:26px;padding:22px;background:linear-gradient(160deg,#111a2e,#0a1020);border:1px solid rgba(125,211,252,.25);box-shadow:0 30px 90px rgba(0,0,0,.6);color:#e5e7eb;">'
                + '<p style="font-size:10px;font-weight:900;letter-spacing:3px;color:#7dd3fc;text-transform:uppercase;margin:0 0 6px;">Bienvenido</p>'
                + '<h2 style="font-size:22px;font-weight:900;margin:0 0 4px;color:#fff;">Configura tu negocio</h2>'
                + '<p style="font-size:13px;color:#94a3b8;margin:0 0 8px;">Estos datos salen en el inicio, las facturas y los mensajes. Los puedes cambiar luego en Configuración.</p>'
                + campo('asist-name', 'Nombre del negocio *', 'maxlength="40" autocomplete="off"')
                + campo('asist-short', 'Nombre corto (ej: MI TALLER)', 'maxlength="24" autocomplete="off"')
                + campo('asist-tagline', 'Lema (ej: Taller &amp; Repuestos)', 'maxlength="40" autocomplete="off"')
                + campo('asist-phone', 'Teléfono / WhatsApp', 'inputmode="tel" autocomplete="off"')
                + campo('asist-prefix', 'Prefijo de órdenes (ej: MT-)', 'maxlength="8" autocomplete="off"')
                + '<p id="asist-err" style="display:none;font-size:12px;color:#fca5a5;margin:10px 0 0;">Escribe al menos el nombre del negocio.</p>'
                + '<div style="display:flex;gap:10px;margin-top:16px;">'
                + '<button type="button" id="asist-omitir" style="flex:1;padding:14px;border-radius:14px;border:0;background:rgba(255,255,255,.08);color:#cbd5e1;font-weight:800;">Ahora no</button>'
                + '<button type="button" id="asist-guardar" style="flex:1.4;padding:14px;border-radius:14px;border:0;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-weight:900;">Guardar y empezar</button>'
                + '</div></div>';
            document.body.appendChild(el);
            const $ = id => document.getElementById(id);
            setTimeout(() => { try { $('asist-name').focus(); } catch (e) {} }, 150);
            $('asist-omitir').onclick = () => { try { localStorage.setItem('setupNegocioHecho', '1'); } catch (e) {} el.remove(); };
            $('asist-guardar').onclick = () => {
                const name = $('asist-name').value.trim();
                if (!name) { $('asist-err').style.display = 'block'; $('asist-name').focus(); return; }
                let cfg = {}; try { cfg = JSON.parse(localStorage.getItem('businessConfig') || '{}') || {}; } catch (e) {}
                cfg.name = name;
                cfg.shortName = $('asist-short').value.trim() || name.toUpperCase();
                cfg.tagline = $('asist-tagline').value.trim();
                cfg.phone = $('asist-phone').value.trim();
                cfg.orderPrefix = $('asist-prefix').value.trim();
                try { localStorage.setItem('businessConfig', JSON.stringify(cfg)); localStorage.setItem('setupNegocioHecho', '1'); } catch (e) {}
                try { loadBusinessConfig(); } catch (e) {}
                try { const n = document.getElementById('business-name-display'); if (n) n.textContent = cfg.name; } catch (e) {}
                el.remove();
                try { showToast('Negocio configurado', 'success'); } catch (e) {}
            };
        }
