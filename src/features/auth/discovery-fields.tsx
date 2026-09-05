'use client';
import { ACTIVITY_LABELS, ROLE_LABELS, WEEKDAYS } from '@/lib/constants';
import type { AccountProfile } from '@/lib/validation/account';
import type { Activity, ActivityRole, AvailabilityWindow } from '@/types/domain';

export function DiscoveryFields({ profile, onChange }: { profile: AccountProfile; onChange: (profile: AccountProfile) => void }) {
  function intent(index: number, changes: Partial<AccountProfile['intents'][number]>) {
    onChange({ ...profile, intents: profile.intents.map((item, i) => i === index ? { ...item, ...changes } : item) });
  }
  function slot(index: number, changes: Partial<AvailabilityWindow>) {
    onChange({ ...profile, availability: profile.availability.map((item, i) => i === index ? { ...item, ...changes } : item) });
  }
  return <div className="space-y-5 border-t border-line pt-5">
    <fieldset><legend className="text-lg font-semibold">Activities to share or enjoy</legend><p className="mt-2 text-sm leading-6 text-muted">Choose a role for each activity. You can teach one thing and learn another.</p>
      <div className="mt-4 space-y-4">{profile.intents.map((item, index) => <div key={index} className="space-y-3 rounded-2xl border border-line p-4">
        <div><label className="field-label" htmlFor={`public-activity-${index}`}>Activity {index + 1}</label><select id={`public-activity-${index}`} className="field" value={item.activity} onChange={e => intent(index, { activity: e.target.value as Activity })}>{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div><label className="field-label" htmlFor={`public-role-${index}`}>I’d like to</label><select id={`public-role-${index}`} className="field" value={item.role} onChange={e => intent(index, { role: e.target.value as ActivityRole })}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div><label className="field-label" htmlFor={`public-skill-${index}`}>Particular skill (optional)</label><input id={`public-skill-${index}`} className="field" value={item.skill || ''} maxLength={120} onChange={e => intent(index, { skill: e.target.value || null })} placeholder="e.g. beginner chess or Hokkien cooking" /></div>
        <button type="button" onClick={() => onChange({ ...profile, intents: profile.intents.filter((_, i) => i !== index) })} className="min-h-11 text-sm text-kampung-red underline underline-offset-4">Remove activity {index + 1}</button>
      </div>)}</div>
      <button type="button" disabled={profile.intents.length >= 20} onClick={() => onChange({ ...profile, intents: [...profile.intents, { activity: 'chess', role: 'partner', skill: null }] })} className="mt-2 min-h-11 text-sm font-semibold text-kampung-red disabled:opacity-50">+ Add an activity</button>
    </fieldset>
    <fieldset><legend className="text-lg font-semibold">When are you usually free?</legend><p className="mt-2 text-sm leading-6 text-muted">Weekly availability in Singapore time. Add more than one time window if you like.</p>
      <div className="mt-4 space-y-4">{profile.availability.map((item, index) => <div key={index} className="rounded-2xl border border-line p-4">
        <div><label className="field-label" htmlFor={`public-day-${index}`}>Day {index + 1}</label><select id={`public-day-${index}`} className="field" value={item.day} onChange={e => slot(index, { day: Number(e.target.value) as AvailabilityWindow['day'] })}>{WEEKDAYS.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}</select></div>
        <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="field-label" htmlFor={`public-start-${index}`}>From</label><input id={`public-start-${index}`} className="field" type="time" value={item.start} required onChange={e => slot(index, { start: e.target.value })} /></div><div><label className="field-label" htmlFor={`public-end-${index}`}>Until</label><input id={`public-end-${index}`} className="field" type="time" value={item.end} required onChange={e => slot(index, { end: e.target.value })} /></div></div>
        <button type="button" onClick={() => onChange({ ...profile, availability: profile.availability.filter((_, i) => i !== index) })} className="mt-2 min-h-11 text-sm text-kampung-red underline underline-offset-4">Remove time window {index + 1}</button>
      </div>)}</div>
      <button type="button" disabled={profile.availability.length >= 21} onClick={() => onChange({ ...profile, availability: [...profile.availability, { day: 6, start: '09:00', end: '12:00' }] })} className="mt-2 min-h-11 text-sm font-semibold text-kampung-red disabled:opacity-50">+ Add availability</button>
    </fieldset>
    <div className="rounded-2xl border border-line bg-cream p-4">
      <label className="flex min-h-11 items-start gap-3 font-semibold"><input type="checkbox" className="mt-1.5 accent-kampung-red" checked={profile.discoverable} onChange={e => onChange({ ...profile, discoverable: e.target.checked })} />Make my profile discoverable</label>
      <p className="mt-2 text-sm leading-6 text-muted">When you save with this selected, residents and guests can see your name, block, age group, languages, introduction, activities, and availability in matching results. Your email stays private.</p>
      <p className="mt-3 text-sm leading-6 text-muted">Uncheck and save to hide your profile from future matches. Existing saved selections remain, labelled unavailable. For families, use the adult’s details and leave children’s personal details out.</p>
      <p className="mt-3 text-xs font-semibold text-kampung-red">{profile.discoverable ? 'Save profile to apply these public details.' : 'Save profile to keep these details private.'}</p>
    </div>
  </div>;
}
