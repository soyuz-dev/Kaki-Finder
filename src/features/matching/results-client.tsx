'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ACTIVITY_LABELS, BRIDGE_LABELS, LANGUAGE_LABELS, ROLE_LABELS, SEARCH_STORAGE_KEY, TIME_ZONE } from '@/lib/constants';
import { matchesResponseSchema, searchSessionSchema, type MatchesResponse, type SearchSession } from '@/lib/validation/community';
import { postJson } from '@/lib/api/client';
import { InterestButton } from '@/features/interests/interest-button';

type State = { status: 'loading' } | { status: 'missing' } | { status: 'error'; message: string } | { status: 'ready'; session: SearchSession; result: MatchesResponse };
const startFormatter = new Intl.DateTimeFormat('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });
const endFormatter = new Intl.DateTimeFormat('en-SG', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });

export function ResultsClient() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setState({ status: 'loading' });
      try {
        const raw = sessionStorage.getItem(SEARCH_STORAGE_KEY);
        if (!raw) { setState({ status: 'missing' }); return; }
        const checked = searchSessionSchema.safeParse(JSON.parse(raw));
        if (!checked.success) { setState({ status: 'missing' }); return; }
        const result = await postJson('/api/matches', checked.data.request, matchesResponseSchema, controller.signal);
        if (!controller.signal.aborted) setState({ status: 'ready', session: checked.data, result });
      } catch (cause) {
        if (!controller.signal.aborted) setState({ status: 'error', message: cause instanceof Error ? cause.message : 'Unable to load your kakis. Please try again.' });
      }
    }
    void load(); return () => controller.abort();
  }, [attempt]);

  if (state.status === 'missing') return <div className="mx-auto max-w-xl py-16"><h1 className="text-4xl font-semibold tracking-tight">Let’s find your people.</h1><p className="mt-5 leading-7 text-muted">Start with a request so we can find neighbours who fit what you’d like to share or learn.</p><Link className="primary-button mt-7" href="/#find-kaki">Find a kaki →</Link></div>;
  if (state.status === 'error') return <div className="mx-auto max-w-xl py-16"><h1 className="text-3xl font-semibold">Let’s try that again.</h1><p className="mt-5 leading-7 text-muted" role="alert">{state.message}</p><div className="mt-7 flex flex-wrap items-center gap-6"><button className="primary-button" onClick={() => setAttempt(value => value + 1)}>Try again</button><Link href="/#find-kaki" className="text-sm font-semibold text-kampung-red underline underline-offset-4">Edit my request</Link></div></div>;
  if (state.status === 'loading') return <div aria-busy="true"><p className="text-sm font-semibold text-kampung-red" role="status">Finding a little kampung connection…</p><h1 className="mt-4 text-4xl font-semibold">Looking for your kakis</h1><div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">{[1, 2, 3].map(i => <div key={i} className="h-96 animate-pulse rounded-3xl border border-line bg-paper motion-reduce:animate-none" />)}</div></div>;

  const { session, result } = state;
  return <>
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-kampung-red">A neighbour today. A kaki tomorrow.</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Meet your potential kakis.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-muted">A shared activity is a lovely place to start. Here’s who could join you.</p></div>
      <Link href="/#find-kaki" className="inline-flex min-h-12 items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold hover:border-kampung-orange">← Edit my request</Link>
    </div>
    <div className="mt-7 flex flex-wrap gap-2 text-sm"><span className="summary-chip">{ACTIVITY_LABELS[session.request.criteria.activity!]}</span><span className="summary-chip">{ROLE_LABELS[session.request.criteria.role!]}</span><span className="summary-chip">{BRIDGE_LABELS[session.request.participantGroup]}</span>{session.request.criteria.languagePreference && <span className="summary-chip">{LANGUAGE_LABELS[session.request.criteria.languagePreference]}</span>}</div>
    <p className="mt-6 text-xs leading-6 text-muted">Hackathon demo · Fictional resident profiles · Illustrative CC facilities and times · All times in Singapore time</p>
    {result.matches.length === 0 ? <div className="mt-8 max-w-2xl rounded-3xl border border-line bg-paper p-8"><h2 className="text-2xl font-semibold">Your kaki may be just around the corner.</h2><p className="mt-4 leading-7 text-muted">We don’t have a compatible neighbour in this small demo directory yet. Try a broader skill, another activity, or a different language or generation preference.</p><Link href="/#find-kaki" className="primary-button mt-6">Adjust my request</Link></div> : <>
      <p className="mt-6 text-sm font-semibold" role="status">{result.matches.length} potential {result.matches.length === 1 ? 'kaki' : 'kakis'} for you</p>
      <div className="mt-5 grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        {result.matches.map(match => <article key={`${session.id}:${match.resident.id}`} className="flex min-w-0 flex-col rounded-[1.7rem] border border-line bg-paper p-6 sm:p-7">
          <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f8dcc0] text-lg font-semibold text-[#7b3d0b]" aria-hidden="true">{match.resident.name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</div><div className="min-w-0"><h2 className="text-xl font-semibold leading-7">{match.resident.name}</h2><p className="mt-1 text-sm text-muted">{match.resident.ageRange} · Blk {match.resident.block}</p></div></div>
          <p className="mt-5 text-sm font-semibold text-kampung-red">{match.reasons[0]}</p>
          <p className="mt-3 text-sm leading-7 text-muted">{match.resident.bio}</p>
          <p className="mt-3 text-xs leading-6 text-muted">Cambridge Road · {match.resident.languages.map(language => LANGUAGE_LABELS[language]).join(' / ')}</p>
          <div className="mt-5 rounded-2xl border border-[#efceac] bg-cream p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-[#854514]">{BRIDGE_LABELS[session.request.participantGroup]} ↔ {BRIDGE_LABELS[match.resident.participantGroup]}</span><span className="text-sm font-bold text-kampung-red">{match.bridgeScore}<span className="font-normal text-muted">/100</span></span></div><p className="mt-1 text-xs text-muted">Generation bridge score</p></div>
          {match.reasons.length > 1 && <ul className="mt-4 space-y-2 text-xs leading-5 text-muted">{match.reasons.slice(1).map(reason => <li key={reason}>✓ {reason}</li>)}</ul>}
          <div className="mt-5 border-t border-line pt-4">{match.suggestedSlot ? <><p className="text-xs font-semibold uppercase tracking-wider text-muted">Suggested meetup</p><p className="mt-2 text-sm font-semibold leading-6">{match.suggestedSlot.facilityName}</p><p className="mt-1 text-sm leading-6">{startFormatter.format(new Date(match.suggestedSlot.startAt))}–{endFormatter.format(new Date(match.suggestedSlot.endAt))}</p><p className="mt-2 text-xs leading-5 text-muted">{match.suggestedSlot.needsConfirmation ? 'Please confirm this time. ' : ''}Demo slot only; no reservation is made.</p></> : <><p className="font-semibold">Time to arrange</p><p className="mt-2 text-sm leading-6 text-muted">There isn’t a shared slot in the demo timetable. You can still express interest.</p></>}</div>
          <InterestButton match={match} session={session} storageMode={result.storageMode} />
        </article>)}
      </div>
    </>}
    <p className="mt-8 max-w-3xl text-xs leading-6 text-muted">Bridge scores describe the pairing of declared participant groups: 100 for senior ↔ young adult or family, 70 for other different groups, and 40 for the same group. They aren’t a prediction of friendship. Everyone can teach, learn, or join in.</p>
    <button className="mt-4 min-h-11 text-sm text-kampung-red underline underline-offset-4" onClick={() => setAttempt(value => value + 1)}>Refresh suggestions</button>
  </>;
}
