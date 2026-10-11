/* Метеощоденник — service worker.
   Стратегія: усі файли застосунку кешуються разом (атомарно) під версією VERSION.
   Запити до Open-Meteo / Nominatim НЕ перехоплюються й НЕ кешуються.
   Щоб випустити оновлення: змініть VERSION, і браузер встановить нову версію. */
const VERSION = 'mj7-1';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'locales/uk.js', 'locales/en.js', 'locales/pl.js', 'locales/de.js', 'locales/es.js', 'locales/ro.js', 'locales/ar.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // API: тільки мережа
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).catch(function () {
        if (req.mode === 'navigate') return cache.match('index.html');
        return Response.error();
      });
    });
  }));
});
