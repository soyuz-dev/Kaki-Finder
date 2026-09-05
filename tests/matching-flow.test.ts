import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRequest } from '../src/features/parser/parse-request';
import { bridgeScore, findMatches } from '../src/features/matching/find-matches';
import { suggestSlot, validateSlot } from '../src/features/scheduling/schedule';
import { residents, facilities } from '../src/data';
import { REQUEST_EXAMPLES } from '../src/lib/constants';
import { confirmedMatchRequestSchema } from '../src/lib/validation/community';
import type { MatchRequest, ParticipantGroup } from '../src/types/domain';

const now = new Date('2026-09-05T00:30:00Z'); // Saturday 08:30 SGT.
const request = (text: string, participantGroup: ParticipantGroup = 'young-adult'): MatchRequest => ({
  name: 'Demo visitor', block: '43', participantGroup, criteria: parseRequest(text),
});

test('the four supplied requests extract compatible roles and activities', () => {
  const cases = [
    ['chess', 'teacher', 'senior'], ['cooking', 'learner', 'young-adult'],
    ['gardening', 'learner', 'family'], ['badminton', 'partner', 'young-adult'],
  ] as const;
  REQUEST_EXAMPLES.forEach((text, index) => {
    const input = request(text, cases[index][2]);
    assert.equal(input.criteria.activity, cases[index][0]);
    assert.equal(input.criteria.role, cases[index][1]);
    assert.deepEqual(input.criteria.clarificationFields, []);
    const matches = findMatches(input, residents, facilities, now);
    assert(matches.length >= 2 && matches.length <= 3);
    assert(matches.every(match => match.suggestedSlot));
  });
  assert.equal(parseRequest(REQUEST_EXAMPLES[0]).groupPreference, 'young-adult');
  assert.equal(parseRequest(REQUEST_EXAMPLES[1]).skill, 'hokkien cooking');
  assert.equal(parseRequest(REQUEST_EXAMPLES[1]).languagePreference, null);
  assert.deepEqual(parseRequest(REQUEST_EXAMPLES[3]).availability, [{ day: 2, start: '18:00', end: '21:00' }]);
});

test('teaching direction and declared age remain independent', () => {
  assert.equal(parseRequest('Teach me chess').role, 'learner');
  assert.equal(parseRequest('I want to teach chess to young people').role, 'teacher');
  const input = request('I am a senior looking to learn chess', 'senior');
  assert.equal(input.criteria.groupPreference, null);
  const matches = findMatches(input, residents, facilities, now);
  assert.equal(matches[0].resident.name, 'Nur Aisyah');
  assert.equal(matches[0].bridgeScore, 100);
  assert.equal(matches[1].resident.name, 'Tan Ah Seng');
  assert.equal(matches[1].bridgeScore, 40);
});

test('availability handles separate days, time ranges, and reviewable ambiguities', () => {
  assert.deepEqual(parseRequest('Badminton Tuesday evening and Saturday morning').availability,
    [{ day: 2, start: '18:00', end: '21:00' }, { day: 6, start: '09:00', end: '12:00' }]);
  assert.deepEqual(parseRequest('Badminton Tuesday 6-8pm').availability, [{ day: 2, start: '18:00', end: '20:00' }]);
  assert.deepEqual(parseRequest('Badminton Saturday 10-2pm').availability, [{ day: 6, start: '10:00', end: '14:00' }]);
  assert.equal(parseRequest('Badminton weekday evenings').availability.length, 5);
  for (const text of ['Badminton tomorrow', 'Badminton not Tuesday', 'Badminton after 6pm', 'Badminton Tuesday morning and evening']) {
    assert(parseRequest(text).clarificationFields.includes('availability'));
    assert.equal(confirmedMatchRequestSchema.safeParse(request(text)).success, false);
  }
});

test('unknown and multiple activities ask for confirmation', () => {
  assert.equal(parseRequest('I would like to learn pottery').activity, null);
  assert.equal(parseRequest('I want to learn chess and cooking').activity, null);
  assert.equal(confirmedMatchRequestSchema.safeParse(request('I want to learn pottery')).success, false);
});

test('explicit generation, language, and skill restrictions are respected', () => {
  const input = request('I want to learn chess from a senior in Mandarin');
  const matches = findMatches(input, residents, facilities, now);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].resident.name, 'Tan Ah Seng');
  assert.equal(findMatches(request('Badminton in Tamil'), residents, facilities, now).length, 0);
  assert.equal(findMatches(request('I want to learn French cooking'), residents, facilities, now).length, 0);
});

test('bridge score prioritises cross-generation pairing and is symmetric', () => {
  assert.equal(bridgeScore('senior', 'family'), 100);
  assert.equal(bridgeScore('family', 'senior'), 100);
  assert.equal(bridgeScore('adult', 'young-adult'), 70);
  assert.equal(bridgeScore('family', 'family'), 40);
  const matches = findMatches(request(REQUEST_EXAMPLES[2], 'family'), residents, facilities, now);
  assert.equal(matches[0].resident.name, 'Abdul Rahman');
});

test('Singapore scheduling suggests a future shared hour and does not invent availability', () => {
  const input = request(REQUEST_EXAMPLES[3]);
  const slot = suggestSlot(input, residents[0], facilities, now);
  assert.equal(slot?.startAt, '2026-09-08T10:00:00.000Z');
  assert.equal(slot?.endAt, '2026-09-08T11:00:00.000Z');
  assert.equal(slot?.needsConfirmation, false);
  const missing = suggestSlot(request('Teach me chess'), residents[0], facilities, now);
  assert.equal(missing?.startAt, '2026-09-05T01:00:00.000Z');
  assert.equal(missing?.needsConfirmation, true);
  const conflict = request('Badminton Monday mornings');
  const matches = findMatches(conflict, residents, facilities, now);
  assert(matches.length > 0 && matches.every(match => match.suggestedSlot === null));
  assert.equal(suggestSlot(input, residents[0], [], now), null);
});

test('Singapore date rollover and remaining duration are handled correctly', () => {
  const input = request('Badminton Saturday mornings');
  const slot = suggestSlot(input, residents[0], facilities, new Date('2026-09-04T17:00:00Z'));
  assert.equal(slot?.startAt, '2026-09-05T01:00:00.000Z');
  const nextWeek = suggestSlot(input, residents[0], facilities, new Date('2026-09-05T03:30:00Z'));
  assert.equal(nextWeek?.startAt, '2026-09-12T01:00:00.000Z');
});

test('interest slot validation rejects changed facilities, past times, and forged duration', () => {
  const input = request(REQUEST_EXAMPLES[3]);
  const slot = suggestSlot(input, residents[0], facilities, now)!;
  assert.deepEqual(validateSlot(input, residents[0], facilities, slot, now), slot);
  assert.equal(validateSlot(input, residents[0], facilities, { ...slot, facilityId: facilities[1].id }, now), null);
  assert.equal(validateSlot(input, residents[0], facilities, slot, new Date('2026-09-09T00:00:00Z')), null);
  assert.equal(validateSlot(input, residents[0], facilities, { ...slot, endAt: slot.startAt }, now), null);
  assert.equal(validateSlot(input, residents[0], facilities, { ...slot, facilityName: 'Forged venue' }, now)?.facilityName, facilities[0].name);
});
