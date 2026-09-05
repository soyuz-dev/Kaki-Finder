'use client';

import { useEffect, useState } from 'react';
import type { Match } from '@/types/domain';
import type { SearchSession } from '@/lib/validation/community';
import { interestResponseSchema } from '@/lib/validation/community';
import { postJson } from '@/lib/api/client';

type Receipt = { requestId: string; recorded: boolean };
function readReceipt(key: string): Receipt | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(value.requestId) && typeof value.recorded === 'boolean' ? value : null;
  } catch { return null; }
}

export function InterestButton({ match, session, storageMode }: { match: Match; session: SearchSession; storageMode: 'fixtures' | 'supabase' }) {
  const key = `kaki-finder:interest:v1:${storageMode}:${session.id}:${match.resident.id}:${match.suggestedSlot?.startAt || 'arrange'}`;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function restore() { await Promise.resolve(); try { if (active) setSaved(readReceipt(key)?.recorded || false); } catch { /* Explain blocked storage if the resident tries to save. */ } }
    void restore(); return () => { active = false; };
  }, [key]);

  async function expressInterest() {
    if (busy || saved) return;
    setBusy(true); setError('');
    let receipt: Receipt;
    try {
      receipt = readReceipt(key) || { requestId: crypto.randomUUID(), recorded: false };
      // Persist the retry ID before the request, including if the response is lost.
      localStorage.setItem(key, JSON.stringify(receipt));
    } catch { setError('Please allow browser storage so we can remember this selection and prevent duplicate requests.'); setBusy(false); return; }
    try {
      const result = await postJson('/api/interests', { clientRequestId: receipt.requestId, residentId: match.resident.id, request: session.request, suggestedSlot: match.suggestedSlot }, interestResponseSchema);
      if (result.storageMode !== storageMode) throw new Error('The demo storage mode changed. Please refresh your results.');
      if (result.status === 'local-save-required') {
        localStorage.setItem(key, JSON.stringify({ ...receipt, recorded: true }));
        setSaved(true);
      } else {
        setSaved(true);
        try { localStorage.setItem(key, JSON.stringify({ ...receipt, recorded: true })); }
        catch { setError('Your interest was recorded, but this browser could not remember the confirmation.'); }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record interest. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-auto pt-6">
    <button className={`primary-button w-full ${saved ? 'bg-[#336749] hover:bg-[#336749]' : ''}`} onClick={expressInterest} disabled={busy || saved}>{saved ? '✓ Interest recorded' : busy ? 'Recording your interest…' : 'Express interest'}</button>
    {saved && <p className="mt-3 text-xs leading-5 text-muted" role="status">{storageMode === 'fixtures' ? 'Saved on this device. ' : 'Recorded for this demo. '}No message or facility booking has been sent.</p>}
    {error && <p className="mt-3 text-sm leading-6 text-kampung-red" role="alert">{error}</p>}
  </div>;
}
