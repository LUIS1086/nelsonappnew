// ============================================================
// service-worker.js — PWA: caché offline
// NelsonApp Pro
// ============================================================

const CACHE_NAME = 'nelsonapp-v2';

// Recursos a cachear en la instalación
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/db.js',
    './js/config.js',
    './js/inventory.js',
    './js/orders.js',
    './js/cash.js',
    './js/drive.js',
    './js/app.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,600;14..32,800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

// ── Instalación: pre-cachear recursos locales ──
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando NelsonApp v2...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cachear solo recursos locales (los externos pueden fallar en install)
            const localAssets = PRECACHE_ASSETS.filter(url => !url.startsWith('http'));
            return cache.addAll(localAssets).then(() => {
                console.log('[SW] Recursos locales cacheados');
                // Intentar cachear externos sin bloquear
                const external = PRECACHE_ASSETS.filter(url => url.startsWith('http'));
                return Promise.allSettled(external.map(url =>
                    cache.add(url).catch(e => console.warn('[SW] No se pudo cachear:', url))
                ));
            });
        }).then(() => self.skipWaiting())
    );
});

// ── Activación: limpiar cachés viejas ──
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Eliminando caché vieja:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: estrategia Cache-First con fallback a red ──
self.addEventListener('fetch', (event) => {
    // No interceptar peticiones de Google Drive / APIs externas
    const url = event.request.url;
    if (
        url.includes('googleapis.com') ||
        url.includes('google.com/gsi') ||
        url.includes('accounts.google.com') ||
        url.includes('api.telegram.org') ||
        event.request.method !== 'GET'
    ) {
        return; // Dejar pasar sin interceptar
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Encontrado en caché — devolver y actualizar en background
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const clone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                        }
                        return networkResponse;
                    })
                    .catch(() => {}); // Silenciar errores de red en background

                return cachedResponse;
            }

            // No está en caché — ir a la red y guardar
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                    return networkResponse;
                }
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return networkResponse;
            }).catch(() => {
                // Sin red y sin caché — devolver página offline básica
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// ── Mensajes desde la app ──
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});
