import { SiteHeader } from '@/components/layout/site-header';
import { RequestForm } from '@/features/parser/request-form';

const steps = [
  { title: 'Tell us what you love', detail: 'A skill to share, something to learn, or simply a little company. Start in your own words.' },
  { title: 'Meet another generation', detail: 'Find neighbours with a shared interest and something different to bring to the table.' },
  { title: 'Make room for friendship', detail: 'See a suggested place and time at the CC, then let us know who you’d like to meet.' },
];

export default function Home() {
  return <>
    <SiteHeader />
    <main id="main-content" className="mx-auto max-w-7xl px-5 pb-12 pt-6 sm:px-10 lg:pt-7">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <section aria-labelledby="welcome-heading" className="pt-2 lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-kampung-red">Kampung Connect · Pek Kio</p>
          {/* A capped heading and tighter spacing keep the community message in view on laptops. */}
          <h1 id="welcome-heading" className="mt-4 max-w-xl text-[2.5rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl">Find your<br /><span className="text-kampung-red">kampung spirit.</span></h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted">A family recipe. A game of chess. A neighbour who becomes a friend.</p>
          <p className="mt-3 max-w-lg text-base leading-7 text-muted">Pek Kio has so much to share. Connect with neighbours of another generation to teach, learn, or enjoy an activity together.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            {['Senior ↔ Young adult', 'Family ↔ Senior', 'Everyone has something to share'].map(label => <span key={label} className="rounded-full border border-line bg-paper px-3 py-2">{label}</span>)}
          </div>
          <div className="mt-5 max-w-sm border-l-4 border-kampung-orange pl-4"><p className="text-base font-medium leading-6">“Come for the activity.<br />Stay for the company.”</p><p className="mt-2 text-xs leading-5 text-muted">Around your block. Across generations.<br />At Pek Kio Community Centre.</p></div>
        </section>
        <RequestForm />
      </div>
      <section id="how-it-works" aria-labelledby="how-heading" className="mt-16 scroll-mt-8 border-t border-line pt-10 lg:mt-20">
        <p className="text-xs font-bold uppercase tracking-widest text-kampung-red">Small moments. Lasting bonds.</p>
        <h2 id="how-heading" className="mt-3 text-2xl font-semibold tracking-tight">A little closer, in three steps.</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">{steps.map((step, i) => <div key={step.title}><span className="text-sm font-bold text-kampung-red">0{i + 1}</span><h3 className="mt-3 text-lg font-semibold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-muted">{step.detail}</p></div>)}</div>
      </section>
    </main>
    <footer className="border-t border-line"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-7 text-xs leading-6 text-muted sm:px-10"><span>Kampung Connect · Share skills, build bonds.</span><span>Community neighbours + labelled demo profiles · Illustrative facility slots</span></div></footer>
  </>;
}
