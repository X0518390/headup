// /api/sync — Vercel Serverless Function
// 持久化方案:优先用 Vercel KV;未配置 KV 时退化为 /tmp 文件(仅用于本地测试,生产务必配 KV)
// 前端调用:/api/sync?room=xxx  (GET 拉取 / POST 推送)
// 数据格式:{ ts: 数字时间戳, data: 任意JSON }

const ROOM_RE = /^[a-zA-Z0-9_-]{1,40}$/;

// 尝试加载 Vercel KV(Node 环境下存在 @vercel/kv 才用)
let kv = null;
try {
  // Vercel 自动注入 KV_REST_API_URL / KV_REST_API_TOKEN 环境变量
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = require('@vercel/kv');
  }
} catch (e) {
  // 包未安装,忽略,走文件兜底
  kv = null;
}

const fs = require('fs');
const path = require('path');
const TMP_DIR = path.join('/tmp', 'headup-sync');
try { fs.mkdirSync(TMP_DIR, { recursive: true }); } catch {}

function safeRoom(room) {
  return room && ROOM_RE.test(room) ? room : null;
}

// ---- 存取抽象 ----
async function readRoom(room) {
  if (kv) {
    try {
      const v = await kv.get('room:' + room);
      return v || { ts: 0, data: null };
    } catch (e) {
      return { ts: 0, data: null };
    }
  }
  // 文件兜底
  try {
    const f = path.join(TMP_DIR, room + '.json');
    return JSON.parse(fs.readFileSync(f, 'utf-8')) || { ts: 0, data: null };
  } catch {
    return { ts: 0, data: null };
  }
}

async function writeRoom(room, obj) {
  if (kv) {
    try { await kv.set('room:' + room, obj); } catch (e) {}
    return;
  }
  try {
    const f = path.join(TMP_DIR, room + '.json');
    fs.writeFileSync(f, JSON.stringify(obj));
  } catch {}
}

// ---- 主函数 ----
module.exports = async (req, res) => {
  // CORS(允许任意来源,方便手机直接访问)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.replace(/\/$/, '').endsWith('/api/sync') === false && u.pathname !== '/api/sync') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }

  const room = safeRoom(u.searchParams.get('room'));
  if (!room) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('invalid room');
    return;
  }

  if (req.method === 'GET') {
    const d = await readRoom(room);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(d));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let obj;
    try {
      obj = JSON.parse(body);
      if (!obj || typeof obj.ts !== 'number') throw 'bad';
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bad body');
      return;
    }
    const cur = await readRoom(room);
    let latest;
    if (obj.ts > cur.ts || !cur.data) {
      await writeRoom(room, obj);
      latest = obj;
    } else {
      latest = cur; // 服务端版本更新,客户端应回退
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(latest));
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('method not allowed');
};
