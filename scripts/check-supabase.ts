import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { residents as fixtures, facilities as facilityFixtures } from '../src/data';
import { createSupabaseRepository } from '../src/lib/repositories/supabase';
import { RepositoryError } from '../src/lib/repositories/errors';
import type { InterestDraft } from '../src/types/domain';

async function main() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !secret || !publishable) throw new RepositoryError('MISSING_CONFIG', 'Set the Supabase URL, secret, and publishable key in .env.local.');
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.supabase.co')) {
    throw new RepositoryError('INVALID_CONFIG', 'Use your hosted Supabase HTTPS project URL.');
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new RepositoryError('INVALID_CONFIG', 'The server and public Supabase URLs must match.');
  const options = { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(15000), redirect: 'error' }) } };
  const client = createClient(url, secret, options);
  const repository = createSupabaseRepository(client);
  const residents = await repository.listResidents();
  const facilities = await repository.listFacilities();
  // Only compare our known demo IDs; unrelated future records need not be deleted.
  for (const fixture of fixtures) assert.deepEqual(residents.find(r => r.id === fixture.id), fixture, 'Resident seed differs from fixtures');
  for (const fixture of facilityFixtures) assert.deepEqual(facilities.find(f => f.id === fixture.id), fixture, 'Facility seed differs from fixtures');
  console.log(`Database reads passed: ${residents.length} residents and ${facilities.length} facilities; seeded records match fixtures.`);

  const publicClient = createClient(url, publishable, options);
  for (const table of ['residents', 'facilities', 'interests']) {
    const { data, error } = await publicClient.from(table).select('id').limit(1);
    if (!error || error.code !== '42501' || data !== null) {
      throw new RepositoryError('ACCESS_POLICY_CHECK_FAILED', `Expected direct public access to ${table} to be denied.`);
    }
  }
  console.log('Public table access is denied as intended.');

  if (!process.argv.includes('--write-test')) return;
  const clientRequestId = randomUUID();
  const draft: InterestDraft = {
    clientRequestId, residentId: fixtures[0].id, suggestedSlot: null,
    request: { name: 'Kaki Finder setup check', block: 'DEMO', participantGroup: 'young-adult',
      criteria: { activity: 'chess', role: 'learner', skill: null, availability: [],
        languagePreference: null, groupPreference: null, clarificationFields: [] } },
  };
  try {
    const first = await repository.recordInterest(draft);
    const second = await repository.recordInterest(draft);
    assert.equal(first.id, second.id, 'A duplicate save created another row');
    const saved = await client.from('interests').select('id', { count: 'exact' }).eq('client_request_id', clientRequestId);
    assert.equal(saved.count, 1);
    console.log('Interest write and duplicate protection passed.');
  } finally {
    // Remove only this uniquely identified test row, even if a later check fails.
    const { error } = await client.from('interests').delete().eq('client_request_id', clientRequestId);
    if (error) throw new RepositoryError('CLEANUP_FAILED', 'The temporary setup-check row could not be removed.');
    console.log('Temporary setup-check row removed.');
  }
}

main().catch(error => {
  if (error instanceof RepositoryError) console.error(`${error.code}: ${error.message}`);
  else console.error('Verification failed. Check schema/seed parity and connectivity; no keys or private records were logged.');
  process.exitCode = 1;
});
