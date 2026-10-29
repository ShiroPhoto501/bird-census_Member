const CACHE = 'bird-census-v10';
const TILES = 'gsi-tiles-v1';
const EXT = [
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
];
const LOCAL = ['./', './index.html', './app.js', './manifest.webmanifest', './species.js', './species-info.js', './config.js', './sel-point.png', './sel-line.png', './icon-192.png', './icon-512.png', './maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(LOCAL);
    for (const u of EXT) { try { await c.put(u, await fetch(u, { mode: 'no-cors' })); } catch (_) {} }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== TILES) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = req.url;
  if (req.method !== 'GET') return;
  if (new URL(url).pathname.endsWith('/config.js')) {          // 設定ファイルは常に最新を優先(圏外では保存分)
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; }
      catch (_) { return (await c.match(req, { ignoreSearch: true })) || Response.error(); }
    })());
    return;
  }
  if (url.includes('api.open-meteo.com')) return;            // 天気は常に最新を取得
  if (url.includes('cyberjapandata.gsi.go.jp')) {              // 地図: 保存済みなら保存分を使う
    e.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      try { return await fetch(req); } catch (_) { return Response.error(); }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    } catch (_) {
      if (req.mode === 'navigate') return c.match('./index.html');
      throw _;
    }
  })());
});
