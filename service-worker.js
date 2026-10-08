/* ============================================================
 * NELSONAPP · SERVICE WORKER (PWABuilder optimized) — v3.4.0
 * ────────────────────────────────────────────────────────────
 *  Estrategia:
 *  · App shell (HTML, CSS, JS propios): NETWORK-FIRST con respaldo
 *    en caché. Con conexión siempre se usa la versión más nueva y
 *    todos los módulos coinciden entre sí; sin conexión (o con red
 *    muy lenta) se sirve la copia guardada.
 *  · Iconos y manifest: cache-first con revalidación en segundo plano.
 *  · APIs de Google (Drive, OAuth) y Gemini: NO se interceptan.
 *  · Fuentes y CDNs (Tailwind, html2canvas, qrcode, Chart.js):
 *    stale-while-revalidate, precargados para que funcionen offline.
 *  · UPDATE_CACHE: borra cachés y vuelve a precargar.
 *
 *  ⚠ CADA VEZ QUE DESPLIEGUES cambios en css/ o js/, sube CACHE_VERSION.
 * ============================================================ */

const CACHE_VERSION = 'nelsonapp-v3.4.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Tiempo máximo esperando la red antes de usar la copia guardada
const NETWORK_TIMEOUT_MS = 4000;

// App shell propio. Se guarda archivo por archivo: si uno falla
// (p. ej. no existe), los demás igual quedan en caché.
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './css/app.css',
    './js/core/storage-fallback.js',
    './js/core/credits.js',
    './js/core/performance.js',
    './js/modules/00-foundation.js',
    './js/modules/10-orders-clients.js',
    './js/modules/20-inventory.js',
    './js/modules/30-workshop-ux.js',
    './js/modules/40-settings.js',
    './js/modules/50-drive-reports.js',
    './js/modules/60-connectivity-reports.js',
    './js/modules/70-qr.js',
    './js/modules/80-productivity.js',
    './js/modules/90-pwa-dashboard.js',
    './js/modules/91-exports.js',
    './js/modules/92-push.js',
    './js/modules/93-health.js',
    './js/nelson-ia.js',
    './dashboard.html',
    './icons/icon-96x96.png',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// Librerías externas que la app necesita para verse y funcionar offline.
// Se piden con CORS para poder guardarlas completas (no "opacas").
const CDN_PRECACHE_URLS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Hosts que NO se interceptan (login, Drive, Gemini)…
const SKIP_HOSTS = ['googleapis.com', 'google.com', 'gstatic.com'];
// …excepto las fuentes, que sí conviene cachear.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// ──────────────────────── PRECACHE ────────────────────────
async function precacheAll() {
    const cache = await caches.open(STATIC_CACHE);

    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
        const resp = await fetch(url, { cache: 'reload' });
        if (resp && resp.ok) await cache.put(url, resp);
        else throw new Error(url + ' → ' + (resp && resp.status));
    })).then(results => {
        const fallos = results.filter(r => r.status === 'rejected');
        if (fallos.length) console.warn('[SW] No se pudo precargar:', fallos.length, 'archivo(s)');
    });

    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(CDN_PRECACHE_URLS.map(async (url) => {
        const resp = await fetch(url, { mode: 'cors' });
        if (resp && resp.ok) await runtime.put(url, resp);
    }));
}

// ──────────────────────── INSTALL ────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        precacheAll()
            .catch(err => console.warn('[SW] Precache parcial:', err))
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
function guardar(cacheName, req, resp) {
    // Solo respuestas buenas; nunca guardar errores 404/500
    if (resp && (resp.ok || resp.type === 'opaque')) {
        const copia = resp.clone();
        caches.open(cacheName).then(c => c.put(req, copia)).catch(() => {});
    }
}

function networkFirst(req, cacheName, fallbackUrl) {
    return new Promise((resolve) => {
        let resuelto = false;
        const usarCache = () =>
            caches.match(req, { ignoreSearch: true })
                .then(r => r || (fallbackUrl ? caches.match(fallbackUrl) : undefined));

        const timer = setTimeout(() => {
            usarCache().then(r => { if (r && !resuelto) { resuelto = true; resolve(r); } });
        }, NETWORK_TIMEOUT_MS);

        fetch(req).then(resp => {
            clearTimeout(timer);
            guardar(cacheName, req, resp);
            if (!resuelto) { resuelto = true; resolve(resp); }
        }).catch(() => {
            clearTimeout(timer);
            if (resuelto) return;
            usarCache().then(r => {
                resuelto = true;
                resolve(r || Response.error());
            });
        });
    });
}

function cacheFirstRevalidate(req, cacheName) {
    return caches.match(req).then(cached => {
        const red = fetch(req).then(resp => {
            if (resp && resp.status === 200) guardar(cacheName, req, resp);
            return resp;
        });
        if (cached) { red.catch(() => {}); return cached; }
        return red;
    });
}

function staleWhileRevalidate(req, cacheName) {
    return caches.open(cacheName).then(cache =>
        cache.match(req).then(cached => {
            const red = fetch(req).then(resp => {
                guardar(cacheName, req, resp);
                return resp;
            }).catch(() => cached);
            return cached || red;
        })
    );
}

// ──────────────────────── FETCH ────────────────────────
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // No interceptar APIs de Google ni Gemini (tokens y streaming)
    const esFuente = FONT_HOSTS.includes(url.hostname);
    if (!esFuente && SKIP_HOSTS.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) {
        return;
    }

    // Navegación / HTML: network-first
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(networkFirst(req, STATIC_CACHE, './index.html'));
        return;
    }

    if (url.origin === self.location.origin) {
        // Código propio (JS/CSS): network-first para que todos los módulos
        // sean de la misma versión y no se mezclen viejos con nuevos.
        if (/\.(js|css)$/i.test(url.pathname)) {
            event.respondWith(networkFirst(req, STATIC_CACHE));
            return;
        }
        // Iconos, manifest, etc.: cache-first con revalidación
        event.respondWith(cacheFirstRevalidate(req, STATIC_CACHE));
        return;
    }

    // CDNs y fuentes: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
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
                .then(() => precacheAll().catch(() => {}))   // dejar el modo offline listo otra vez
                .then(() => self.skipWaiting())
                .then(() => self.clients.matchAll().then(list => {
                    list.forEach(c => c.postMessage({ type: 'CACHE_UPDATED' }));
                }))
        );
    }
    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
