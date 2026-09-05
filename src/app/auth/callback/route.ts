import { NextResponse } from 'next/server';
import { appOrigin, authClient } from '@/lib/auth/server';
export async function GET(request: Request) {
  // Only fixed destinations are allowed; never redirect to a supplied external URL.
  const url = new URL(request.url);
  const origin = appOrigin();
  try {
    const code = url.searchParams.get('code');
    if (code) {
      const client = await authClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(url.searchParams.get('next') === 'password' ? '/account/password' : '/account', origin), { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
  } catch { /* Expired links and unavailable auth share a safe retry destination. */ }
  return NextResponse.redirect(new URL('/account/sign-in?link=invalid', origin), { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
