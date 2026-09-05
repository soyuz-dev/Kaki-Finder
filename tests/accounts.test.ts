import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { authActionSchema, profileSchema } from '../src/lib/validation/account';

test('Account inputs require adult signup, bounded passwords and independent age groups', () => {
  assert.equal(authActionSchema.safeParse({ action: 'sign-up', email: 'parent@example.com', password: 'abcdefgh', adult: false }).success, false);
  assert.equal(authActionSchema.safeParse({ action: 'password', password: 'short' }).success, false);
  assert.equal(profileSchema.safeParse({ name: 'Mary', block: '47', participantGroup: 'senior', languages: ['english'], bio: 'Learning guitar' }).success, true);
  assert.equal(profileSchema.safeParse({ name: 'Mary', block: '47', participantGroup: 'senior', languages: [], bio: '' }).success, false);
});

test('Account RLS isolates two users, rejects forged ownership, leaves guests private, and survives repeat setup', async () => {
  const db = new PGlite();
  const alice = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const bob = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const resident = '11111111-1111-4111-8111-000000000001';
  try {
    // Supabase supplies auth.users and auth.uid; reproduce that contract in Postgres.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      insert into auth.users values ('${alice}'), ('${bob}');`);
    const setup = await readFile('supabase/setup.sql', 'utf8');
    await db.exec(setup);
    const insertInterest = 'insert into public.interests(client_request_id,resident_id,request,user_id) values($1,$2,$3::jsonb,$4) returning id';
    await db.query(insertInterest, ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', resident, '{}', null]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
    await db.query("insert into public.profiles(id,name,block,participant_group,languages) values($1,'Alice','41','senior',array['english'])", [alice]);
    const interest = await db.query<{ id: string }>(insertInterest, ['dddddddd-dddd-4ddd-8ddd-dddddddddddd', resident, '{}', alice]);
    assert.equal((await db.query('select * from public.interests')).rows.length, 1);
    await assert.rejects(db.query(insertInterest, ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', resident, '{}', bob]), /row-level security/);
    await assert.rejects(db.query(insertInterest, ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', resident, '{}', null]), /row-level security/);
    await assert.rejects(db.query('update public.profiles set id=$1 where id=$2', [bob, alice]), /row-level security/);
    await assert.rejects(db.query('update public.interests set user_id=$1', [bob]), /permission denied/);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [bob]);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
    assert.equal((await db.query('select * from public.interests')).rows.length, 0);
    assert.equal((await db.query('delete from public.interests where id=$1 returning id', [interest.rows[0].id])).rows.length, 0);
    assert.equal((await db.query("update public.profiles set name='Changed' where id=$1 returning id", [alice])).rows.length, 0);
    await assert.rejects(db.query("insert into public.profiles(id,name,block,participant_group,languages) values($1,'Fake','41','adult',array['english'])", [alice]), /row-level security/);
    await db.exec('reset role; set role anon');
    for (const table of ['profiles', 'interests']) await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
    await db.exec('reset role');
    await db.exec(setup);
    assert.equal((await db.query('select * from public.interests')).rows.length, 2);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
    assert.equal((await db.query('delete from public.interests where id=$1 returning id', [interest.rows[0].id])).rows.length, 1);
    await db.exec('reset role');
    await db.query('delete from auth.users where id=$1', [alice]);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
    assert.equal((await db.query('select * from public.interests')).rows.length, 1);
  } finally { await db.close(); }
});
