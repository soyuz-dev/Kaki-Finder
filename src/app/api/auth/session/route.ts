import { accountsEnabled, identity } from '@/lib/auth/server';
import { apiError, jsonResponse } from '@/lib/api/http';
export async function GET() {
  try {
    const account = await identity();
    return jsonResponse({ enabled: accountsEnabled(), user: account ? { id: account.user.id, email: account.user.email } : null });
  } catch (error) { return apiError(error); }
}
