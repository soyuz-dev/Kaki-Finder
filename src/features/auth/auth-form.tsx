'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { accountRequest, redirectAfterAuth, sessionSchema } from './client';

const titles = { 'sign-in': 'Welcome back, neighbour.', 'sign-up': 'Make yourself at home.', 'forgot-password': 'Let’s get you back in.', password: 'Choose a new password.' };
export type AuthAction = keyof typeof titles;
export function AuthForm({ action, invalidLink }: { action: AuthAction; invalidLink: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [adult, setAdult] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(invalidLink ? 'This email link has expired or could not be verified. Try signing in or request a new password reset link. Open email links in the browser where you requested them.' : '');
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const session = await accountRequest('/api/auth/session', sessionSchema);
        if (!active) return;
        if (!session.enabled) setError('Accounts are not configured yet. You can still find a kaki as a guest.');
        else if (action === 'password' && !session.user) setError('Please open your password reset email in this browser, or sign in first.');
        else setReady(true);
      } catch (cause) { if (active) { setError(cause instanceof Error ? cause.message : 'Please try again.'); setReady(action !== 'password'); } }
    }
    void check(); return () => { active = false; };
  }, [action]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if ((action === 'sign-up' || action === 'password') && password !== confirmation) { setError('Your passwords do not match.'); return; }
    setBusy(true);
    try {
      const body = action === 'forgot-password' ? { action, email } : action === 'password' ? { action, password } : action === 'sign-up' ? { action, email, password, adult } : { action, email, password };
      const result = await accountRequest('/api/auth', z.object({ redirect: z.enum(['/account', '/account/sign-in']).optional(), message: z.string().optional() }), 'POST', body);
      setPassword(''); setConfirmation('');
      if (result.redirect) redirectAfterAuth(result.redirect);
      else setMessage(result.message || 'Done.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-lg rounded-3xl border border-line bg-paper p-6 sm:p-8">
    <p className="text-xs font-semibold uppercase tracking-widest text-kampung-red">Your place in the kampung</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">{titles[action]}</h1>
    <p className="mt-3 text-sm leading-6 text-muted">{action === 'sign-up' ? 'Save your profile and keep track of the neighbours you’d like to meet. Accounts are for adults; parents manage family requests.' : action === 'forgot-password' ? 'Enter your account email. We’ll send a link to choose a new password.' : 'Share skills, build bonds, and pick up where you left off.'}</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      {action !== 'password' && <div><label className="field-label" htmlFor="account-email">Email address</label><input className="field" id="account-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required /></div>}
      {action !== 'forgot-password' && <div><label className="field-label" htmlFor="account-password">{action === 'password' ? 'New password' : 'Password'}</label><input className="field" id="account-password" type="password" autoComplete={action === 'sign-in' ? 'current-password' : 'new-password'} minLength={action === 'sign-in' ? 1 : 8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} required />{action !== 'sign-in' && <p className="mt-2 text-xs text-muted">At least 8 characters.</p>}</div>}
      {(action === 'sign-up' || action === 'password') && <div><label className="field-label" htmlFor="confirm-password">Confirm password</label><input id="confirm-password" className="field" type="password" autoComplete="new-password" maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} required /></div>}
      {action === 'sign-up' && <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1.5 accent-kampung-red" checked={adult} onChange={e => setAdult(e.target.checked)} required />I’m 18 or older. I’ll manage any family requests as the responsible adult.</label>}
      <button className="primary-button w-full" disabled={!ready || busy}>{busy ? 'One moment…' : action === 'sign-up' ? 'Create account' : action === 'forgot-password' ? 'Send reset link' : action === 'password' ? 'Save password' : 'Sign in'}</button>
    </form>
    {message && <p className="mt-4 text-sm leading-6" role="status">{message} {action === 'sign-up' && 'Open the confirmation link in this browser.'}</p>}
    {error && <p className="mt-4 text-sm leading-6 text-kampung-red" role="alert">{error}</p>}
    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-kampung-red">
      {action !== 'sign-in' && <Link href="/account/sign-in" className="min-h-11 content-center underline underline-offset-4">Sign in</Link>}
      {action === 'sign-in' && <><Link href="/account/sign-up" className="min-h-11 content-center underline underline-offset-4">Create account</Link><Link href="/account/forgot-password" className="min-h-11 content-center underline underline-offset-4">Forgot password?</Link></>}
      {action === 'password' && <Link href="/account/forgot-password" className="min-h-11 content-center underline underline-offset-4">Request a reset link</Link>}
      <Link href="/" className="min-h-11 content-center text-muted">Continue as guest →</Link>
    </div>
  </section>;
}
