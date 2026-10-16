/* Smart Field – 서비스 워커: 앱 파일을 태블릿에 보관(오프라인 실행) · 새 버전은 사용자가 '적용'을 누를 때 교체 */
const VERSION = '2026.10.16-0923';
const CACHE = 'yajang-' + VERSION, FONT_CACHE = 'yajang-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  // 새 버전 파일을 미리 받아 둠 (HTTP 캐시 건너뛰고 서버에서 직접)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('yajang-') && k !== CACHE && k !== FONT_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  else if (e.data.type === 'VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);   // 업데이트 창에 새 버전 번호 표시
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // 앱 화면·아이콘: 보관본 먼저 (인터넷 없어도 실행)
    if (req.mode === 'navigate') { e.respondWith(caches.match('./index.html').then(r => r || fetch(req))); return; }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  // 글꼴: 한 번 받으면 보관 (오프라인에서도 같은 글꼴)
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
