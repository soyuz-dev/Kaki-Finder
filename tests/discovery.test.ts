import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { profileSchema } from '../src/lib/validation/account';
import { mapResidentRow } from '../src/lib/repositories/supabase';
import { findMatches } from '../src/features/matching/find-matches';
import { residents, facilities } from '../src/data';

const intents = [{ activity: 'chess', role: 'teacher', skill: null }];
const availability = [{ day: 6, start: '09:00', end: '12:00' }];
test('Publication requires complete details and registered matches retain generation ranking', () => {
  const profile = { name: 'Neighbour', block: '41', participantGroup: 'senior', languages: ['english'], bio: 'Happy to teach chess.', discoverable: true, intents, availability };
  assert(profileSchema.safeParse(profile).success);
  for (const patch of [{ intents: [] }, { availability: [] }, { bio: '' }]) assert(!profileSchema.safeParse({ ...profile, ...patch }).success);
  assert(profileSchema.safeParse({ ...profile, discoverable: false, intents: [], availability: [] }).success);
  const real = { ...residents[0], id: '99999999-9999-4999-8999-999999999999', isDemo: false };
  const matches = findMatches({ name: 'Learner', block: '49', participantGroup: 'young-adult', criteria: { activity: 'chess', role: 'learner', skill: null, availability: [], languagePreference: null, groupPreference: null, clarificationFields: [] } }, [...residents, real], facilities);
  assert.equal(matches[0].resident.id, real.id);
  assert.equal(matches[0].bridgeScore, 100);
});

test('Discovery SQL enforces consent, immutable public IDs, hiding, history and safe deletion', async () => {
  const db = new PGlite();
  const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,service_role;
      insert into auth.users values('${owner}'),('${other}');`);
    const setup = await readFile('supabase/setup.sql', 'utf8');
    await db.exec(setup);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await db.query("insert into public.profiles(id,name,block,participant_group,languages,bio) values($1,'Discovery test','41','senior',array['english'],'I enjoy sharing chess.')", [owner]);
    await assert.rejects(db.query('update public.profiles set discoverable=true where id=$1', [owner]), /profiles_publication_check/);
    await assert.rejects(db.query('update public.profiles set directory_id=$1 where id=$2', [residents[0].id, owner]), /permission denied/);
    const setDetails = 'update public.profiles set intents=$1::jsonb,availability=$2::jsonb,discoverable=$3 where id=$4';
    for (const invalid of [[{ activity: 'chess', role: 'teacher', skill: null, injected: true }], [{ activity: 'chess', role: null, skill: null }]]) {
      await assert.rejects(db.query(setDetails, [JSON.stringify(invalid), JSON.stringify(availability), true, owner]), /profiles_discovery_details_check/);
    }
    await db.exec('reset role');
    assert.equal((await db.query('select * from public.residents where is_active')).rows.length, 15);
    await db.exec('set role authenticated');
    await db.query(setDetails, [JSON.stringify(intents), JSON.stringify(availability), true, owner]);
    await db.exec('reset role');
    const published = await db.query<{ id: string; is_active: boolean }>('select * from public.residents where owner_id=$1', [owner]);
    const directoryId = published.rows[0].id;
    assert.notEqual(directoryId, owner);
    const safe = mapResidentRow(published.rows[0]);
    assert.equal(safe.isDemo, false);
    assert.equal('owner_id' in safe, false);
    assert.equal('email' in safe, false);
    assert.equal((await db.query('select * from public.residents where is_active')).rows.length, 16);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    await assert.rejects(db.query('select * from public.residents'), /permission denied/);
    assert.equal((await db.query('select * from public.profiles where id=$1', [owner])).rows.length, 0);
    const insert = 'insert into public.interests(client_request_id,resident_id,request,user_id) values($1,$2,$3::jsonb,$4)';
    await db.query(insert, ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', directoryId, '{}', other]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await assert.rejects(db.query(insert, ['dddddddd-dddd-4ddd-8ddd-dddddddddddd', directoryId, '{}', owner]), /no longer available/);
    await db.query('update public.profiles set discoverable=false where id=$1', [owner]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    await assert.rejects(db.query(insert, ['dddddddd-dddd-4ddd-8ddd-dddddddddddd', directoryId, '{}', other]), /no longer available/);
    assert.equal((await db.query('select * from public.interests')).rows.length, 1);
    await db.exec('reset role');
    assert.equal((await db.query('select * from public.residents where is_active')).rows.length, 15);
    await db.exec(setup);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await assert.rejects(db.query('update public.profiles set directory_id=$1 where id=$2', [residents[0].id, owner]), /permission denied/);
    await db.query('update public.profiles set discoverable=true where id=$1', [owner]);
    await db.exec('reset role');
    assert.equal((await db.query<{ id: string }>('select id from public.residents where owner_id=$1 and is_active', [owner])).rows[0].id, directoryId);
    await db.query('delete from auth.users where id=$1', [owner]);
    assert.equal((await db.query<{ is_active: boolean }>('select is_active from public.residents where id=$1', [directoryId])).rows[0].is_active, false);
    assert.equal((await db.query('select * from public.interests')).rows.length, 1);
  } finally { await db.close(); }
});
