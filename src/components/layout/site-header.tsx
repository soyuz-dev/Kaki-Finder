import Link from 'next/link';
export function SiteHeader() {
  return <header className="border-b border-line">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-paper focus:p-4">Skip to content</a>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 sm:px-10">
      <Link href="/" className="text-2xl font-bold tracking-tight">kaki<span className="text-kampung-red">finder</span><span className="text-kampung-orange">.</span></Link>
      <span className="text-sm text-muted">Made for connection. Rooted in Pek Kio.</span>
    </div>
  </header>;
}
