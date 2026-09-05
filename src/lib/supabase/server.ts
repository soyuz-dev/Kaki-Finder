import 'server-only';
import { createClient } from '@supabase/supabase-js';
/** For trusted server repositories only; this is not a signed-in user client. */
export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  // Read optional config only when used so a keyless build still works.
  if (!url || !secretKey) return null;
  // Secret clients bypass RLS. Future account routes need a separate cookie-aware
  // user client so private records are protected by user ownership policies.
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
