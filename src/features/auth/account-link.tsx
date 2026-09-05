'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { accountRequest, sessionSchema } from './client';
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    async function check() {
      try { const result = await accountRequest('/api/auth/session', sessionSchema); if (active) setSignedIn(!!result.user); }
      catch { /* The account page supplies an actionable error; guest navigation stays usable. */ }
    }
    void check();
    window.addEventListener('focus', check);
    return () => { active = false; window.removeEventListener('focus', check); };
  }, []);
  return <Link href={signedIn ? '/account' : '/account/sign-in'} className="inline-flex min-h-11 items-center text-kampung-red">{signedIn ? 'My account' : 'Sign in'}</Link>;
}
