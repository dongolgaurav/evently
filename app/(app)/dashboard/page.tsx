import Link from "next/link";
import { getContext } from "@/lib/data";
import { loadClubData } from "@/lib/queries";
import { dueLabel, daysUntil, firstName, fmtDate, money, pct, timeAgo, todayISO } from "@/lib/format";
import type { Activity } from "@/lib/types";
import { EmptyState, Icon, PageHeader, Progress } from "@/components/ui";
import { EventCard, statusChip } from "@/components/event-card";
import { StateForm, SubmitButton } from "@/components/client";
import { loadDemoData } from "@/lib/actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string; welcome?: string }> }) {
  const ctx = await getContext();
  const { view, welcome } = await searchParams;
  const [{ events, tasks, memberById }, activityRes] = await Promise.all([
    loadClubData(ctx),
    ctx.supabase.from("activity").select("*").eq("club_id", ctx.club.id).order("created_at", { ascending: false }).limit(6),
  ]);
  const activity = (activityRes.data ?? []) as Activity[];
  const active = events.filter((e) => e.status !== "completed");
  const eventById = new Map(events.map((e) => [e.id, e]));
  const openTasks = tasks.filter((t) => !t.done && eventById.get(t.event_id)?.status !== "completed");
  const today = todayISO();
  const urgent = openTasks.filter((t) => t.due_date && (daysUntil(t.due_date) ?? 99) <= 3).length;
  const deadlines = openTasks
    .filter((t) => t.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, 4);
  const budgeted = active.reduce((s, e) => s + e.budget_total, 0);
  const cap = ctx.club.semester_budget;
  const rsvps = active.reduce((s, e) => s + e.rsvp_count, 0);
  const seats = active.reduce((s, e) => s + e.capacity, 0);
  const owners = new Set(openTasks.map((t) => t.assignee_id).filter(Boolean)).size;
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {[ctx.club.full_name ?? ctx.club.name, ctx.club.term].filter(Boolean).join(" • ")}
          </>
        }
        title={`Welcome back, ${firstName(ctx.me.full_name)}. Ready for your next campus event?`}
        subtitle={
          active.length
            ? `Your club is running ${active.length} active event${active.length === 1 ? "" : "s"} with ${rsvps} registered student${rsvps === 1 ? "" : "s"}.`
            : "Nothing on the calendar yet. Start with the planner below."
        }
      >
        <div className="flex items-center gap-1.5 rounded-xl bg-surface-container px-4 py-2 text-label-md">
          <Icon name="calendar_month" className="text-[18px] text-primary" />
          {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
        </div>
      </PageHeader>

      {welcome && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
          Your workspace is ready. Next: <Link href="/team#invite" className="font-semibold underline">add your board to the roster</Link>, then plan your first event below.
        </p>
      )}

      <section className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-container via-tertiary-container to-primary p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-label-sm tracking-wide text-tertiary-fixed">
            <Icon name="auto_awesome" className="text-[16px]" /> EVENT PLANNER
          </div>
          <h2 className="mb-2 text-headline-md font-bold">Instant Event Planner</h2>
          <p className="mb-4 max-w-xl text-on-primary-container">
            Describe what you want to run. Evently drafts the roles, phased checklist, budget split and day-of run of show,
            then you edit it with your team.
          </p>
          <form action="/planner" className="flex flex-col items-stretch gap-2 rounded-xl bg-white p-1.5 shadow-md sm:flex-row">
            <div className="flex flex-1 items-center gap-1.5 px-2 text-on-surface">
              <Icon name="edit_note" className="text-[20px] text-primary" />
              <input
                name="concept"
                aria-label="Describe your event"
                className="h-9 w-full bg-transparent text-body-sm outline-none placeholder:text-outline"
                placeholder="e.g. 24-hour hackathon with a $2,500 budget and 6 team leads"
              />
            </div>
            <button className="btn btn-accent">
              Launch Planner <Icon name="bolt" className="text-[18px]" />
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-label-sm text-on-primary-container">
            <span>Start from:</span>
            <Link href="/planner?template=hackathon" className="underline decoration-dotted hover:text-white">
              24h Hackathon
            </Link>
            <Link href="/planner?template=panel" className="underline decoration-dotted hover:text-white">
              Alumni Panel
            </Link>
            <Link href="/templates" className="underline decoration-dotted hover:text-white">
              All templates
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active Events" icon="event_upcoming" box="bg-primary-fixed text-primary" value={String(active.length)} unit="in progress">
          <span className="chip chip-green">{active.filter((e) => e.status !== "draft").length} planning or locked</span>
          <span className="chip chip-slate">{active.filter((e) => e.status === "draft").length} draft</span>
        </Stat>
        <Stat label="Budget Allocated" icon="payments" box="bg-emerald-50 text-emerald-600" value={money(budgeted)} unit={cap ? `of ${money(cap)} cap` : ""}>
          {cap ? (
            <div className="w-full">
              <Progress value={pct(budgeted, cap)} tone={budgeted > cap ? "orange" : "green"} />
              <span className="mt-1 block text-body-sm text-on-surface-variant">
                {budgeted > cap ? `${money(budgeted - cap)} over the semester cap` : `${money(cap - budgeted)} still available`}
              </span>
            </div>
          ) : (
            <Link href="/settings" className="text-body-sm text-primary">
              Set a semester budget cap
            </Link>
          )}
        </Stat>
        <Stat label="Action Items" icon="checklist" box="bg-secondary-fixed text-secondary" value={String(openTasks.length)} unit="tasks remaining">
          {urgent > 0 && <span className="chip chip-orange">{urgent} due within 3 days</span>}
          <span className="text-body-sm text-on-surface-variant">
            {owners ? `Spread across ${owners} ${owners === 1 ? "person" : "people"}` : "None assigned yet"}
          </span>
        </Stat>
        <Stat label="Total Registrations" icon="groups" box="bg-tertiary-fixed text-tertiary" value={String(rsvps)} unit="RSVPs">
          <span className="text-body-sm text-on-surface-variant">{seats ? `Capacity target: ${seats} seats (${pct(rsvps, seats)}% filled)` : "No capacity targets set"}</span>
        </Stat>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-headline-sm">
              Active Event Plans <span className="chip chip-slate">{active.length}</span>
            </h2>
            <div className="flex rounded-xl bg-surface-container p-1">
              {(["grid", "table"] as const).map((v) => (
                <Link
                  key={v}
                  href={`/dashboard?view=${v}`}
                  className={`rounded-lg px-3 py-1 text-label-md capitalize ${(view ?? "grid") === v ? "bg-white font-semibold shadow-sm" : "text-on-surface-variant"}`}
                >
                  {v}
                </Link>
              ))}
            </div>
          </div>
          {active.length === 0 ? (
            <EmptyState icon="event" title="No events on the calendar yet" body="Let's plan something great. Describe your event and get a full plan to edit.">
              <Link href="/planner" className="btn btn-primary">
                Plan your first event
              </Link>
              {ctx.me.is_admin && (
                <StateForm action={loadDemoData}>
                  <SubmitButton className="btn btn-soft" pendingText="Loading demo…">
                    <Icon name="rocket_launch" className="text-[18px] text-tertiary" /> Load demo events
                  </SubmitButton>
                </StateForm>
              )}
              <Link href="/templates" className="btn btn-soft">
                Browse templates
              </Link>
            </EmptyState>
          ) : view === "table" ? (
            <div className="card overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-label-sm text-on-surface-variant">
                  <tr>
                    {["Event", "Date", "Status", "Budget", "Readiness"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">
                        <Link href={`/events/${e.id}`} className="hover:text-primary">
                          {e.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmtDate(e.event_date)}</td>
                      <td className="px-4 py-3">{statusChip(e.status)}</td>
                      <td className="px-4 py-3">{money(e.budget_total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Progress value={e.readiness} />
                          </div>
                          {e.readiness}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section id="deadlines" className="card scroll-mt-20 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-headline-sm">
              <Icon name="alarm" className="text-[22px] text-secondary" /> Crucial Deadlines
            </h2>
            {deadlines.length === 0 ? (
              <p className="text-on-surface-variant">No dated tasks are open. You&apos;re clear.</p>
            ) : (
              <ul className="space-y-3">
                {deadlines.map((t) => {
                  const late = t.due_date! < today;
                  const soon = (daysUntil(t.due_date) ?? 99) <= 3;
                  return (
                    <li key={t.id} className="rounded-xl bg-surface-container-low p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/events/${t.event_id}?tab=tasks`} className="min-w-0 text-label-md font-semibold hover:text-primary">
                          {t.title}
                        </Link>
                        <span className={`chip ${late ? "chip-red" : soon ? "chip-orange" : "chip-slate"}`}>{dueLabel(t.due_date)}</span>
                      </div>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        {eventById.get(t.event_id)?.title}
                        {t.assignee_id && memberById.get(t.assignee_id) ? ` • ${memberById.get(t.assignee_id)!.full_name}` : " • Unassigned"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/events?q=" className="btn btn-soft mt-4 w-full">
              View all {openTasks.length} action items <Icon name="chevron_right" className="text-[18px]" />
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-headline-sm">Team Activity</h2>
            {activity.length === 0 ? (
              <p className="text-on-surface-variant">Activity from your team shows up here as you plan.</p>
            ) : (
              <ul className="space-y-4">
                {activity.map((a, i) => (
                  <li key={a.id} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${["bg-emerald-500", "bg-primary", "bg-secondary-container"][i % 3]}`} />
                    <div>
                      <p>
                        <span className="font-semibold">{a.actor_name}</span> {a.message}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">{timeAgo(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-tertiary-fixed to-primary-fixed p-6">
            <div className="mb-1 flex items-center gap-1.5 text-label-sm tracking-wider text-tertiary uppercase">
              <Icon name="lightbulb" className="text-[18px]" /> Planning tip
            </div>
            <h3 className="text-headline-sm">Test the AV three days out</h3>
            <p className="mt-1 text-on-surface-variant">
              Book ten minutes in the room a few days before the event to check microphones, adapters and the projector with
              the laptop you&apos;ll actually use. It leaves time to borrow what&apos;s missing.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, icon, box, value, unit, children }: { label: string; icon: string; box: string; value: string; unit: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col justify-between p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-label-sm text-on-surface-variant">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${box}`}>
          <Icon name={icon} className="text-[18px]" />
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-headline-lg font-extrabold">{value}</span>
          <span className="text-label-sm text-on-surface-variant">{unit}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{children}</div>
      </div>
    </div>
  );
}
