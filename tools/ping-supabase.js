#!/usr/bin/env node
// Mantiene despierto el proyecto de Supabase (el plan gratis se pausa tras 7 días sin actividad y,
// si se pausa, los enlaces de seguimiento de tus clientes dejan de funcionar).
// Hace una consulta inofensiva (seg_obtener con un token falso: devuelve null, no toca ni muestra datos).
// Lo ejecuta .github/workflows/mantener-supabase.yml dos veces por semana. Si Supabase responde con error
// (por ejemplo, proyecto ya pausado), falla y GitHub te avisa por correo.
const fs = require('fs'), path = require('path');
const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'seguimiento-config.js'), 'utf8');
const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1], key = (cfg.match(/key:\s*'([^']+)'/) || [])[1];
if (!url || !key) { console.error('✗ No encontré url/key en js/seguimiento-config.js'); process.exit(1); }
const headers = { 'Content-Type': 'application/json', apikey: key };
if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;
fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/seg_obtener', { method: 'POST', headers, body: JSON.stringify({ p_token: 'ping-mantener-activo-000000' }) })
  .then(async r => { if (!r.ok) { console.error('✗ Supabase respondió ' + r.status + ': ' + (await r.text()).slice(0, 200)); process.exit(1); } console.log('✓ Supabase activo (' + r.status + ')'); })
  .catch(e => { console.error('✗ No se pudo contactar a Supabase: ' + e.message); process.exit(1); });
