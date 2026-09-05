import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
export const metadata: Metadata = { title: 'Your kakis' };
export default function ResultsPage() {
  return <>
    <SiteHeader />
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-bold uppercase tracking-widest text-kampung-red">Your neighbourhood connections</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">A new friendship starts here.</h1>
      <p className="mt-6 text-lg leading-8 text-muted">Soon, this page will introduce your potential kakis, what you can share, and a suggested time to meet at the CC.</p>
      <p className="mt-5 leading-7 text-muted">This starter has no matching results yet.</p>
      <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-kampung-red px-6 py-3 font-semibold text-white hover:bg-[#a71931]">Back to the kampung</Link>
    </main>
  </>;
}
