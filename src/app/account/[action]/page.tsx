import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/layout/site-header';
import { AuthForm, type AuthAction } from '@/features/auth/auth-form';
export default async function AuthPage({ params, searchParams }: { params: Promise<{ action: string }>; searchParams: Promise<{ link?: string }> }) {
  const { action } = await params;
  if (!['sign-in', 'sign-up', 'forgot-password', 'password'].includes(action)) notFound();
  const query = await searchParams;
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-7xl px-5 py-8 sm:px-10"><AuthForm key={action} action={action as AuthAction} invalidLink={query.link === 'invalid'} /></main></>;
}
