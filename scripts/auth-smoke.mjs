import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const origin = process.env.KAKI_TEST_ORIGIN || 'http://127.0.0.1:3100';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Auth smoke checks only run against a local app.');
assert(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY, 'Supabase configuration required.');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const created = [];
function browser() {
  const jar = new Map();
  return async (path, body, method = body ? 'POST' : 'GET', extra = {}) => {
    const response = await fetch(origin + path, { method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Origin: origin, Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; '), ...extra }, body: body ? JSON.stringify(body) : undefined });
    for (const value of response.headers.getSetCookie()) {
      assert(/httponly/i.test(value), 'Auth cookies must be HttpOnly.');
      assert(/samesite=lax/i.test(value), 'Auth cookies must use SameSite=Lax.');
      const first = value.split(';')[0], i = first.indexOf('=');
      if (first.slice(i + 1)) jar.set(first.slice(0, i), first.slice(i + 1)); else jar.delete(first.slice(0, i));
    }
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
    return { status: response.status, data, cache: response.headers.get('cache-control') };
  };
}
try {
  const guest = browser();
  assert.equal((await guest('/api/account')).status, 401);
  assert.equal((await guest('/api/account/interests')).status, 401);
  assert.equal((await guest('/api/auth', { action: 'sign-in', email: 'nobody@example.com', password: 'unused' }, 'POST', { Origin: 'https://other.example' })).status, 403);
  const users = [];
  for (let i = 0; i < 2; i++) {
    const email = `kaki-auth-test-${randomUUID()}@example.com`;
    const password = `Kaki-${randomUUID()}!`;
    // Admin confirmation creates synthetic test users without sending any emails.
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert(!error && data.user, 'Could not create temporary test account.');
    created.push(data.user.id);
    const request = browser();
    assert.equal((await request('/api/auth', { action: 'sign-in', email, password })).status, 200);
    const session = await request('/api/auth/session');
    assert.equal(session.data.user.id, data.user.id);
    assert.equal(session.cache, 'no-store');
    users.push({ id: data.user.id, request });
  }
  const [a, b] = users;
  const profile = { name: 'Temporary auth test', block: '41', participantGroup: 'senior', languages: ['english'], bio: 'Synthetic account; removed after verification.' };
  const saved = await a.request('/api/account', profile, 'PUT');
  if (saved.status === 503 && saved.data.error.code === 'ACCOUNT_DATABASE' && saved.data.error.message.includes('not ready yet')) {
    console.log('Live sign-in, session verification, private cookies, guest denial and cross-site rejection passed. Account SQL still needs to be applied; profile/interest HTTP checks deferred.');
  } else {
    assert.equal(saved.status, 200, 'Profile save should succeed after account SQL setup.');
    assert.deepEqual((await a.request('/api/account')).data.profile, profile);
    assert.equal((await b.request('/api/account')).data.profile, null);
    assert.equal((await a.request('/api/account', { ...profile, id: b.id }, 'PUT')).status, 400);
    const parsed = await a.request('/api/parse', { text: 'I want to learn chess' });
    const criteria = parsed.data;
    const request = { name: profile.name, block: profile.block, participantGroup: profile.participantGroup, criteria };
    const matched = await a.request('/api/matches', request);
    assert.equal(matched.status, 200);
    assert.equal(matched.data.ownerId, a.id);
    const match = matched.data.matches[0];
    assert(match, 'Expected a compatible demo match.');
    const draft = { clientRequestId: randomUUID(), residentId: match.resident.id, request, suggestedSlot: match.suggestedSlot, expectedAccountId: a.id };
    const first = await a.request('/api/interests', draft);
    assert.equal(first.status, 200);
    assert.equal((await a.request('/api/interests', draft)).data.id, first.data.id);
    assert.equal((await b.request('/api/interests', draft)).status, 409);
    assert.equal((await guest('/api/interests', draft)).status, 409);
    assert.equal((await a.request('/api/account/interests')).data.interests.length, 1);
    assert.equal((await b.request('/api/account/interests')).data.interests.length, 0);
    await b.request('/api/account/interests', { id: first.data.id }, 'DELETE');
    assert.equal((await a.request('/api/account/interests')).data.interests.length, 1);
    await a.request('/api/account/interests', { id: first.data.id }, 'DELETE');
    assert.equal((await a.request('/api/account/interests')).data.interests.length, 0);
    console.log('Live account checks passed: profiles, private interest lists, duplicate retries, account switching, forged ownership rejection and owner-only removal.');
  }
  for (const user of users) {
    assert.equal((await user.request('/api/auth', { action: 'sign-out' })).status, 200);
    assert.equal((await user.request('/api/auth/session')).data.user, null);
    assert.equal((await user.request('/api/account')).status, 401);
  }
  console.log('Sign-out and session clearing passed.');
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    assert(!error, `Cleanup failed for temporary test account ${id}`);
  }
  console.log(`Removed ${created.length} temporary accounts. No emails sent.`);
}
