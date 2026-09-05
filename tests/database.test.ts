import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { residents, facilities } from '../src/data';
import { mapResidentRow, mapFacilityRow } from '../src/lib/repositories/supabase';

test('Postgres setup is repeatable, matches fixtures, protects tables, and preserves interests', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const setup = await readFile('supabase/setup.sql', 'utf8');
    await db.exec(setup);
    const residentRows = await db.query('select * from public.residents order by id');
    assert.deepEqual(residentRows.rows.map(mapResidentRow), residents);
    const facilityRows = await db.query('select * from public.facilities order by id');
    assert.deepEqual(facilityRows.rows.map(mapFacilityRow), facilities);
    const policies = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid in ('public.residents'::regclass, 'public.facilities'::regclass, 'public.interests'::regclass)");
    assert(policies.rows.every(row => row.relrowsecurity));

    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        for (const table of ['residents', 'facilities', 'interests']) {
          await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
        }
      } finally { await db.exec('reset role'); }
    }

    await db.exec('set role service_role');
    const clientRequestId = '33333333-3333-4333-8333-000000000001';
    const insert = "insert into public.interests (client_request_id, resident_id, request) values ($1, $2, $3::jsonb) on conflict (client_request_id) do nothing";
    await db.query(insert, [clientRequestId, residents[0].id, JSON.stringify({ name: 'Database test' })]);
    await db.query(insert, [clientRequestId, residents[0].id, JSON.stringify({ name: 'Database test' })]);
    assert.equal((await db.query('select * from public.interests')).rows.length, 1);
    await assert.rejects(db.query(insert, ['33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-999999999999', '{}']), /foreign key/);
    await db.exec('reset role');

    await db.exec(setup);
    assert.equal((await db.query('select * from public.residents')).rows.length, 15);
    assert.equal((await db.query('select * from public.facilities')).rows.length, 5);
    assert.equal((await db.query('select * from public.interests')).rows.length, 1);
  } finally { await db.close(); }
});
