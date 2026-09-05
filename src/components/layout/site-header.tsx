import Link from 'next/link';
export function SiteHeader() {
  return <header className="border-b border-line bg-paper/60">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-paper focus:p-4">Skip to content</a>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-10">
      <Link href="/" className="text-2xl font-bold tracking-tight">kaki<span className="text-kampung-red">finder</span><span className="text-kampung-orange">.</span></Link>
      <nav className="flex items-center gap-5 text-sm font-semibold" aria-label="Main navigation"><Link className="min-h-11 content-center text-muted hover:text-kampung-red" href="/#how-it-works">How it works</Link><Link className="inline-flex min-h-11 items-center rounded-full border border-kampung-red/25 px-4 text-kampung-red hover:bg-cream" href="/#find-kaki">Find a kaki</Link></nav>
    </div>
  </header>;
}
