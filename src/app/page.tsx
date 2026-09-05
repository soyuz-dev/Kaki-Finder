import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { Card } from '@/components/ui/card';

const activities = [
  { label: 'Share what you know', example: '“I’d love to teach chess to a neighbour.”', detail: 'Decades of experience. A new perspective. Everyone has something to share.' },
  { label: 'Learn something together', example: '“Can someone teach me Hokkien cooking?”', detail: 'Discover a family recipe, a new language, or a skill you’ve always wanted to try.' },
  { label: 'Find a little company', example: '“Anyone free for badminton on Tuesday?”', detail: 'A friendly game is a lovely place to start a friendship.' },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-6xl px-6 pb-12 pt-12 sm:px-10 md:pt-20">
        <section className="max-w-3xl" aria-labelledby="welcome-heading">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-kampung-red">Pek Kio · A neighbourhood for every generation</p>
          <h1 id="welcome-heading" className="text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Find your<br /><span className="text-kampung-red">kampung spirit.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">Your next teacher, learner, or badminton kaki could live just a block away. Share skills and build bonds with neighbours of every generation.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            {['Senior ↔ Young adult', 'Family ↔ Senior', 'Neighbours ↔ Friends'].map(label => <span key={label} className="rounded-full border border-line bg-paper px-4 py-2">{label}</span>)}
          </div>
        </section>
        <section className="mt-12 grid gap-5 md:grid-cols-3" aria-label="Ways to connect">
          {activities.map(activity => <Card key={activity.label}>
            <h2 className="text-xl font-semibold">{activity.label}</h2>
            <p className="mt-5 text-lg leading-7 text-kampung-red">{activity.example}</p>
            <p className="mt-4 leading-7 text-muted">{activity.detail}</p>
          </Card>)}
        </section>
        <aside className="mt-8 flex flex-col justify-between gap-5 rounded-2xl border border-line px-6 py-5 sm:flex-row sm:items-center" aria-label="Demo status">
          <div><p className="font-semibold">A little kampung is taking shape.</p><p className="mt-1 text-sm leading-6 text-muted">Matching and interest recording are coming next. This is the project starter.</p></div>
          <Link href="/results" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-kampung-red px-6 py-3 font-semibold text-white hover:bg-[#a71931]">View results page →</Link>
        </aside>
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-sm text-muted sm:px-10">Kampung Connect · Share skills, build bonds.</footer>
    </>
  );
}
