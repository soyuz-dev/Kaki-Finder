'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Activity, ActivityRole, AvailabilityWindow, Language, ParsedRequest, ParticipantGroup } from '@/types/domain';
import { ACTIVITY_LABELS, LANGUAGE_LABELS, PARTICIPANT_GROUP_LABELS, REQUEST_EXAMPLES, ROLE_LABELS, SEARCH_STORAGE_KEY, WEEKDAYS } from '@/lib/constants';
import { confirmedMatchRequestSchema, parsedRequestSchema, searchSessionSchema } from '@/lib/validation/community';
import { postJson } from '@/lib/api/client';

export function RequestForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [block, setBlock] = useState('');
  const [group, setGroup] = useState<ParticipantGroup | ''>('');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function restore() {
      await Promise.resolve();
      try {
        const raw = sessionStorage.getItem(SEARCH_STORAGE_KEY);
        if (!raw || !active) return;
        const saved = searchSessionSchema.parse(JSON.parse(raw));
        setName(saved.request.name); setBlock(saved.request.block); setGroup(saved.request.participantGroup);
        setText(saved.text); setParsed(saved.request.criteria);
      } catch { /* A fresh form is usable when an old draft is absent or invalid. */ }
    }
    void restore();
    return () => { active = false; };
  }, []);

  async function interpret(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    try { setParsed(await postJson('/api/parse', { text }, parsedRequestSchema)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  function update<K extends keyof ParsedRequest>(field: K, value: ParsedRequest[K]) {
    setParsed(current => current ? { ...current, [field]: value, clarificationFields: current.clarificationFields.filter(key => key !== field) } : current);
    setError('');
  }
  function updateWindow(index: number, changes: Partial<AvailabilityWindow>) {
    if (parsed) update('availability', parsed.availability.map((window, i) => i === index ? { ...window, ...changes } : window));
  }
  function showMatches() {
    setError('');
    const checked = confirmedMatchRequestSchema.safeParse({ name, block, participantGroup: group, criteria: parsed });
    if (!checked.success) { setError(checked.error.issues[0]?.message || 'Please check your details.'); return; }
    try {
      // Session storage keeps names and free text out of shareable URLs.
      sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify({ id: crypto.randomUUID(), text, request: checked.data }));
      router.push('/results');
    } catch { setError('This browser cannot save your request. Please enable browser storage and try again.'); }
  }

  return <section id="find-kaki" className="scroll-mt-6 rounded-[2rem] border border-line bg-paper p-6 shadow-[0_14px_55px_-35px_#71370d66] sm:p-8" aria-labelledby="request-heading">
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 id="request-heading" className="text-2xl font-semibold tracking-tight">What brings you here?</h2>
      <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-muted">No account needed</span>
    </div>
    <form onSubmit={interpret}>
      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <div><label className="field-label" htmlFor="resident-name">Your name</label><input id="resident-name" autoComplete="given-name" className="field" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="What should we call you?" required /></div>
        <div><label className="field-label" htmlFor="resident-block">Block number</label><input id="resident-block" className="field" value={block} onChange={e => setBlock(e.target.value)} maxLength={20} placeholder="e.g. 43" required /></div>
      </div>
      <div className="mt-4"><label className="field-label" htmlFor="participant-group">Who is taking part?</label>
        <select id="participant-group" className="field" value={group} onChange={e => setGroup(e.target.value as ParticipantGroup)} required>
          <option value="" disabled>Choose your age group or family</option>
          {Object.entries(PARTICIPANT_GROUP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <p className="mt-2 text-xs leading-5 text-muted">Anyone can teach, learn, or join in. {group === 'family' ? 'A parent joins and manages the family request.' : 'Your age group helps us connect generations.'}</p>
      </div>
      <label className="field-label mt-5" htmlFor="kaki-request">Tell us what you’d love to do</label>
      <textarea id="kaki-request" className="field min-h-36 resize-y text-base leading-7" value={text} onChange={e => { setText(e.target.value); setParsed(null); }} maxLength={1000} minLength={3} required placeholder="I’d love to learn Hokkien cooking from a neighbour. I’m free on Saturday mornings…" aria-describedby="request-help" />
      <p id="request-help" className="mt-2 text-xs leading-5 text-muted">Write in English. Mention a skill, day, time, or preferred language if you like.</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Try an example request">
        {['Teach chess', 'Learn cooking', 'Garden as a family', 'Play badminton'].map((label, i) => <button type="button" key={label} onClick={() => { setText(REQUEST_EXAMPLES[i]); setParsed(null); setError(''); }} className="min-h-10 rounded-full border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-kampung-orange hover:bg-cream">{label}</button>)}
      </div>
      {!parsed && <button className="primary-button mt-6 w-full" type="submit" disabled={busy}>{busy ? 'Reading your request…' : 'Let’s find your kaki →'}</button>}
      {parsed && <div className="mt-7 border-t border-line pt-6" aria-label="Check your request">
        <p className="text-xs font-bold uppercase tracking-widest text-kampung-red">One quick check</p>
        <h3 className="mt-2 text-xl font-semibold">Does this sound like you?</h3>
        <p className="mt-2 text-sm leading-6 text-muted">We picked out the main details. Change anything before we find your kakis.</p>
        {parsed.clarificationFields.length > 0 && <p className="mt-3 rounded-xl bg-cream p-3 text-sm leading-6 text-kampung-red" role="status">Please confirm {parsed.clarificationFields.join(', ')} below. We couldn’t interpret every detail confidently.</p>}
        <div className="mt-5"><label className="field-label" htmlFor="activity">Activity</label><select id="activity" className="field" value={parsed.activity || ''} onChange={e => update('activity', e.target.value as Activity)} required>
          <option value="" disabled>Choose one activity</option>{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></div>
        <fieldset className="mt-5"><legend className="field-label">I’d like to…</legend><div className="grid grid-cols-3 gap-2">{Object.entries(ROLE_LABELS).map(([value, label]) => <label key={value} className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm ${parsed.role === value ? 'border-kampung-red bg-cream font-semibold text-kampung-red' : 'border-line'}`}><input type="radio" name="activity-role" className="accent-kampung-red" checked={parsed.role === value} onChange={() => update('role', value as ActivityRole)} />{label}</label>)}</div></fieldset>
        <div className="mt-5"><label className="field-label" htmlFor="skill">A particular skill <span className="font-normal text-muted">(optional)</span></label><input id="skill" className="field" maxLength={120} placeholder="e.g. Hokkien cooking" value={parsed.skill || ''} onChange={e => update('skill', e.target.value.trim() ? e.target.value : null)} /></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="language">Language preference</label><select id="language" className="field" value={parsed.languagePreference || ''} onChange={e => update('languagePreference', e.target.value ? e.target.value as Language : null)}><option value="">Any language</option>{Object.entries(LANGUAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="field-label" htmlFor="preferred-group">Who to connect with</label><select id="preferred-group" className="field" value={parsed.groupPreference || ''} onChange={e => update('groupPreference', e.target.value ? e.target.value as ParticipantGroup : null)}><option value="">Any generation</option>{Object.entries(PARTICIPANT_GROUP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        </div>
        <fieldset className="mt-5"><legend className="field-label">When are you free? <span className="font-normal text-muted">(Singapore time)</span></legend>
          {parsed.availability.length === 0 && <p className="mb-3 text-sm leading-6 text-muted">We’ll suggest a time for you to confirm.</p>}
          <div className="space-y-3">{parsed.availability.map((window, index) => <div className="grid grid-cols-[1.1fr_1fr_1fr_auto] items-end gap-2" key={index}>
            <div><label className="field-label text-xs" htmlFor={`day-${index}`}>Day</label><select className="field px-2 text-sm" id={`day-${index}`} value={window.day} onChange={e => updateWindow(index, { day: Number(e.target.value) as AvailabilityWindow['day'] })}>{WEEKDAYS.map((day, dayIndex) => <option key={day} value={dayIndex + 1}>{day.slice(0, 3)}</option>)}</select></div>
            <div><label className="field-label text-xs" htmlFor={`start-${index}`}>From</label><input className="field px-2 text-sm" type="time" id={`start-${index}`} value={window.start} onChange={e => updateWindow(index, { start: e.target.value })} /></div>
            <div><label className="field-label text-xs" htmlFor={`end-${index}`}>Until</label><input className="field px-2 text-sm" type="time" id={`end-${index}`} value={window.end} onChange={e => updateWindow(index, { end: e.target.value })} /></div>
            <button className="min-h-12 min-w-8 text-xl text-muted hover:text-kampung-red" type="button" aria-label={`Remove ${WEEKDAYS[window.day - 1]} availability`} onClick={() => update('availability', parsed.availability.filter((_, i) => i !== index))}>×</button>
          </div>)}</div>
          <div className="mt-3 flex flex-wrap gap-4"><button className="min-h-10 text-sm font-semibold text-kampung-red underline underline-offset-4 disabled:opacity-50" type="button" disabled={parsed.availability.length >= 7} onClick={() => { const day = (WEEKDAYS.findIndex((_, i) => !parsed.availability.some(w => w.day === i + 1)) + 1 || 1) as AvailabilityWindow['day']; update('availability', [...parsed.availability, { day, start: '18:00', end: '21:00' }]); }}>+ Add a day</button><button className="min-h-10 text-sm text-muted underline underline-offset-4" type="button" onClick={() => update('availability', [])}>Any time — suggest a slot</button></div>
        </fieldset>
        <button type="button" className="primary-button mt-6 w-full" onClick={showMatches}>Show my kakis →</button>
      </div>}
      {error && <p className="mt-4 rounded-xl border border-kampung-red/30 bg-cream p-3 text-sm leading-6 text-kampung-red" role="alert">{error}</p>}
    </form>
  </section>;
}
