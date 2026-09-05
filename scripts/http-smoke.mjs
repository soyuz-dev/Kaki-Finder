import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const origin = process.env.KAKI_TEST_ORIGIN || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('HTTP smoke tests must target a local app.');
const examples = [
  ["I'm an uncle who wants to teach chess to young people", 'senior'],
  ["I'm a young professional looking for someone to teach me Hokkien cooking", 'young-adult'],
  ['My 8-year-old wants to learn gardening from an experienced neighbor', 'family'],
  ["I'm free Tuesday evenings for badminton with anyone", 'young-adult'],
];
async function post(path, body) {
  const response = await fetch(new URL(path, origin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  return { status: response.status, body: await response.json() };
}

let cleanupClient;
const testIds = [];
try {
  for (const route of ['/', '/results']) assert.equal((await fetch(new URL(route, origin))).status, 200);
  const flows = [];
  for (const [text, participantGroup] of examples) {
    const parsed = await post('/api/parse', { text });
    assert.equal(parsed.status, 200);
    assert.deepEqual(parsed.body.clarificationFields, []);
    const request = { name: 'Kaki HTTP setup check', block: 'DEMO', participantGroup, criteria: parsed.body };
    const result = await post('/api/matches', request);
    assert.equal(result.status, 200);
    assert(result.body.matches.length >= 2 && result.body.matches.length <= 3);
    assert(result.body.matches.every(match => match.suggestedSlot));
    flows.push({ request, result: result.body });
  }
  console.log(`Four example requests returned valid matches in ${flows[0].result.storageMode} mode.`);
  assert.equal((await post('/api/parse', { text: 'x'.repeat(1001) })).status, 400);
  assert.equal((await post('/api/parse', { text: 'x'.repeat(13000) })).status, 413);
  assert.equal((await post('/api/matches', { ...flows[0].request, criteria: { ...flows[0].request.criteria, activity: null } })).status, 400);
  const unknown = await post('/api/parse', { text: 'I want to learn pottery' });
  assert.equal(unknown.body.activity, null);
  const unmatched = await post('/api/matches', { ...flows[0].request, criteria: { ...flows[0].request.criteria, languagePreference: 'tamil', groupPreference: 'young-adult', activity: 'badminton', role: 'partner' } });
  assert.deepEqual(unmatched.body.matches, []);
  const malformed = await fetch(new URL('/api/parse', origin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{', signal: AbortSignal.timeout(15000) });
  assert.equal(malformed.status, 400);

  const flow = flows[0], match = flow.result.matches[0];
  const draft = { clientRequestId: randomUUID(), residentId: match.resident.id, request: flow.request, suggestedSlot: match.suggestedSlot };
  assert.equal((await post('/api/interests', { ...draft, residentId: randomUUID() })).status, 400);
  assert.equal((await post('/api/interests', { ...draft, suggestedSlot: { ...draft.suggestedSlot, facilityId: randomUUID() } })).status, 409);
  if (flow.result.storageMode === 'supabase') {
    const endpoint = new URL(process.env.SUPABASE_URL);
    if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.supabase.co') || !process.env.SUPABASE_SECRET_KEY) throw new Error('Supabase test cleanup is not configured.');
    cleanupClient = createClient(endpoint.href, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    testIds.push(draft.clientRequestId);
    const first = await post('/api/interests', draft);
    assert.equal(first.status, 200);
    assert.equal(first.body.status, 'recorded');
    const second = await post('/api/interests', draft);
    assert.equal(second.status, 200);
    assert.equal(first.body.id, second.body.id);
    assert.equal((await post('/api/interests', { ...draft, request: { ...draft.request, name: 'Different demo selection' } })).status, 409);
    const saved = await cleanupClient.from('interests').select('id', { count: 'exact' }).eq('client_request_id', draft.clientRequestId);
    assert.equal(saved.count, 1);
    console.log('Live interest write, duplicate retry, and conflicting retry checks passed.');
  } else {
    const saved = await post('/api/interests', draft);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.status, 'local-save-required');
    assert.equal(saved.body.id, undefined);
    console.log('Fixture API correctly requires browser-local persistence.');
  }
  assert.equal((await fetch(new URL('/api/interests', origin))).status, 405);
  console.log('Page routes, invalid input, zero matches, forged matches/slots, and private-record access checks passed.');
} finally {
  if (cleanupClient && testIds.length) {
    const { error } = await cleanupClient.from('interests').delete().in('client_request_id', testIds);
    if (error) throw new Error('Could not remove the uniquely identified HTTP test record.');
    console.log('Temporary HTTP test record removed.');
  }
}
