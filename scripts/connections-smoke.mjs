import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const origin = process.env.KAKI_TEST_ORIGIN || 'http://127.0.0.1:3100';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use a local app for verification.');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
const directoryIds = [];
function browser() {
  const jar = new Map();
  return async (path, body, method = body ? 'POST' : 'GET', headers = {}) => {
    const response = await fetch(origin + path, { method, headers: { Origin: origin, Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; '), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    for (const cookie of response.headers.getSetCookie()) {
      const first = cookie.split(';')[0], equals = first.indexOf('=');
      if (first.slice(equals + 1)) jar.set(first.slice(0, equals), first.slice(equals + 1)); else jar.delete(first.slice(0, equals));
    }
    return { status: response.status, body: await response.json() };
  };
}
try {
  const guest = browser();
  assert.equal((await guest('/api/connections')).status, 401);
  assert.equal((await guest('/api/connections', {})).status, 401);
  for (let i = 0; i < 3; i++) {
    const email = `kaki-connections-${randomUUID()}@example.com`, password = `Kaki-${randomUUID()}!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert(!error && data.user, 'Could not create temporary test account.');
    const account = { id: data.user.id, request: browser() }; users.push(account);
    assert.equal((await account.request('/api/auth', { action: 'sign-in', email, password })).status, 200);
  }
  const [a, b, c] = users;
  const initial = await a.request('/api/connections');
  assert.equal(initial.status, 200, 'Apply the connection request migration before running this check.');
  assert.equal(initial.body.connections.length, 0);
  const skill = `verification-${randomUUID()}`;
  const profile = { name: 'Temporary connection recipient', block: '43', participantGroup: 'senior', languages: ['english'], bio: 'Temporary automated verification profile.', discoverable: true,
    intents: [{ activity: 'chess', role: 'teacher', skill }], availability: [2,4,6,7].map(day => ({ day, start: day < 6 ? '18:00' : '09:00', end: day < 6 ? '21:00' : '12:00' })) };
  assert.equal((await b.request('/api/account', profile, 'PUT')).status, 200);
  const target = await admin.from('residents').select('id').eq('owner_id', b.id).single();
  assert(target.data, 'Published test profile missing.'); directoryIds.push(target.data.id);
  const request = { name: 'Temporary connection sender', block: '41', participantGroup: 'young-adult', criteria: { activity: 'chess', role: 'learner', skill, availability: [], languagePreference: null, groupPreference: null, clarificationFields: [] } };
  const matches = await a.request('/api/matches', request);
  assert.equal(matches.status, 200);
  const match = matches.body.matches.find(m => m.resident.id === target.data.id);
  assert(match, 'Test neighbour should be matched.');
  const draft = { clientRequestId: randomUUID(), residentId: target.data.id, request, suggestedSlot: match.suggestedSlot, expectedAccountId: a.id };
  assert.equal((await guest('/api/connections', draft)).status, 401);
  assert.equal((await a.request('/api/connections', draft, 'POST', { Origin: 'https://other.example' })).status, 403);
  assert.equal((await b.request('/api/connections', { ...draft, expectedAccountId: b.id })).status, 409);
  assert.equal((await a.request('/api/connections', { ...draft, residentId: '11111111-1111-4111-8111-000000000001' })).status, 409);
  assert.equal((await a.request('/api/connections', { ...draft, expectedAccountId: c.id })).status, 409);
  // Intentionally concurrent: the feature must prevent duplicate sends across tabs.
  const retries = await Promise.all([a.request('/api/connections', draft), a.request('/api/connections', draft)]);
  assert(retries.every(r => r.status === 200), 'Concurrent identical sends should both succeed.');
  const id = retries[0].body.connection.id;
  assert.equal(retries[1].body.connection.id, id);
  assert.equal((await a.request('/api/connections', { ...draft, clientRequestId: randomUUID() })).status, 409);
  assert.equal((await a.request('/api/connections', { ...draft, request: { ...request, name: 'Changed' } })).status, 409);
  const incoming = await b.request('/api/connections');
  assert.equal(incoming.body.connections.length, 1);
  assert.equal(incoming.body.connections[0].direction, 'incoming');
  assert.equal(incoming.body.connections[0].senderName, request.name);
  assert.equal(incoming.body.connections[0].suggestedSlot.facilityId, match.suggestedSlot.facilityId);
  for (const key of ['sender_id','recipient_id','email','block','availability']) assert.equal(key in incoming.body.connections[0], false);
  assert.equal((await c.request('/api/connections')).body.connections.length, 0);
  assert.equal((await a.request('/api/account/interests')).body.interests.length, 0, 'Requests should not create duplicate private interest saves.');
  const respond = (account, targetId, status) => account.request('/api/connections', { id: targetId, status, expectedAccountId: account.id }, 'PATCH');
  assert.equal((await respond(a, id, 'accepted')).status, 403);
  assert.equal((await respond(c, id, 'accepted')).status, 403);
  assert.equal((await respond(b, id, 'cancelled')).status, 409);
  assert.equal((await b.request('/api/connections', { id, status: 'accepted', expectedAccountId: a.id }, 'PATCH')).status, 409);
  assert.equal((await respond(b, id, 'accepted')).body.connection.status, 'accepted');
  assert.equal((await respond(b, id, 'accepted')).status, 200);
  assert.equal((await respond(b, id, 'declined')).status, 409);
  assert.equal((await a.request('/api/connections')).body.connections[0].status, 'accepted');
  assert.equal((await respond(a, id, 'cancelled')).body.connection.status, 'cancelled');
  assert.equal((await respond(b, id, 'accepted')).status, 409);
  const second = await a.request('/api/connections', { ...draft, clientRequestId: randomUUID() });
  assert.equal(second.status, 200);
  const secondId = second.body.connection.id;
  const conflict = await Promise.all([respond(b, secondId, 'accepted'), respond(b, secondId, 'declined')]);
  assert.deepEqual(conflict.map(r => r.status).sort(), [200,409]);
  if (conflict.find(r => r.status === 200).body.connection.status === 'accepted') await respond(b, secondId, 'cancelled');
  const third = await a.request('/api/connections', { ...draft, clientRequestId: randomUUID() });
  assert.equal(third.status, 200);
  assert.equal((await respond(a, third.body.connection.id, 'cancelled')).status, 200);
  assert.equal((await respond(b, third.body.connection.id, 'accepted')).status, 409);
  const fourth = await a.request('/api/connections', { ...draft, clientRequestId: randomUUID() });
  assert.equal(fourth.status, 200);
  assert.equal((await respond(b, fourth.body.connection.id, 'declined')).body.connection.status, 'declined');
  assert.equal((await b.request('/api/account', { ...profile, discoverable: false }, 'PUT')).status, 200);
  assert.equal((await a.request('/api/connections', { ...draft, clientRequestId: randomUUID() })).status, 409);
  assert.equal((await b.request('/api/connections')).body.connections.length, 4);
  console.log('Live connections passed: sender/recipient inboxes, private fields, duplicate retries, cross-site/account checks, accept/decline, withdrawal, cancellation, conflicting responses and hiding.');
} finally {
  for (const user of users) {
    const { data } = await admin.from('residents').select('id').eq('owner_id', user.id);
    for (const row of data || []) if (!directoryIds.includes(row.id)) directoryIds.push(row.id);
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    assert(!error, `Cleanup failed for temporary account ${user.id}`);
  }
  for (const id of directoryIds) {
    const { error } = await admin.from('residents').delete().eq('id', id).eq('is_active', false).is('owner_id', null);
    assert(!error || error.code === '23503', 'Could not clean synthetic directory row.');
  }
  console.log(`Removed ${users.length} temporary accounts and their requests. No emails sent.`);
}
