import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createApp } from '../server.js';
import { generatePassword, passwordProblem } from '../src/auth.js';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('generated bootstrap and temporary passwords always meet login password rules', () => {
  for (const length of [10, 14, 16]) {
    for (let i = 0; i < 1000; i++) {
      const password = generatePassword(length);
      assert.equal(password.length, length);
      assert.equal(passwordProblem(password), '');
    }
  }
});

test('result permissions, review lifecycle, persistence and public medal integration', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'pw50-results-test-'));
  let app = createApp({ dataDir, adminPassword: 'Start12345', publicOrigin: 'http://localhost:5500', quiet: true });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  let base = `http://127.0.0.1:${app.server.address().port}`;
  const client = () => {
    let cookie = '';
    return async (method, path, body, expected = 200, extraHeaders = {}) => {
      const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', Cookie: cookie, ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
      const result = await res.json();
      assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    };
  };
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    app.db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });
  const admin = client(), tech = client(), reviewer = client(), other = client(), anonymous = client();
  const initial = await admin('POST', '/api/login', { username: 'admin', password: 'Start12345' });
  const [s1, s2] = initial.sports;
  const [school1, school2] = initial.schools;
  let staff, inspector, outsider;
  const change = async (request, username, password) => {
    await request('POST', '/api/login', { username, password });
    await request('POST', '/api/password', { current: password, next: `New${password}9` });
  };
  await t.test('first login requires password change and CSRF/origin checks', async () => {
    await admin('GET', '/api/users', undefined, 403);
    await anonymous('GET', '/api/matches', undefined, 401);
    await admin('POST', '/api/password', { current: 'Start12345', next: 'Admin12345' }, 403, { Origin: 'https://other.example' });
    await admin('POST', '/api/password', { current: 'Start12345', next: 'Admin12345' });
    staff = await admin('POST', '/api/users', { username: 'tech', display_name: 'ผู้กรอก', assignments: [{ sport_id: s1.id, permission: 'technician' }] });
    inspector = await admin('POST', '/api/users', { username: 'review', display_name: 'ผู้ตรวจ', assignments: [{ sport_id: s1.id, permission: 'reviewer' }] });
    outsider = await admin('POST', '/api/users', { username: 'other', display_name: 'กีฬาอื่น', assignments: [{ sport_id: s2.id, permission: 'technician' }] });
    await change(tech, staff.username, staff.password);
    await change(reviewer, inspector.username, inspector.password);
    await change(other, outsider.username, outsider.password);
    await tech('GET', '/api/users', undefined, 403);
    await tech('POST', '/api/users', { username: 'admin2' }, 403);
  });
  await t.test('admin can update personal name separately from sport assignment', async () => {
    await admin('PUT', `/api/users/${staff.id}`, { display_name: 'สมชาย ใจดี', active: true, assignments: [{ sport_id: s1.id, permission: 'technician' }] });
    await tech('GET', '/api/me', undefined, 401);
    await tech('POST', '/api/login', { username: staff.username, password: `New${staff.password}9` });
    const profile = await tech('GET', '/api/me');
    assert.equal(profile.user.display_name, 'สมชาย ใจดี');
    assert.equal(profile.assignments[0].sport_id, s1.id);
    await admin('PUT', `/api/users/${staff.id}`, { display_name: ' ', active: true, assignments: [] }, 400);
  });
  const body = {
    code: 'MATCH-01', sportId: s1.id, level: 'm', name: 'ชิงชนะเลิศ', date: '2027-12-18', time: '09:00', stadium: 'สนาม 1', round: 'ชิงชนะเลิศ', group: '',
    results: [{ school: school1.nameTh, player: 'ทีม A', result: '', stat: '', medal: 'ทอง' }, { school: school2.nameTh, player: 'ทีม B', result: '1', stat: '', medal: 'เงิน' }],
  };
  await t.test('timetable stores duration and category; empty schedules and activities cannot be submitted', async () => {
    const planned = await tech('POST', '/api/matches', { ...body, code: 'PLAN-01', endTime: '09:50', category: 'เดี่ยว', note: '50 นาที + 1 end', results: [] });
    assert.equal(planned.endTime, '09:50');
    assert.equal(planned.category, 'เดี่ยว');
    assert.equal(planned.note, '50 นาที + 1 end');
    await tech('POST', `/api/matches/${planned.id}/submit`, { version: planned.version }, 400);
    await tech('POST', '/api/matches', { ...body, code: 'BAD-TIME', endTime: '08:00' }, 400);
    await tech('POST', '/api/matches', { ...body, code: 'BAD-TIME-2', endTime: '24:00' }, 400);
    const activity = await tech('POST', '/api/matches', { ...body, code: 'BREAK-01', kind: 'activity', name: 'พักกลางวัน', endTime: '10:00', results: [] });
    assert.equal(activity.kind, 'activity');
    await tech('POST', `/api/matches/${activity.id}/submit`, { version: activity.version }, 400);
    await tech('POST', '/api/matches', { ...body, code: 'BAD-ACTIVITY', kind: 'activity' }, 400);
    await other('GET', `/api/matches/${activity.id}`, undefined, 403);
    assert.deepEqual(await anonymous('GET', '/api/public/results'), { matches: [], results: [] });
  });
  let row;
  await t.test('sport permissions and draft privacy', async () => {
    await tech('POST', '/api/matches', { ...body, sportId: s2.id }, 403);
    await reviewer('POST', '/api/matches', body, 403);
    row = await tech('POST', '/api/matches', body);
    await tech('POST', '/api/matches', { ...body, code: 'match-01' }, 409);
    await other('GET', `/api/matches/${row.id}`, undefined, 403);
    await other('GET', `/api/matches/${row.id}/history`, undefined, 403);
    await other('PUT', `/api/matches/${row.id}`, { ...body, version: row.version }, 403);
    assert.equal((await other('GET', '/api/matches')).matches.length, 0);
    assert.deepEqual(await anonymous('GET', '/api/public/results'), { matches: [], results: [] });
    await tech('POST', `/api/matches/${row.id}/submit`, { version: row.version }, 400);
  });
  await t.test('validation, pending locks and stale writes', async () => {
    await tech('PUT', `/api/matches/${row.id}`, { ...body, version: row.version, date: '2027-02-30' }, 400);
    await tech('PUT', `/api/matches/${row.id}`, { ...body, version: row.version, results: [{ ...body.results[0], school: 'Unknown' }] }, 400);
    body.results[0].result = '2';
    row = await tech('PUT', `/api/matches/${row.id}`, { ...body, version: row.version });
    await tech('POST', `/api/matches/${row.id}/submit`, { version: row.version - 1 }, 409);
    await tech('POST', `/api/matches/${row.id}/submit`, { version: row.version });
    row = await tech('GET', `/api/matches/${row.id}`);
    await tech('PUT', `/api/matches/${row.id}`, { ...body, version: row.version }, 409);
    await tech('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'approve' }, 403);
    await other('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'approve' }, 403);
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'return', note: '' }, 400);
  });
  await t.test('return, correction, approval and public data minimization', async () => {
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'return', note: 'ตรวจคะแนนอีกครั้ง' });
    row = await tech('GET', `/api/matches/${row.id}`);
    assert.equal(row.reviewNote, 'ตรวจคะแนนอีกครั้ง');
    assert.equal(row.status, 'returned');
    row = await tech('PUT', `/api/matches/${row.id}`, { ...body, version: row.version });
    await tech('POST', `/api/matches/${row.id}/submit`, { version: row.version });
    row = await reviewer('GET', `/api/matches/${row.id}`);
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'approve', note: 'ถูกต้อง' });
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'approve' }, 409);
    row = await tech('GET', `/api/matches/${row.id}`);
    assert.equal(row.status, 'approved');
    const feed = await anonymous('GET', '/api/public/results');
    assert.equal(feed.matches.length, 1);
    assert.equal(feed.results[0].result, '2');
    assert.equal(feed.results[0].medal, 'ทอง');
    assert.ok(!JSON.stringify(feed).includes('submittedBy'));
    assert.ok(!JSON.stringify(feed).includes('reviewNote'));
    assert.ok(!JSON.stringify(feed).includes('ถูกต้อง'));
  });
  await t.test('published revision stays stable while a correction is drafted and returned', async () => {
    body.results[0].result = '3';
    row = await tech('PUT', `/api/matches/${row.id}`, { ...body, version: row.version });
    assert.equal(row.status, 'draft');
    assert.equal(row.published, true);
    assert.equal((await anonymous('GET', '/api/public/results')).results[0].result, '2');
    await tech('POST', `/api/matches/${row.id}/submit`, { version: row.version });
    row = await reviewer('GET', `/api/matches/${row.id}`);
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'return', note: 'ยืนยันสกอร์ใหม่' });
    assert.equal((await anonymous('GET', '/api/public/results')).results[0].result, '2');
    row = await tech('GET', `/api/matches/${row.id}`);
    await tech('POST', `/api/matches/${row.id}/submit`, { version: row.version });
    row = await reviewer('GET', `/api/matches/${row.id}`);
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'approve' });
    assert.equal((await anonymous('GET', '/api/public/results')).results[0].result, '3');
  });
  await t.test('website uses approved feed for scores, dates, sport IDs and medals', async () => {
    const feed = await anonymous('GET', '/api/public/results');
    const store = new Map();
    const window = { SiteConfig: { resultsFeed: `${base}/api/public/results`, api: { timeoutMs: 3000 }, sheet: {} }, SiteData: { sports: initial.sports, institutions: initial.schools } };
    const context = { window, location: { href: 'http://localhost:5500/' }, URL, AbortSignal, fetch: async () => ({ ok: true, json: async () => feed }), sessionStorage: { getItem: (k) => store.get(k), setItem: (k,v) => store.set(k,v) } };
    vm.runInNewContext(readFileSync(join(siteRoot, 'js/api.js'), 'utf8'), context);
    const matches = await window.Api.getAllMatches();
    assert.equal(matches[0].sportId, s1.apiId);
    assert.equal(matches[0].gameDate, '18 ธันวาคม 2570');
    assert.equal(matches[0].results[0].gameResult, '3');
    const medals = await window.Api.getMedalEntries();
    assert.equal(medals.length, 2);
    assert.equal(medals[0].kind, 'gold');
    assert.equal(medals[0].school, school1.nameTh);
    assert.equal(medals[0].level, 'm');
    const table = await window.Api.getMedalTable('m');
    assert.ok(JSON.stringify(table).includes(school1.nameTh));
  });
  await t.test('withdrawal, audit snapshots and rejection of stale approval', async () => {
    row = await reviewer('GET', `/api/matches/${row.id}`);
    await tech('POST', `/api/matches/${row.id}/withdraw`, { version: row.version, note: 'ถอน' }, 403);
    await reviewer('POST', `/api/matches/${row.id}/withdraw`, { version: row.version, note: '' }, 400);
    await reviewer('POST', `/api/matches/${row.id}/withdraw`, { version: row.version, note: 'ตรวจสอบหลักฐานใหม่' });
    assert.equal((await anonymous('GET', '/api/public/results')).matches.length, 0);
    await reviewer('POST', `/api/matches/${row.id}/review`, { version: row.version, action: 'approve' }, 409);
    const history = (await reviewer('GET', `/api/matches/${row.id}/history`)).history;
    assert.equal(history[0].action, 'withdrawn');
    assert.ok(history.some((h) => h.action === 'approved' && h.detail.payload.results[0].result === '3'));
  });
  await t.test('admin cannot approve own submission, and assignment changes invalidate access', async () => {
    const own = await admin('POST', '/api/matches', { ...body, code: 'ADMIN-01' });
    await admin('POST', `/api/matches/${own.id}/submit`, { version: own.version });
    const pending = await admin('GET', `/api/matches/${own.id}`);
    await admin('POST', `/api/matches/${own.id}/review`, { version: pending.version, action: 'approve' }, 403);
    await admin('PUT', `/api/users/${staff.id}`, { active: true, assignments: [{ sport_id: s2.id, permission: 'technician' }] });
    await tech('GET', '/api/matches', undefined, 401);
    await tech('POST', '/api/login', { username: staff.username, password: `New${staff.password}9` });
    await tech('GET', `/api/matches/${row.id}`, undefined, 403);
    await admin('PUT', `/api/users/${staff.id}`, { active: false, assignments: [] });
    await tech('POST', '/api/login', { username: staff.username, password: `New${staff.password}9` }, 401);
    const reset = await admin('POST', `/api/users/${inspector.id}/reset`);
    await reviewer('GET', '/api/matches', undefined, 401);
    await reviewer('POST', '/api/login', { username: inspector.username, password: reset.password });
    await reviewer('GET', '/api/matches', undefined, 403);
  });
  await t.test('CORS limited to public GET and configured site; static files are isolated', async () => {
    const publicRes = await fetch(`${base}/api/public/results`, { headers: { Origin: 'http://localhost:5500' } });
    assert.equal(publicRes.headers.get('access-control-allow-origin'), 'http://localhost:5500');
    const privateRes = await fetch(`${base}/api/me`, { headers: { Origin: 'http://localhost:5500' } });
    assert.equal(privateRes.headers.get('access-control-allow-origin'), null);
    const badOrigin = await fetch(`${base}/api/public/results`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(badOrigin.headers.get('access-control-allow-origin'), null);
    assert.equal((await fetch(`${base}/src/db.js`)).status, 404);
    assert.equal((await fetch(`${base}/site/js/data/institutions.js`)).status, 404);
    assert.equal((await fetch(`${base}/site/assets/fonts/srinakharinwirot-regular.woff`)).status, 200);
    assert.equal((await fetch(base)).status, 200);
  });
  await t.test('database persists after restarting server', async () => {
    const count = app.db.prepare('SELECT count(*) AS n FROM audit_log').get().n;
    await new Promise((resolve) => app.server.close(resolve));
    app.db.close();
    app = createApp({ dataDir, quiet: true });
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
    assert.equal(app.db.prepare('SELECT count(*) AS n FROM audit_log').get().n, count);
    assert.equal((await anonymous('GET', '/api/public/results')).matches.length, 0);
    assert.equal(app.db.prepare('SELECT status FROM matches WHERE id=?').get(row.id).status, 'returned');
  });
});
