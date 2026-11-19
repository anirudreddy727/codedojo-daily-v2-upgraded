'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTeam, validateJoin, validateSubmission } = require('../lib/validation');

test('team names are trimmed, bounded and validated', () => {
  assert.equal(validateTeam({ name: '  Alpha  ', captain: 'Anirud' }).value.name, 'Alpha');
  assert.match(validateTeam({ name: '<script>' }).error, /unsupported/);
  assert.ok(validateTeam({ name: 'x' }).error);
});
test('joining requires a UUID and a display name', () => {
  assert.ok(validateJoin({ teamId: 'bad', member: 'A' }).error);
  assert.equal(validateJoin({ teamId: '123e4567-e89b-12d3-a456-426614174000', member: 'A' }).value.member, 'A');
});
test('submission counters must be consistent', () => {
  assert.ok(validateSubmission({ problemId: 1, problemTitle: 'Two Sum', passed: 5, total: 2 }).error);
  assert.equal(validateSubmission({ problemId: 1, problemTitle: 'Two Sum', passed: 2, total: 2, accepted: true }).value.accepted, true);
  assert.equal(validateSubmission({ problemId: 1, problemTitle: 'Two Sum', passed: 1, total: 2, accepted: true }).value.accepted, false);
});
