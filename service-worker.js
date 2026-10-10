/* ============================================================
 * NELSONAPP · SERVICE WORKER (PWABuilder optimized)
 * ────────────────────────────────────────────────────────────
 *  Estrategia:
 *  · Código propio (HTML, CSS, JS): network-first (4 s) con copia offline.
 *  · Iconos e imágenes: cache-first con revalidación en segundo plano.
 *  · APIs externas (Google Drive, Gemini, OAuth): se dejan
 *    pasar al navegador SIN interceptar (tokens y streaming).
 *  · CDNs: stale-while-revalidate.
 *  · La app puede mandar UPDATE_CACHE para forzar refresh.
 *  · push + notificationclick handlers para que PWABuilder
 *    detecte capacidad de notificaciones (puntúa más alto).
 * ============================================================ */

const CACHE_VERSION = 'nelsonapp-v3.4.4';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    // CSS
    './css/01-tema-variables.css',
    './css/02-componentes-base.css',
    './css/03-modo-claro-accesibilidad.css',
    './css/04-navegacion-movil.css',
    './css/05-modal-exportar.css',
    './css/06-taller-repuestos.css',
    './css/07-estadisticas.css',
    './css/08-ordenes-avisar-listos.css',
    './css/09-busqueda-config-red.css',
    './css/10-splash-pin-biometria.css',
    './css/11-responsive-escritorio.css',
    './css/12-extras-1.css',
    './css/13-extras-2.css',
    './css/14-configuracion-command-center.css',
    './css/15-nelson-ia.css',
    './css/16-aviso-actualizacion.css',
    './css/17-responsive-premium-hardening.css',
    './css/tailwind.css',
    // JS (core + modules + Nelson IA)
    './js/core/01-base-globales.js',
    './js/core/02-dialogos-db.js',
    './js/core/03-auth-pin-biometria.js',
    './js/modules/00-creditos.js',
    './js/modules/04-tema-notificaciones-alertas.js',
    './js/modules/05-cartera-clientes.js',
    './js/modules/06-init-app.js',
    './js/modules/07-backup-drive-progreso.js',
    './js/modules/08-ordenes-formulario-camara.js',
    './js/modules/09-ordenes-crud-busqueda.js',
    './js/modules/10-ordenes-lista-estados-whatsapp.js',
    './js/modules/11-fotos-gastos.js',
    './js/modules/12-inventario.js',
    './js/modules/13-ventas-precios-caja.js',
    './js/modules/14-garantias-estadisticas-filtros.js',
    './js/modules/15-exportar-importar-navegacion.js',
    './js/modules/16-panel-escritorio.js',
    './js/modules/17-taller-entrega-presupuesto-listos.js',
    './js/modules/18-listos-repuestos-reporte-mensual.js',
    './js/modules/19-diagnostico-comparar-accesibilidad.js',
    './js/modules/20-configuracion-modal.js',
    './js/modules/21-config-acciones-seguridad.js',
    './js/modules/22-movimientos-ticket.js',
    './js/modules/23-google-drive.js',
    './js/modules/24-plantillas-whatsapp-tecnicos.js',
    './js/modules/25-meta-graficas-compras.js',
    './js/modules/26-tour-guia.js',
    './js/modules/27-whatsapp-cola-proveedores.js',
    './js/modules/28-config-recordatorios-busqueda.js',
    './js/modules/29-reportes-tecnicos-equipos.js',
    './js/modules/30-tema-auto-push-proveedores.js',
    './js/modules/31-qr.js',
    './js/modules/32-chat-calendario-planes.js',
    './js/modules/33-plantillas-checklist-calificaciones.js',
    './js/modules/34-dashboard-voz.js',
    './js/modules/35-exportacion-pdf-csv-excel.js',
    './js/modules/36-push-salud-app.js',
    './js/modules/37-aviso-actualizacion.js',
    './js/nelson-ia.js'
];

// ──────────────────────── INSTALL ────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            // Se agrega archivo por archivo: si uno falla (404) NO se pierde todo el precache
            .then(cache => Promise.all(PRECACHE_URLS.map(u =>
                cache.add(u).catch(err => console.warn('[SW] No se pudo precachear', u, err && err.message))
            )))
            .then(() => self.skipWaiting())
    );
});

// ──────────────────────── ACTIVATE ────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(n => n.startsWith('nelsonapp-') && !n.startsWith(CACHE_VERSION))
                    .map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

// ──────────────────────── HELPERS ────────────────────────
function networkFirst(req, timeoutMs) {
    return new Promise((resolve) => {
        let done = false;
        const fromCache = () => caches.match(req).then(r => r || Response.error());
        const timer = setTimeout(() => { if (!done) fromCache().then(r => { if (!done) { done = true; resolve(r); } }); }, timeoutMs);
        fetch(req).then(resp => {
            if (resp && resp.status === 200 && resp.type === 'basic') {
                const copy = resp.clone();
                caches.open(STATIC_CACHE).then(c => c.put(req, copy)).catch(() => {});
            }
            if (!done) { done = true; clearTimeout(timer); resolve(resp); }
        }).catch(() => {
            clearTimeout(timer);
            if (!done) { fromCache().then(r => { done = true; resolve(r); }); }
        });
    });
}

// ──────────────────────── FETCH ────────────────────────
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // No interceptar APIs externas críticas (login Google, Drive, Gemini)
    const SKIP_HOSTS = [
        'googleapis.com',
        'google.com',
        'gstatic.com/accounts',
        'generativelanguage.googleapis.com'
    ];
    if (SKIP_HOSTS.some(h => url.hostname.includes(h))) {
        return;
    }

    // HTML: network-first
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(resp => {
                    const copy = resp.clone();
                    caches.open(STATIC_CACHE).then(c => c.put(req, copy)).catch(() => {});
                    return resp;
                })
                .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
        );
        return;
    }

    // Código propio (HTML, CSS, JS, JSON): network-first con tiempo límite.
    // Así nunca se mezclan archivos de versiones distintas y, sin señal, se usa la copia guardada.
    if (url.origin === self.location.origin && /\.(css|js|json|html)$/.test(url.pathname)) {
        event.respondWith(networkFirst(req, 4000));
        return;
    }

    // Same-origin (iconos e imágenes): cache-first con revalidación
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(req).then(cached => {
                if (cached) {
                    fetch(req).then(resp => {
                        if (resp && resp.status === 200) {
                            caches.open(STATIC_CACHE).then(c => c.put(req, resp));
                        }
                    }).catch(() => {});
                    return cached;
                }
                return fetch(req).then(resp => {
                    if (resp && resp.status === 200 && resp.type === 'basic') {
                        const copy = resp.clone();
                        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
                    }
                    return resp;
                }).catch(() => cached);
            })
        );
        return;
    }

    // CDNs externos: stale-while-revalidate
    event.respondWith(
        caches.open(RUNTIME_CACHE).then(cache =>
            cache.match(req).then(cached => {
                const fetchPromise = fetch(req).then(resp => {
                    if (resp && resp.status === 200) {
                        cache.put(req, resp.clone());
                    }
                    return resp;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        )
    );
});

// ──────────────────────── PUSH (PWABuilder lo detecta) ────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'NelsonApp', body: 'Tienes una notificación nueva' };
    try { if (event.data) data = event.data.json(); } catch(_) {
        try { if (event.data) data.body = event.data.text(); } catch(_) {}
    }
    const options = {
        body: data.body || '',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-96x96.png',
        tag: data.tag || 'nelsonapp',
        renotify: true,
        data: data.url || '/'
    };
    event.waitUntil(self.registration.showNotification(data.title || 'NelsonApp', options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if ('focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// ──────────────────────── MENSAJES ────────────────────────
self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'UPDATE_CACHE') {
        event.waitUntil(
            caches.keys()
                .then(names => Promise.all(names.map(n => caches.delete(n))))
                .then(() => self.skipWaiting())
                .then(() => self.clients.matchAll().then(clients => {
                    clients.forEach(c => c.postMessage({ type: 'CACHE_UPDATED' }));
                }))
        );
    }
    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
