'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore } = require('./lib/store');
const { validateTeam, validateJoin, validateSubmission } = require('./lib/validation');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const store = createStore(path.join(DATA, 'community.json'));
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const buckets = new Map();
const WINDOW_MS = 60_000;
const RATE_LIMIT = 90;

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(payload));
}
function rateLimited(req) {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.start > WINDOW_MS) entry = { start: now, count: 0 };
  entry.count += 1;
  buckets.set(key, entry);
  if (buckets.size > 2000) for (const [ip, item] of buckets) if (now - item.start > WINDOW_MS) buckets.delete(ip);
  return entry.count > RATE_LIMIT;
}
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 16_384) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // CLI clients may omit Origin; browser requests are checked when supplied.
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function createServer(options = {}) {
  const communityStore = options.store || store;
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net; worker-src 'self' blob:");
    if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. Please wait a minute and try again.' });
    let url;
    try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
    catch { return send(res, 400, { error: 'Invalid URL.' }); }

    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, app: 'CodeDojo Daily', version: '2.0.0' });
    if (req.method === 'GET' && url.pathname === '/api/problems') {
      try { return send(res, 200, JSON.parse(await fs.readFile(path.join(DATA, 'problems.json'), 'utf8'))); }
      catch { return send(res, 500, { error: 'Challenge catalogue is unavailable.' }); }
    }
    if (req.method === 'GET' && url.pathname === '/api/community') {
      try { return send(res, 200, await communityStore.read()); }
      catch { return send(res, 500, { error: 'Community data is temporarily unavailable.' }); }
    }
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && !sameOrigin(req)) return send(res, 403, { error: 'Cross-origin request blocked.' });

    try {
      if (req.method === 'POST' && url.pathname === '/api/teams') {
        const checked = validateTeam(await readBody(req));
        if (checked.error) return send(res, 400, { error: checked.error });
        const team = await communityStore.transact(db => {
          if (db.teams.some(t => t.name.toLowerCase() === checked.value.name.toLowerCase())) return null;
          const item = { id: crypto.randomUUID(), ...checked.value, members: [checked.value.captain], createdAt: new Date().toISOString(), solves: 0, streak: 0 };
          db.teams.push(item); return item;
        });
        return team ? send(res, 201, team) : send(res, 409, { error: 'That team name is already taken.' });
      }
      if (req.method === 'POST' && url.pathname === '/api/teams/join') {
        const checked = validateJoin(await readBody(req));
        if (checked.error) return send(res, 400, { error: checked.error });
        const result = await communityStore.transact(db => {
          const team = db.teams.find(t => t.id === checked.value.teamId);
          if (!team) return { status: 404, error: 'Team not found.' };
          if (!team.members.includes(checked.value.member)) {
            if (team.members.length >= 4) return { status: 409, error: 'This squad already has 4 members.' };
            team.members.push(checked.value.member);
          }
          return { team };
        });
        return result.error ? send(res, result.status, { error: result.error }) : send(res, 200, result.team);
      }
      if (req.method === 'POST' && url.pathname === '/api/submissions') {
        const checked = validateSubmission(await readBody(req));
        if (checked.error) return send(res, 400, { error: checked.error });
        const item = await communityStore.transact(db => {
          const record = { id: crypto.randomUUID(), ...checked.value, createdAt: new Date().toISOString() };
          db.submissions.unshift(record); db.submissions = db.submissions.slice(0, 500); return record;
        });
        return send(res, 201, item);
      }
    } catch (error) { return send(res, error.status || 500, { error: error.status ? error.message : 'The request could not be completed.' }); }

    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'API endpoint not found.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'Invalid path.' }); }
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const base = path.resolve(ROOT, 'public');
    const full = path.resolve(base, relative);
    if (full !== base && !full.startsWith(base + path.sep)) return send(res, 403, { error: 'Forbidden.' });
    try {
      const content = await fs.readFile(full);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': path.extname(full) === '.html' ? 'no-cache' : 'public, max-age=3600' });
      return req.method === 'HEAD' ? res.end() : res.end(content);
    } catch { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }); return res.end('Not found'); }
  });
}
if (require.main === module) createServer().listen(PORT, () => console.log(`CodeDojo Daily v2 running at http://localhost:${PORT}`));
module.exports = { createServer };
