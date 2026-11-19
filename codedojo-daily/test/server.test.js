'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');
const { createStore } = require('../lib/store');

test('API applies security headers and validates writes end-to-end', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codedojo-api-'));
  const server = createServer({ store: createStore(path.join(dir, 'community.json')) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.ok(health.headers.get('content-security-policy'));

  const bad = await fetch(`${base}/api/teams`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.example' }, body: JSON.stringify({ name: 'Team' }) });
  assert.equal(bad.status, 403);

  const created = await fetch(`${base}/api/teams`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Alpha', captain: 'Anirud' }) });
  assert.equal(created.status, 201);
  const team = await created.json();
  const joined = await fetch(`${base}/api/teams/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ teamId: team.id, member: 'Teammate' }) });
  assert.equal(joined.status, 200);
  const submission = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ problemId: 1, problemTitle: 'Two Sum', passed: 1, total: 2, accepted: true }) });
  assert.equal(submission.status, 201);
  assert.equal((await submission.json()).accepted, false);
});
