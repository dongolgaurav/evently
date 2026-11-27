import Image from "next/image";
import Link from "next/link";
import { CATEGORY_IMAGES, IMAGES } from "@/lib/images";
import { TEMPLATES } from "@/lib/templates";
import { Icon, Logo, Progress } from "@/components/ui";
import { LandingDemo } from "@/components/landing-demo";

const STEPS = [
  { n: "01", icon: "chat", title: "Describe your event", body: "Type what you want to run in plain English: an overnight hackathon, a speaker panel or a club formal.", sample: "“We want an outdoor film night on the quad for 150 first-years, with popcorn.”" },
  { n: "02", icon: "group_add", title: "Add your team and budget", body: "Tell Evently who is on your board, what each person is good at, and what your grant or ticket budget is.", sample: "5 officers • $2,500 grant" },
  { n: "03", icon: "fact_check", title: "Get your editable plan", body: "Evently drafts the timeline, task delegation, budget split and day-of checklist, ready to edit, print or add to your calendar.", sample: "Calendar file • Run sheet • Roster CSV" },
];
const FEATURES = [
  { icon: "balance", title: "Assigned roles and capacity balancing", body: "Spread the workload evenly. Evently flags anyone over the task cap and can redistribute open tasks in one click.", demo: "load" },
  { icon: "pie_chart", title: "Budget allocation", body: "Split your budget across catering, venue, prizes and a contingency reserve, then log expenses against each line.", demo: "budget" },
  { icon: "view_timeline", title: "Editable minute-by-minute itinerary", body: "A day-of run of show with setup, doors, sessions and clean-up, plus a printable run sheet for volunteers.", demo: "run" },
  { icon: "verified_user", title: "Task tracking and campus approvals", body: "A phased checklist with owners and due dates, plus a list of the approvals student events commonly need.", demo: "check" },
];

function FeatureDemo({ kind }: { kind: string }) {
  if (kind === "load")
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-label-sm">
          <span>Logistics lead: 7 open tasks</span>
          <span className="text-secondary">Over cap</span>
        </div>
        <Progress value={100} tone="orange" />
        <p className="text-body-sm text-on-surface-variant">Suggested: move 3 tasks to the two least-loaded members.</p>
      </div>
    );
  if (kind === "budget")
    return (
      <div className="grid grid-cols-2 gap-2 text-body-sm">
        {[["Food & Catering", "$1,000 (40%)"], ["Venue & AV", "$625 (25%)"], ["Prizes & Swag", "$625 (25%)"], ["Contingency", "$250 (10%)"]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white p-2 shadow-card">
            <div className="text-on-surface-variant">{k}</div>
            <div className="font-semibold">{v}</div>
          </div>
        ))}
      </div>
    );
  if (kind === "run")
    return (
      <ul className="space-y-1.5 text-body-sm">
        {[["09:00 AM", "Setup and sponsor desk arrival"], ["10:00 AM", "Doors open and check-in"], ["11:00 AM", "Opening and kickoff"]].map(([t, x]) => (
          <li key={t} className="flex gap-3 rounded-lg bg-white p-2 shadow-card">
            <b className="text-primary">{t}</b> {x}
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="space-y-1.5 text-body-sm">
      {["Room reservation confirmed in writing", "Event registered and approved", "Food service approval"].map((x) => (
        <li key={x} className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-card">
          <Icon name="check_circle" className="text-[18px] text-emerald-600" /> {x}
        </li>
      ))}
    </ul>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="chip chip-indigo hidden uppercase sm:inline-flex">Beta</span>
          </div>
          <nav className="hidden items-center gap-6 text-label-md text-on-surface-variant md:flex">
            <a href="#features" className="hover:text-on-surface">Features</a>
            <a href="#how-it-works" className="hover:text-on-surface">How it works</a>
            <a href="#demo" className="hover:text-on-surface">Try it</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn btn-primary">Plan Your Event</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="chip chip-orange mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary-container" /> Built for student organisers
            </span>
            <h1 className="text-[2rem] leading-tight font-extrabold tracking-tight sm:text-display-lg">
              Plan your club event in <span className="text-primary-container">minutes</span>, not months.
            </h1>
            <p className="mt-4 max-w-lg text-body-lg text-on-surface-variant">
              Tell Evently your team, budget and idea. Get a full event plan with roles, tasks and a budget, ready to edit.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary h-12 px-6">
                Plan my event <Icon name="auto_awesome" className="text-[18px]" />
              </Link>
              <a href="#how-it-works" className="btn h-12 bg-white px-6 shadow-card">
                <Icon name="play_circle" className="text-[18px]" /> See how it works
              </a>
            </div>
            <p className="mt-4 text-body-sm text-on-surface-variant">Free while in beta. No credit card.</p>
          </div>

          <div className="relative">
            <Image src={IMAGES.hero} alt="Student club organisers planning an event together around a wall calendar" priority placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="h-auto w-full rounded-2xl shadow-xl" />
            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-lift sm:-left-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container to-tertiary-container text-white">
                <Icon name="hub" className="text-[22px]" />
              </span>
              <div>
                <div className="text-label-md font-semibold">7 AI agents</div>
                <div className="text-body-sm text-on-surface-variant">Weather, holidays, budget, sponsors</div>
              </div>
            </div>
            <div className="absolute -top-5 right-4 hidden items-center gap-2 rounded-2xl bg-white p-3 pr-4 shadow-lift sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Icon name="how_to_reg" className="text-[20px]" />
              </span>
              <div>
                <div className="text-label-md font-semibold">RSVPs & QR check-in</div>
                <div className="text-body-sm text-on-surface-variant">No ticketing fees</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
          <p className="mb-6 text-center text-label-sm tracking-wider text-on-surface-variant uppercase">Templates for the events clubs actually run</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {TEMPLATES.slice(0, 5).map((t) => (
              <Link key={t.key} href="/signup" className="group relative overflow-hidden rounded-2xl shadow-card">
                <Image src={CATEGORY_IMAGES[t.category] ?? IMAGES.hero} alt="" placeholder="blur" sizes="(min-width: 768px) 220px, 50vw" className="aspect-[4/3] h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                <div className="absolute right-3 bottom-3 left-3 text-white">
                  <div className="font-display font-bold">{t.name}</div>
                  <div className="text-body-sm text-white/80">~{t.attendees} people</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <span className="chip chip-indigo uppercase">Simple 3-step workflow</span>
            <h2 className="mx-auto mt-3 max-w-2xl text-headline-lg">From fuzzy brainstorm to an executive-ready event plan in 3 steps</h2>
            <p className="mx-auto mt-2 max-w-xl text-on-surface-variant">No complicated software manuals. If your board knows what it wants to achieve, Evently turns it into execution steps.</p>
            <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl bg-surface p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                      <Icon name={s.icon} className="text-[22px]" />
                    </span>
                    <span className="font-display text-headline-md text-outline-variant">{s.n}</span>
                  </div>
                  <h3 className="text-headline-sm">{s.title}</h3>
                  <p className="mt-1 text-on-surface-variant">{s.body}</p>
                  <div className="mt-4 rounded-lg bg-white p-3 text-body-sm text-on-surface-variant shadow-card">{s.sample}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 py-16">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <span className="chip chip-orange uppercase">Built for campus realities</span>
            <h2 className="mx-auto mt-3 max-w-2xl text-headline-lg">Everything university clubs need to execute without burning out</h2>
            <p className="mx-auto mt-2 max-w-xl text-on-surface-variant">Designed to protect your board&apos;s time while still delivering events people turn up to.</p>
            <div className="mt-10 grid gap-4 text-left md:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-6">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                    <Icon name={f.icon} className="text-[22px]" />
                  </span>
                  <h3 className="text-headline-sm">{f.title}</h3>
                  <p className="mt-1 mb-4 text-on-surface-variant">{f.body}</p>
                  <div className="rounded-xl bg-surface-container-low p-3">
                    <FeatureDemo kind={f.demo} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="scroll-mt-16 bg-white py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mb-6 text-center">
              <span className="chip chip-violet uppercase">Interactive playground</span>
              <h2 className="mt-3 text-headline-lg">Try generating a plan right now</h2>
              <p className="mt-2 text-on-surface-variant">Pick a sample event and see the tasks and budget split Evently drafts for it.</p>
            </div>
            <LandingDemo />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-2xl bg-gradient-to-r from-primary-container via-tertiary-container to-primary px-6 py-14 text-center text-white shadow-xl">
            <h2 className="mx-auto max-w-2xl text-headline-lg">Ready to plan your next campus event without the stress?</h2>
            <p className="mx-auto mt-3 max-w-xl text-on-primary-container">Set up your club workspace, add your board and generate your first plan in a few minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn btn-accent h-12 px-6">
                Plan my event — it&apos;s free <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
              <Link href="/login" className="btn h-12 bg-white/15 px-6 text-white hover:bg-white/25">Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <div>
            <Logo />
            <p className="mt-2 text-body-sm text-on-surface-variant">Event planning for student clubs.</p>
          </div>
          <p className="text-body-sm text-on-surface-variant">Not affiliated with any university. Check approvals with your own campus offices.</p>
        </div>
      </footer>
    </div>
  );
}
