'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { accountRequest } from '@/features/auth/client';
import { connectionResponseSchema, connectionsResponseSchema, type Connection } from '@/lib/validation/connections';
import { ACTIVITY_LABELS, PARTICIPANT_GROUP_LABELS, TIME_ZONE } from '@/lib/constants';

const statusLabels = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined', cancelled: 'Cancelled' };
const wants = { teacher: 'Would like to share or teach', learner: 'Would like to learn', partner: 'Would like to enjoy together' };
const time = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE });
export function ConnectionInbox() {
  const [items, setItems] = useState<Connection[]>([]);
  const [viewerId, setViewerId] = useState('');
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const version = useRef(0);
  const mutating = useRef(false);
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const current = ++version.current;
    setLoading(true);
    try {
      const data = await accountRequest('/api/connections', connectionsResponseSchema);
      if (version.current === current) { setItems(data.connections); setViewerId(data.viewerId); setError(''); }
    } catch (cause) { if (version.current === current) setError(cause instanceof Error ? cause.message : 'Could not load connections.'); }
    finally { if (version.current === current) setLoading(false); }
  }, []);
  useEffect(() => {
    // This counter belongs to the request lifecycle, not a DOM element.
    const lifecycle = version;
    lifecycle.current++;
    let active = true;
    async function load() { await Promise.resolve(); if (active) await refresh(); }
    void load(); window.addEventListener('focus', load);
    return () => { active = false; lifecycle.current++; window.removeEventListener('focus', load); };
  }, [refresh]);
  async function respond(item: Connection, status: 'accepted' | 'declined' | 'cancelled') {
    if (mutating.current) return;
    mutating.current = true;
    setBusy(item.id); setError(''); setMessage('');
    // Ignore an older focus refresh that might otherwise overwrite the new status.
    version.current++;
    try {
      const data = await accountRequest('/api/connections', connectionResponseSchema, 'PATCH', { id: item.id, status, expectedAccountId: viewerId });
      setItems(current => current.map(row => row.id === item.id ? data.connection : row));
      setMessage(status === 'accepted' ? 'Connection accepted. The sender can see your response in the app.' : status === 'declined' ? 'Request declined. The sender can see your response in the app.' : 'Connection cancelled. Both people can see the updated status.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please refresh and try again.'); }
    finally { mutating.current = false; setBusy(null); setLoading(false); }
  }
  const visible = items.filter(item => item.direction === tab);
  const pending = items.filter(item => item.direction === 'incoming' && item.status === 'pending').length;
  return <section id="connections" aria-labelledby="connections-heading" className="mt-7 scroll-mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-kampung-red">A hello can become a friendship</p><h2 id="connections-heading" className="mt-2 text-2xl font-semibold">My connections</h2></div><button className="min-h-11 text-sm font-semibold text-kampung-red underline underline-offset-4 disabled:opacity-50" onClick={() => void refresh()} disabled={loading || !!busy}>Refresh requests</button></div>
    <p className="mt-3 text-sm leading-6 text-muted">Your latest 100 connection requests. Responses appear here; no emails are sent. Accepting connects you with the neighbour, but does not confirm a meetup time or reserve a facility.</p>
    <div className="mt-5 flex flex-wrap gap-3" aria-label="Request direction">{(['incoming', 'outgoing'] as const).map(value => <button key={value} className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${tab === value ? 'border-kampung-red bg-cream text-kampung-red' : 'border-line text-muted'}`} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === 'incoming' ? `Received${pending ? ` (${pending} pending)` : ''}` : 'Sent'}</button>)}</div>
    {loading && <p className="mt-4 text-sm text-muted" role="status">Checking your connections…</p>}
    {error && <p className="mt-4 text-sm leading-6 text-kampung-red" role="alert">{error} Use Refresh requests to check the latest status.</p>}
    {message && <p className="mt-4 text-sm leading-6" role="status">{message}</p>}
    {!loading && !error && !visible.length && <p className="mt-5 text-sm leading-6 text-muted">{tab === 'incoming' ? 'No requests yet. Make your profile discoverable so neighbours can find you.' : 'No requests sent yet. Find a community neighbour and send a connection request.'}</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">{visible.map(item => <article key={item.id} className="rounded-2xl border border-line bg-cream p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-lg font-semibold">{item.direction === 'incoming' ? item.senderName : item.recipientName}</h3><span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold">{statusLabels[item.status]}</span></div>
      {item.direction === 'incoming' && <p className="mt-2 text-xs text-muted">{PARTICIPANT_GROUP_LABELS[item.senderGroup]} · Name and age group supplied by the sender</p>}
      <p className="mt-3 text-sm font-semibold text-kampung-red">{ACTIVITY_LABELS[item.activity]}{item.skill ? ` · ${item.skill}` : ''}</p>
      <p className="mt-2 text-sm text-muted">{item.direction === 'outgoing' ? 'Your request: ' : ''}{wants[item.role]}</p>
      <p className="mt-3 text-sm leading-6">{item.suggestedSlot ? `Proposed: ${item.suggestedSlot.facilityName} · ${time.format(new Date(item.suggestedSlot.startAt))} SGT` : 'Meetup time still to arrange.'}</p>
      {item.status === 'accepted' && <p className="mt-3 text-sm leading-6 font-semibold">You’re connected. The meetup time remains a proposal; no CC booking has been made.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {item.direction === 'incoming' && item.status === 'pending' && <><button disabled={!!busy || loading} onClick={() => void respond(item, 'accepted')} className="primary-button">Accept connection</button><button disabled={!!busy || loading} onClick={() => void respond(item, 'declined')} className="min-h-11 px-3 text-sm font-semibold text-kampung-red underline underline-offset-4">Decline</button></>}
        {((item.direction === 'outgoing' && item.status === 'pending') || item.status === 'accepted') && <button disabled={!!busy || loading} onClick={() => void respond(item, 'cancelled')} className="min-h-11 text-sm font-semibold text-kampung-red underline underline-offset-4">{item.status === 'pending' ? 'Withdraw request' : 'Cancel connection'}</button>}
      </div>
    </article>)}</div>
  </section>;
}
