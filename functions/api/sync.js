// Cloudflare Pages Functions — /api/sync
// 路由:/api/sync?room=xxx  (GET 拉取 / POST 推送)
// 存储:Cloudflare KV(变量绑定名 HEADUP_KV,需在 Cloudflare 控制台绑定)
// 数据格式:{ ts: 数字时间戳, data: 任意JSON }
//
// 未绑定 KV 时自动降级:返回 {ts:0,data:null},前端走本地存储兜底,绝不崩溃。

const ROOM_RE = /^[a-zA-Z0-9_-]{1,40}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const room = url.searchParams.get('room');
  if (!room || !ROOM_RE.test(room)) {
    return new Response('invalid room', { status: 400, headers: CORS });
  }

  const kv = env.HEADUP_KV;
  if (!kv) {
    // 未绑定 KV:降级,前端本地存储兜底
    return new Response(JSON.stringify({ ts: 0, data: null, note: 'kv-not-bound' }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const key = 'room:' + room;

  if (request.method === 'GET') {
    const raw = await kv.get(key);
    const obj = raw ? JSON.parse(raw) : { ts: 0, data: null };
    return new Response(JSON.stringify(obj), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
      if (!body || typeof body.ts !== 'number') throw new Error('bad');
    } catch {
      return new Response('bad body', { status: 400, headers: CORS });
    }
    const curRaw = await kv.get(key);
    const cur = curRaw ? JSON.parse(curRaw) : { ts: 0, data: null };
    let latest;
    if (body.ts > cur.ts || !cur.data) {
      await kv.put(key, JSON.stringify(body));
      latest = body;
    } else {
      latest = cur; // 服务端更新,客户端回退
    }
    return new Response(JSON.stringify(latest), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return new Response('method not allowed', { status: 405, headers: CORS });
}
