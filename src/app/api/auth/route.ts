import { authClient, appOrigin, identity, sameOrigin } from '@/lib/auth/server';
import { apiError, HttpError, jsonResponse, readInput } from '@/lib/api/http';
import { authActionSchema } from '@/lib/validation/account';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = await readInput(request, authActionSchema);
    const client = await authClient();
    if (input.action === 'sign-out') {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw new HttpError(503, 'SIGN_OUT_FAILED', 'Could not sign out. Please try again.');
      return jsonResponse({ redirect: '/account/sign-in' });
    }
    if (input.action === 'sign-in') {
      const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) throw new HttpError(error.status === 429 ? 429 : 400, 'SIGN_IN_FAILED', error.status === 429 ? 'Too many attempts. Please wait before trying again.' : 'Could not sign in. Check your email and password, and confirm your email if you just signed up.');
      return jsonResponse({ redirect: '/account' });
    }
    if (input.action === 'sign-up') {
      const { data, error } = await client.auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo: `${appOrigin()}/auth/callback` } });
      if (error) throw new HttpError(error.status === 429 ? 429 : 400, 'SIGN_UP_FAILED', 'Could not create the account. Please try later, or sign in if you already have an account.');
      return jsonResponse(data.session ? { redirect: '/account' } : { message: 'Check your email for a confirmation link. If you already have an account, please sign in.' });
    }
    if (input.action === 'forgot-password') {
      const { error } = await client.auth.resetPasswordForEmail(input.email, { redirectTo: `${appOrigin()}/auth/callback?next=password` });
      if (error) throw new HttpError(error.status === 429 ? 429 : 503, 'RECOVERY_FAILED', 'We could not process recovery right now. Please try again later.');
      return jsonResponse({ message: 'If an account exists for that email, you’ll receive a password reset link. Open it in this browser.' });
    }
    const account = await identity(true);
    const { error } = await account!.client.auth.updateUser({ password: input.password });
    if (error) throw new HttpError(400, 'PASSWORD_FAILED', 'Could not update your password. Try a different password or request a new reset link.');
    return jsonResponse({ redirect: '/account' });
  } catch (error) { return apiError(error); }
}
