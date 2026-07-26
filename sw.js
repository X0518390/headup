const CACHE_NAME = 'lamb-workbench-v8';
// 相对路径:兼容 GitHub Pages 子路径(/headup/)与 Vercel 根路径部署
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.postMessage({ type: 'NEW_VERSION' })))
  );
  self.clients.claim();
});

// Network-first: 导航请求绕过 HTTP 缓存, 确保拿到最新 HTML (解决 iOS 缓存旧版问题);
// 其它静态资源正常 network-first, 离线时回退缓存。
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// 提醒通知：点击或关闭时，通知页面停止响铃（后台标签页也能关）
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { c.postMessage({ type: 'STOP_ALARM' }); try { await c.focus(); } catch (e) {} }
    if (!all.length) { try { await self.clients.openWindow(new URL('./', self.location).href); } catch (e) {} }
  })());
});
self.addEventListener('notificationclose', event => {
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'STOP_ALARM' });
  })());
});
