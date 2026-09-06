'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Match } from '@/types/domain';
import type { SearchSession } from '@/lib/validation/community';
import { connectionResponseSchema } from '@/lib/validation/connections';
import { accountRequest } from '@/features/auth/client';

export function SendRequestButton({ match, session, ownerId }: { match: Match; session: SearchSession; ownerId: string | null }) {
  const key = `kaki-finder:connection:v1:${ownerId}:${session.id}:${match.resident.id}:${match.suggestedSlot?.startAt || 'arrange'}`;
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function restore() {
      await Promise.resolve();
      try { const raw = localStorage.getItem(key); if (active) setSent(raw ? JSON.parse(raw).sent === true : false); }
      catch { /* Explain storage problems only if a request is attempted. */ }
    }
    void restore(); return () => { active = false; };
  }, [key]);
  async function send() {
    if (!ownerId || busy || sent) return;
    setBusy(true); setError('');
    try {
      let id: string = crypto.randomUUID();
      try {
        const raw = localStorage.getItem(key);
        const previous = raw ? JSON.parse(raw) : null;
        if (previous && typeof previous.id === 'string' && /^[0-9a-f-]{36}$/i.test(previous.id)) id = previous.id;
        // Persist before sending so a lost response can be retried safely.
        localStorage.setItem(key, JSON.stringify({ id, sent: false }));
      } catch { throw new Error('Please allow browser storage so a retry cannot send the same request twice.'); }
      await accountRequest('/api/connections', connectionResponseSchema, 'POST', {
        clientRequestId: id, residentId: match.resident.id, request: session.request,
        suggestedSlot: match.suggestedSlot, expectedAccountId: ownerId,
      });
      setSent(true);
      try { localStorage.setItem(key, JSON.stringify({ id, sent: true })); }
      catch { setError('Your request was sent. This browser could not remember the confirmation; check My connections.'); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send your request. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-auto pt-6">
    {!ownerId ? <><Link href="/account/sign-in" className="primary-button w-full">Sign in to connect</Link><p className="mt-3 text-xs leading-5 text-muted">Sign in so this neighbour can reply to your request.</p></> : <>
      {sent ? <Link href="/account#connections" className="primary-button w-full">View My connections →</Link> : <button className="primary-button w-full" disabled={busy} onClick={send}>{busy ? 'Sending request…' : 'Send connection request'}</button>}
      <p className="mt-3 text-xs leading-5 text-muted" role={sent ? 'status' : undefined}>{sent ? 'Your request is recorded. Check My connections for their response.' : `Shares ${session.request.name}, your chosen age group, activity, and proposed meetup with this neighbour. They can accept or decline in the app.`}</p>
      <p className="mt-2 text-xs leading-5 text-muted">Email, block number, and your other availability stay private. No facility booking is made.</p>
    </>}
    {error && <p className="mt-3 text-sm leading-6 text-kampung-red" role="alert">{error} <Link className="underline" href="/account#connections">My connections</Link></p>}
  </div>;
}
