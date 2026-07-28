const CACHE_NAME = 'lamb-workbench-v16';
// 只缓存图标/manifest 等静态资源，绝不缓存 index.html。
// 导航请求一律交给浏览器正常走 CDN，SW 不再拦截 —— 这样 SW 永远不会成为
// "页面打不开" 的原因（避免旧版 no-store 请求失败时无兜底导致白屏死锁）。
const ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // 清掉所有旧缓存，确保旧版 HTML/资源不会残留
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    // 注意：不再对页面做 c.navigate('?swreload=...') 强制跳转，
    // 避免在某些浏览器上造成重复导航/卡死。页面由浏览器正常加载最新 HTML。
  })());
});

function icsEscape(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function pad2(n) { return String(n).padStart(2, '0'); }

function buildIcsFromUrl(url) {
  let p = {};
  try {
    const u = new URL(url);
    u.searchParams.forEach((v, k) => { p[k] = v; });
  } catch (e) { return ''; }
  const now = new Date();
  const dtstamp = '' + now.getUTCFullYear() + pad2(now.getUTCMonth() + 1) + pad2(now.getUTCDate()) + 'T' + pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + 'Z';
  const uid = p.uid || ('memo-' + Date.now() + '@headup');
  const start = p.start || dtstamp;
  const end = p.end || start;
  const summary = icsEscape(p.summary || '⏰ Head up 提醒');
  const desc = icsEscape(p.desc || p.summary || '');
  const urlLine = p.url ? ('URL:' + p.url.replace(/[\r\n]/g, '')) : '';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Head up//Memo//CN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + uid, 'DTSTAMP:' + dtstamp,
    'DTSTART:' + start, 'DTEND:' + end,
    'SUMMARY:' + summary, 'DESCRIPTION:' + desc,
    urlLine,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + summary, 'TRIGGER:-PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // 为移动端日历导入生成真实的 .ics 文件
  try {
    const url = new URL(event.request.url);
    if (url.pathname.endsWith('/reminder.ics')) {
      const ics = buildIcsFromUrl(event.request.url);
      event.respondWith(new Response(ics, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="headup-reminder.ics"',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }));
      return;
    }
  } catch (e) {}

  // 导航请求（打开页面）：不做任何拦截，交给浏览器正常从 CDN 拉取。
  // 绝不 respondWith / fetch，避免 SW 成为页面打不开的单点故障。
  if (event.request.mode === 'navigate') return;

  // 其它静态资源：网络优先，离线时回退缓存
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
