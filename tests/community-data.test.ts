import assert from 'node:assert/strict';
import { test } from 'node:test';
import { residents, facilities } from '../src/data';
import { createFixtureRepository } from '../src/lib/repositories/fixtures';
import { getDataSource } from '../src/lib/repositories/config';
import { mapResidentRow, mapFacilityRow, assertSameInterest } from '../src/lib/repositories/supabase';
import { availabilitySchema, interestDraftSchema } from '../src/lib/validation/community';
import type { InterestDraft } from '../src/types/domain';

test('fixture mix and activity roles support the intergenerational demo', () => {
  assert.equal(residents.length, 15);
  assert.equal(new Set(residents.map(r => r.id)).size, 15);
  assert.equal(residents.filter(r => r.participantGroup === 'senior').length, 5);
  assert.equal(residents.filter(r => r.participantGroup === 'young-adult').length, 5);
  assert.equal(residents.filter(r => r.participantGroup === 'family').length, 4);
  assert.equal(residents.filter(r => r.participantGroup === 'adult').length, 1);
  assert(residents.some(r => r.participantGroup === 'senior' && r.intents.some(i => i.role === 'learner')));
  assert(residents.some(r => r.participantGroup === 'young-adult' && r.intents.some(i => i.role === 'teacher')));
  for (const [activity, role] of [['chess', 'learner'], ['cooking', 'teacher'], ['gardening', 'teacher'], ['badminton', 'partner']]) {
    assert(residents.filter(r => r.intents.some(i => i.activity === activity && i.role === role)).length >= 2);
  }
  assert(facilities.every(f => f.isDemo));
});

test('fixture consumers cannot mutate the shared seed data', async () => {
  const repo = createFixtureRepository();
  const first = await repo.listResidents();
  first[0].name = 'Changed';
  assert.notEqual((await repo.listResidents())[0].name, 'Changed');
  await assert.rejects(repo.recordInterest({} as InterestDraft), { code: 'LOCAL_STORAGE_REQUIRED' });
});

test('storage mode rejects typos rather than silently switching data sources', () => {
  assert.equal(getDataSource(undefined), 'fixtures');
  assert.equal(getDataSource('supabase'), 'supabase');
  assert.throws(() => getDataSource('supabse'), { code: 'INVALID_CONFIG' });
});

test('database rows preserve the same typed shape as fixtures', () => {
  const r = residents[0];
  assert.deepEqual(mapResidentRow({ id: r.id, name: r.name, age_range: r.ageRange,
    participant_group: r.participantGroup, block: r.block, languages: r.languages,
    bio: r.bio, intents: r.intents, availability: r.availability, is_demo: true }), r);
  const f = facilities[0];
  assert.deepEqual(mapFacilityRow({ ...f, is_demo: true }), f);
  assert.throws(() => mapResidentRow({ id: 'invalid' }));
});

test('invalid time windows and incomplete interest requests are rejected', () => {
  assert.equal(availabilitySchema.safeParse({ day: 2, start: '20:00', end: '18:00' }).success, false);
  assert.equal(availabilitySchema.safeParse({ day: 8, start: '09:00', end: '10:00' }).success, false);
  assert.equal(interestDraftSchema.safeParse({}).success, false);
});

test('an idempotency key cannot silently change the selected resident', () => {
  const draft: InterestDraft = { clientRequestId: '33333333-3333-4333-8333-000000000001',
    residentId: residents[0].id, suggestedSlot: null,
    request: { name: 'Demo resident', block: '41', participantGroup: 'young-adult',
      criteria: { activity: 'chess', role: 'learner', skill: null, availability: [],
        languagePreference: null, groupPreference: null, clarificationFields: [] } } };
  const existing = { ...draft, id: '44444444-4444-4444-8444-000000000001', createdAt: '2026-09-05T00:00:00Z' };
  assert.doesNotThrow(() => assertSameInterest(existing, draft));
  assert.throws(() => assertSameInterest(existing, { ...draft, residentId: residents[1].id }), { code: 'IDEMPOTENCY_CONFLICT' });
});
