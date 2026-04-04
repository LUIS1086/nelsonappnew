// ============================================================
// service-worker.js — PWA: caché offline
// NelsonApp Pro — Optimizado para Vercel (single HTML file)
// ============================================================

const CACHE_NAME = 'nelsonapp-v3';

// Solo los recursos que realmente existen en el deploy
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// Recursos externos que se cachean en background (no bloquean install)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,600;14..32,800&display=swap',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

// ── Instalación ──
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando NelsonApp v3...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => {
                // Cachear externos sin bloquear la instalación
                caches.open(CACHE_NAME).then(cache =>
                    Promise.allSettled(
                        EXTERNAL_ASSETS.map(url =>
                            cache.add(url).catch(e => console.warn('[SW] Externo no cacheado:', url))
                        )
                    )
                );
            })
            .then(() => {
                console.log('[SW] Instalación completa');
                return self.skipWaiting();
            })
            .catch(err => console.error('[SW] Error en install:', err))
    );
});

// ── Activación: limpiar cachés viejas ──
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => {
                            console.log('[SW] Eliminando caché vieja:', key);
                            return caches.delete(key);
                        })
                )
            )
            .then(() => self.clients.claim())
    );
});

// ── Fetch: estrategia Stale-While-Revalidate ──
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // No interceptar: Google APIs, Firebase, Anthropic, métodos no-GET
    if (
        url.includes('googleapis.com') ||
        url.includes('google.com/gsi') ||
        url.includes('accounts.google.com') ||
        url.includes('firebaseapp.com') ||
        url.includes('firestore.googleapis.com') ||
        url.includes('api.anthropic.com') ||
        url.includes('api.telegram.org') ||
        event.request.method !== 'GET'
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Stale-While-Revalidate: sirve desde caché y actualiza en background
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(event.request, networkResponse.clone())
                        );
                    }
                    return networkResponse;
                })
                .catch(() => null);

            // Si hay caché, sirve inmediato y actualiza de fondo
            if (cachedResponse) {
                event.waitUntil(fetchPromise);
                return cachedResponse;
            }

            // Sin caché: ir a la red
            return fetchPromise.then(response => {
                if (response) return response;
                // Offline total y es un documento HTML → fallback
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
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
