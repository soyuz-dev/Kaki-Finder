'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { accountRequest, clearSearchDraft, redirectAfterAuth, sessionSchema } from './client';
import { profileSchema, type AccountProfile } from '@/lib/validation/account';
import { interestSchema } from '@/lib/validation/community';
import { ACTIVITY_LABELS, LANGUAGE_LABELS, PARTICIPANT_GROUP_LABELS, TIME_ZONE } from '@/lib/constants';
import type { Language, ParticipantGroup } from '@/types/domain';
import { DiscoveryFields } from './discovery-fields';

const listSchema = z.object({ interests: z.array(interestSchema.extend({ residentName: z.string() })) });
const empty: AccountProfile = { name: '', block: '', participantGroup: 'young-adult', languages: ['english'], bio: '', discoverable: false, intents: [], availability: [] };
export function AccountDashboard() {
  const [profile, setProfile] = useState<AccountProfile>(empty);
  const [items, setItems] = useState<z.infer<typeof listSchema>['interests']>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await accountRequest('/api/auth/session', sessionSchema);
        if (!active) return;
        if (!session.user) { window.location.replace('/account/sign-in'); return; }
        setEmail(session.user.email || '');
        // Email callbacks also land here; discard the previous account's draft.
        clearSearchDraft();
        const [saved, list] = await Promise.allSettled([accountRequest('/api/account', z.object({ profile: profileSchema.nullable() })), accountRequest('/api/account/interests', listSchema)]);
        if (!active) return;
        if (saved.status === 'fulfilled') { setProfile(saved.value.profile || empty); setReady(true); }
        else setError(saved.reason instanceof Error ? saved.reason.message : 'Could not load your profile.');
        if (list.status === 'fulfilled') setItems(list.value.interests);
        else setListError(list.reason instanceof Error ? list.reason.message : 'Could not load your interests.');
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Please try again.'); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const saved = await accountRequest('/api/account', z.object({ profile: profileSchema }), 'PUT', profile); setProfile(saved.profile); setMessage(saved.profile.discoverable ? 'Profile saved. Neighbours can now find you when your activities match.' : 'Profile saved privately. You will not appear in matching results.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try { await accountRequest('/api/auth', z.object({ redirect: z.string() }), 'POST', { action: 'sign-out' }); redirectAfterAuth('/account/sign-in'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await accountRequest('/api/account/interests', z.object({ removed: z.boolean() }), 'DELETE', { id });
      setItems(current => current.filter(item => item.id !== id));
      setMessage('Interest removed. No neighbour was notified.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  if (loading) return <p className="text-muted" role="status">Opening your place in the kampung…</p>;
  return <>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-kampung-red">Your kampung connections</p><h1 className="mt-3 text-3xl font-semibold">My account</h1><p className="mt-2 break-all text-sm text-muted">{email}</p></div><div className="flex flex-wrap items-center gap-5 text-sm"><Link href="/account/password" className="min-h-11 content-center text-kampung-red underline underline-offset-4">Change password</Link><button onClick={signOut} disabled={busy} className="min-h-11 font-semibold text-kampung-red">Sign out</button></div></div>
    {error && <p className="mt-5 rounded-xl border border-line bg-paper p-4 text-sm text-kampung-red" role="alert">{error} {!ready && <button className="ml-3 underline" onClick={() => window.location.reload()}>Try again</button>}</p>}
    {message && <p className="mt-5 text-sm leading-6" role="status">{message}</p>}
    {ready && <div className="mt-7 grid items-start gap-7 lg:grid-cols-2">
      <section className="rounded-3xl border border-line bg-paper p-6"><h2 className="text-xl font-semibold">Your resident profile</h2><p className="mt-2 text-sm leading-6 text-muted">You choose whether neighbours can find you. Your age group doesn’t decide whether you teach or learn.</p>
        <form onSubmit={save} className="mt-5 space-y-4">
          <div><label className="field-label" htmlFor="profile-name">Your name</label><input id="profile-name" className="field" autoComplete="name" maxLength={80} required value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="profile-block">Block number</label><input id="profile-block" className="field" maxLength={20} required value={profile.block} onChange={e => setProfile({ ...profile, block: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="profile-group">Who takes part?</label><select id="profile-group" className="field" value={profile.participantGroup} onChange={e => setProfile({ ...profile, participantGroup: e.target.value as ParticipantGroup })}>{Object.entries(PARTICIPANT_GROUP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{profile.participantGroup === 'family' && <p className="mt-2 text-xs leading-5 text-muted">Use the parent’s name and email. A parent joins and manages family activities.</p>}</div>
          <fieldset><legend className="field-label">Languages you speak</legend><div className="flex flex-wrap gap-x-4">{Object.entries(LANGUAGE_LABELS).map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="accent-kampung-red" checked={profile.languages.includes(value as Language)} onChange={e => setProfile({ ...profile, languages: e.target.checked ? [...profile.languages, value as Language] : profile.languages.filter(l => l !== value) })} />{label}</label>)}</div></fieldset>
          <div><label className="field-label" htmlFor="profile-bio">A little about you {profile.discoverable ? '(required to be discoverable)' : '(optional)'}</label><textarea id="profile-bio" className="field min-h-24" maxLength={600} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="What do you enjoy sharing or learning?" /></div>
          <DiscoveryFields profile={profile} onChange={setProfile} />
          <button disabled={busy} className="primary-button w-full">{busy ? 'One moment…' : 'Save profile'}</button>
        </form>
      </section>
      <section aria-labelledby="my-interests"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="my-interests" className="text-xl font-semibold">My interests</h2><Link href="/#find-kaki" className="min-h-11 content-center text-sm font-semibold text-kampung-red">Find another kaki →</Link></div>
        <p className="mt-2 text-sm leading-6 text-muted">Your latest 100 selections made while signed in. Guest selections stay separate. Expressing interest does not send a message or make a booking.</p>
        {listError && <p className="mt-5 text-sm leading-6 text-kampung-red" role="alert">{listError} <button className="underline" onClick={() => window.location.reload()}>Retry interests</button></p>}
        {!listError && !items.length && <div className="mt-5 rounded-3xl border border-line bg-paper p-6"><p className="font-semibold">Your first connection is waiting.</p><p className="mt-2 text-sm leading-6 text-muted">Find a kaki and express interest to see them here.</p></div>}
        <div className="mt-5 space-y-4">{items.map(item => <article key={item.id} className="rounded-2xl border border-line bg-paper p-5"><h3 className="font-semibold">{item.residentName}</h3><p className="mt-2 text-sm text-kampung-red">{ACTIVITY_LABELS[item.request.criteria.activity!]}</p><p className="mt-2 text-sm leading-6 text-muted">{item.suggestedSlot ? `${item.suggestedSlot.facilityName} · ${new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(new Date(item.suggestedSlot.startAt))} SGT` : 'Time to arrange'}</p><button disabled={busy} onClick={() => remove(item.id)} className="mt-2 min-h-11 text-sm text-kampung-red underline underline-offset-4">Remove interest</button></article>)}</div>
      </section>
    </div>}
  </>;
}
