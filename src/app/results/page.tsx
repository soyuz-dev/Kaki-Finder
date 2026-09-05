import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { ResultsClient } from '@/features/matching/results-client';

export const metadata: Metadata = { title: 'Your kakis' };
export default function ResultsPage() {
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-7xl px-5 py-10 sm:px-10 sm:py-14"><ResultsClient /></main></>;
}
