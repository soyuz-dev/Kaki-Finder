import { SiteHeader } from '@/components/layout/site-header';
import { AccountDashboard } from '@/features/auth/account-dashboard';
export const metadata = { title: 'My account', robots: { index: false, follow: false } };
export default function AccountPage() {
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-5xl px-5 py-8 sm:px-10"><AccountDashboard /></main></>;
}
