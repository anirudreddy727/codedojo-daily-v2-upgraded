'use strict';
const cleanText = (value, max = 80) => typeof value === 'string' ? value.trim().slice(0, max) : '';
function validateTeam(body) {
  const name = cleanText(body?.name, 28);
  const captain = cleanText(body?.captain, 28) || 'Guest';
  if (name.length < 2) return { error: 'Choose a team name with at least 2 characters.' };
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) return { error: 'Team name contains unsupported characters.' };
  return { value: { name, captain } };
}
function validateJoin(body) {
  const teamId = cleanText(body?.teamId, 64);
  const member = cleanText(body?.member, 28);
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return { error: 'Choose a valid team.' };
  if (member.length < 1) return { error: 'Enter a display name.' };
  return { value: { teamId, member } };
}
function validateSubmission(body) {
  const problemId = Number(body?.problemId);
  const passed = Number(body?.passed);
  const total = Number(body?.total);
  const title = cleanText(body?.problemTitle, 80);
  const user = cleanText(body?.user, 28) || 'Guest';
  if (!Number.isSafeInteger(problemId) || problemId < 1 || !Number.isInteger(passed) || !Number.isInteger(total) || total < 1 || passed < 0 || passed > total) return { error: 'Submission data is invalid.' };
  if (!title) return { error: 'Challenge title is required.' };
  return { value: { user, problemId, problemTitle: title, passed, total, accepted: body?.accepted === true && passed === total } };
}
module.exports = { cleanText, validateTeam, validateJoin, validateSubmission };
