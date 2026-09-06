import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { mapConnection } from '../src/lib/repositories/connections';

test('Connections enforce participant privacy, recipient-only decisions, idempotency and terminal states', async () => {
  const db = new PGlite();
  const sender = randomUUID(), recipient = randomUUID(), outsider = randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,service_role;
      insert into auth.users values('${sender}'),('${recipient}'),('${outsider}');`);
    const setup = await readFile('supabase/setup.sql', 'utf8');
    await db.exec(setup);
    await db.query("insert into public.profiles(id,name,block,participant_group,languages,bio,intents,availability,discoverable) values($1,'Recipient','43','senior',array['english'],'I teach chess.',$2::jsonb,$3::jsonb,true)", [recipient, JSON.stringify([{ activity: 'chess', role: 'teacher', skill: null }]), JSON.stringify([{ day: 6, start: '09:00', end: '12:00' }])]);
    const resident = (await db.query<{ directory_id: string }>('select directory_id from public.profiles where id=$1', [recipient])).rows[0].directory_id;
    async function as(id: string) { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); }
    const create = 'select * from public.create_connection_request($1,$2,$3,$4,$5,$6,$7,$8::jsonb)';
    const args = [randomUUID(), resident, 'Sender', 'young-adult', 'chess', 'learner', null, null];
    const respond = 'select * from public.respond_connection_request($1,$2)';
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.connection_requests'), /permission denied/);
    await assert.rejects(db.query(create, args), /permission denied/);
    await as(sender);
    await assert.rejects(db.query("insert into public.connection_requests(client_request_id) values($1)", [randomUUID()]), /permission denied/);
    const first = (await db.query<Record<string, unknown> & { id: string }>(create, args)).rows[0];
    assert.equal(first.status, 'pending');
    assert.equal((await db.query<{ id: string }>(create, args)).rows[0].id, first.id);
    await assert.rejects(db.query(create, [args[0], resident, 'Changed name', ...args.slice(3)]), /Request ID already used/);
    await assert.rejects(db.query(create, [randomUUID(), ...args.slice(1)]), /connections_one_open_idx/);
    await assert.rejects(db.query(respond, [first.id, 'accepted']), /Only recipient/);
    await assert.rejects(db.query(respond, [first.id, 'declined']), /Only recipient/);
    await assert.rejects(db.query("update public.connection_requests set status='accepted' where id=$1", [first.id]), /permission denied/);
    await assert.rejects(db.query('delete from public.connection_requests where id=$1', [first.id]), /permission denied/);
    // PostgREST serializes timestamps to ISO strings; PGlite returns Date instances.
    const safe = mapConnection(JSON.parse(JSON.stringify(first)), sender);
    assert.equal(safe.direction, 'outgoing');
    assert.equal('sender_id' in safe, false);
    assert.equal('email' in safe, false);
    await as(outsider);
    assert.equal((await db.query('select * from public.connection_requests')).rows.length, 0);
    await assert.rejects(db.query(respond, [first.id, 'accepted']), /Request unavailable/);
    await as(recipient);
    assert.equal((await db.query('select * from public.connection_requests')).rows.length, 1);
    await assert.rejects(db.query(respond, [first.id, 'cancelled']), /cannot be cancelled/);
    await assert.rejects(db.query(create, [randomUUID(), ...args.slice(1)]), /Neighbour unavailable/);
    assert.equal((await db.query<{ status: string }>(respond, [first.id, 'accepted'])).rows[0].status, 'accepted');
    assert.equal((await db.query<{ status: string }>(respond, [first.id, 'accepted'])).rows[0].status, 'accepted');
    await assert.rejects(db.query(respond, [first.id, 'declined']), /already changed/);
    await as(sender);
    assert.equal((await db.query<{ status: string }>(respond, [first.id, 'cancelled'])).rows[0].status, 'cancelled');
    await as(recipient);
    await assert.rejects(db.query(respond, [first.id, 'accepted']), /already changed/);
    await as(sender);
    const second = (await db.query<{ id: string }>(create, [randomUUID(), ...args.slice(1)])).rows[0];
    await as(recipient);
    assert.equal((await db.query<{ status: string }>(respond, [second.id, 'declined'])).rows[0].status, 'declined');
    assert.equal((await db.query<{ status: string }>(respond, [second.id, 'declined'])).rows[0].status, 'declined');
    await as(sender);
    const third = (await db.query<{ id: string }>(create, [randomUUID(), ...args.slice(1)])).rows[0];
    assert.equal((await db.query<{ status: string }>(respond, [third.id, 'cancelled'])).rows[0].status, 'cancelled');
    await as(recipient);
    await db.query('update public.profiles set discoverable=false where id=$1', [recipient]);
    await as(sender);
    await assert.rejects(db.query(create, [randomUUID(), ...args.slice(1)]), /Neighbour unavailable/);
    await assert.rejects(db.query(create, [randomUUID(), '11111111-1111-4111-8111-000000000001', ...args.slice(2)]), /Neighbour unavailable/);
    // Existing requests remain shared after hiding; no historical interests were copied.
    assert.equal((await db.query('select * from public.connection_requests')).rows.length, 3);
    await db.exec('reset role');
    await db.exec(setup);
    await as(sender);
    assert.equal((await db.query('select * from public.connection_requests')).rows.length, 3);
    await assert.rejects(db.query("update public.connection_requests set status='pending'"), /permission denied/);
  } finally { await db.close(); }
});
