// Global counter for Gnome, Line & Sinker: a Cloudflare Worker with a D1 database.
//
//   POST /report  { id, fish, casts, junk, titan, deep }  deltas since the last report
//   GET  /stats   { players, fish, casts, junk, titan, deep, at }
//
// Players are a random id made by the game (no account, no personal data). Every report is
// clamped by the time since that player's last report, so a tampered client can only add what a
// very fast real player could, and reports closer than MIN_GAP seconds are ignored.
// Deploy: see server/README.md.

const MIN_GAP = 50;                 // seconds between accepted reports per player
const PER_SEC = { fish: 6, casts: 0.5, junk: 2, titan: 0.01 }; // generous upper bounds per second
const MAX_GAP = 6 * 3600;           // clamp window (offline time does not earn catches)
const KEYS = ['fish', 'casts', 'junk', 'titan'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

async function stats(env) {
  const rows = await env.DB.prepare('SELECT k, v FROM totals').all();
  const out = { players: 0, fish: 0, casts: 0, junk: 0, titan: 0, deep: 0 };
  for (const r of rows.results) out[r.k] = r.v;
  out.at = Date.now();
  return out;
}

async function report(req, env) {
  let b;
  try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const id = typeof b.id === 'string' && /^[a-z0-9]{12,40}$/.test(b.id) ? b.id : null;
  if (!id) return json({ error: 'bad id' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const p = await env.DB.prepare('SELECT last FROM players WHERE id = ?').bind(id).first();
  const stmts = [];
  let gap = MAX_GAP;
  if (!p) {
    stmts.push(env.DB.prepare('INSERT INTO players (id, first, last) VALUES (?, ?, ?)').bind(id, now, now));
    stmts.push(env.DB.prepare("INSERT INTO totals (k, v) VALUES ('players', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1"));
    gap = 600; // a brand new id can only bring ten minutes of play
  } else {
    gap = Math.min(MAX_GAP, now - p.last);
    if (gap < MIN_GAP) return json({ ok: false, wait: MIN_GAP - gap }, 429);
    stmts.push(env.DB.prepare('UPDATE players SET last = ? WHERE id = ?').bind(now, id));
  }
  for (const k of KEYS) {
    const n = Math.max(0, Math.min(Math.floor(Number(b[k]) || 0), Math.ceil(PER_SEC[k] * gap)));
    if (n > 0) stmts.push(env.DB.prepare('INSERT INTO totals (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = v + excluded.v').bind(k, n));
  }
  // deepest dive anyone has reported (the game caps it by the deepest line it can have)
  const deep = Math.max(0, Math.min(Math.floor(Number(b.deep) || 0), 20000));
  if (deep > 0) stmts.push(env.DB.prepare("INSERT INTO totals (k, v) VALUES ('deep', ?) ON CONFLICT(k) DO UPDATE SET v = MAX(v, excluded.v)").bind(deep));
  await env.DB.batch(stmts);
  return json({ ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      if (url.pathname === '/stats' && req.method === 'GET') return json(await stats(env), 200, { 'Cache-Control': 'public, max-age=60' });
      if (url.pathname === '/report' && req.method === 'POST') return await report(req, env);
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server' }, 500);
    }
  },
};
