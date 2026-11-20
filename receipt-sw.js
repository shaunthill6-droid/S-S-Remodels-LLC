/* Offline copy of the S&S estimate, invoice and receipt builder (receipt.html).
   Network first, so a live update always wins; the saved copy is used only with no signal. */
var CACHE = 'ss-receipt-v1';
var CORE = [
  '/receipt.html',
  '/receipt-manifest.json',
  '/assets/receipt.css',
  '/assets/receipt.js',
  '/assets/receipt-logo.png',
  '/assets/receipt-icon-192.png',
  '/assets/receipt-icon-512.png',
  '/assets/fonts/barlow-latin-400-normal.woff2',
  '/assets/fonts/barlow-latin-600-normal.woff2',
  '/assets/fonts/barlow-condensed-latin-700-normal.woff2',
  '/assets/vendor/html2pdf.bundle.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ss-receipt-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('/receipt.html'); });
  }));
});
