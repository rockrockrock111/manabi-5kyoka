'use strict';
const PREFIX = `manabi-${self.registration.scope}-`;
// Bump the release whenever app code or question data changes.
const CACHE = `${PREFIX}v04-question-bank-1`;
const ASSETS = ['./', './index.html', './app.js', './question-bank.js', './questions.json',
  './data/catalog.json', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL('./data/catalog.json', self.registration.scope), {cache:'no-store'});
    if (!response.ok) throw new Error('Cannot load question catalog');
    const catalog = await response.json();
    const files = catalog.units.filter(unit => unit.file).map(unit => `./data/${unit.file}`);
    const cache = await caches.open(CACHE);
    // A failed asset prevents activation, preserving the previous complete release.
    await cache.addAll([...ASSETS, ...files]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  const asset = ASSETS.some(path => new URL(path, self.registration.scope).href === url.href)
    || url.href.startsWith(new URL('./data/questions/', self.registration.scope).href);
  if (!asset) return;
  // Read app and catalog from one complete release, including while offline.
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
