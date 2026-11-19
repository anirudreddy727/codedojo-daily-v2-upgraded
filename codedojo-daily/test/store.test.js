'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../lib/store');

test('store serializes concurrent updates without losing records', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codedojo-'));
  const file = path.join(dir, 'community.json');
  const store = createStore(file);
  await Promise.all(Array.from({ length: 40 }, (_, i) => store.transact(db => { db.submissions.push({ id: i }); })));
  const db = await store.read();
  assert.equal(db.submissions.length, 40);
  await fs.rm(dir, { recursive: true, force: true });
});
test('store starts with a valid empty database when no file exists', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codedojo-'));
  const store = createStore(path.join(dir, 'new.json'));
  assert.deepEqual(await store.read(), { teams: [], submissions: [] });
  await fs.rm(dir, { recursive: true, force: true });
});
