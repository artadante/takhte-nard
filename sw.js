/* sw.js - Service Worker for Long Backgammon PWA */

const CACHE_NAME = 'long-backgammon-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-128.png',
  './icons/icon-512.png',
  './assets/images/marble_board.png',
  './assets/images/marble_white.png',
  './assets/images/marble_black.png',
  './assets/images/marble_dicecursor.png',
  './assets/sounds/checkermove.sfx',
  './assets/sounds/diceroll01.sfx',
  './assets/sounds/diceroll02.sfx',
  './assets/sounds/diceroll03.sfx',
  './assets/sounds/newgame.sfx',
  './assets/sounds/paneldock.sfx',
  './assets/sounds/placement_step.sfx',
  './assets/sounds/victory.sfx',
  './assets/translations/fa.json',
  './assets/translations/en.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).then((response) => {
          if (
            response &&
            response.status === 200 &&
            event.request.method === 'GET' &&
            !event.request.url.startsWith('chrome-extension')
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
      );
    }).catch(() => {
      return caches.match('./index.html');
    })
  );
});
