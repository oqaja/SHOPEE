// Service worker minimal — cuma buat syarat installability PWA,
// SENGAJA gak nge-cache apapun biar gak ada lagi masalah versi lama
// nyangkut. Semua request diteruskan apa adanya ke network.
const CACHE_NAME = 'shopee-video-passthrough';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', () => {
  // sengaja kosong -> browser fetch normal ke network, gak ada intercept/cache
});
