import Link from "next/link";
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

          <div className="card p-6 shadow-lift" aria-label="Example event plan">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                  <Icon name="terminal" className="text-[22px]" />
                </span>
                <div>
                  <div className="font-display text-headline-sm">Fall Campus Hackathon</div>
                  <div className="text-body-sm text-on-surface-variant">Student Union Ballroom • 150 hackers</div>
                </div>
              </div>
              <span className="chip chip-green">78% ready</span>
            </div>
            <div className="mt-5 text-label-sm tracking-wider text-on-surface-variant uppercase">Roles & workload</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[["President", "4 tasks", "bg-emerald-500"], ["VP Logistics", "6 tasks", "bg-secondary-container"], ["Treasurer", "3 tasks", "bg-emerald-500"]].map(([r, n, c]) => (
                <div key={r} className="rounded-lg bg-surface-container-low p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm">{r}</span>
                    <span className={`h-2 w-2 rounded-full ${c}`} />
                  </div>
                  <div className="text-body-sm text-on-surface-variant">{n}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-surface-container-low p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span>
                  <b className="font-display text-headline-sm">$1,980</b> <span className="text-on-surface-variant">/ $2,500 spent</span>
                </span>
                <span className="text-label-sm text-emerald-700">$520 remaining</span>
              </div>
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-container-high">
                <div className="w-[34%] bg-primary" />
                <div className="w-[25%] bg-tertiary-container" />
                <div className="w-[14%] bg-secondary-container" />
                <div className="w-[6%] bg-emerald-500" />
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {[["Secure the ballroom booking", "4 weeks out", true], ["Order hoodies and sponsor stickers", "2 weeks out", false], ["Lock in midnight pizza and dietary options", "1 week out", false]].map(([t, w, d]) => (
                <li key={String(t)} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2 text-body-sm">
                  <span className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded ${d ? "bg-primary-container text-white" : "border border-slate-300 bg-white"}`}>
                      {d && <Icon name="check" className="text-[12px]" />}
                    </span>
                    <span className={d ? "text-on-surface-variant line-through" : ""}>{t}</span>
                  </span>
                  <span className="chip chip-slate">{w}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-badge-xs text-on-surface-variant">Illustrative example</p>
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
