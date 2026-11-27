import Image from "next/image";
import Link from "next/link";
import { categoryImage } from "@/lib/images";
import { loadEvent } from "@/lib/event-data";
import {
  addBudgetItem, addPhase, addTask, addTimelineItem, deleteBudgetItem, deleteEvent, deletePhase, deleteTask,
  deleteTimelineItem, logExpense, rebalanceTasks, removeEventRole, saveFunding, setEventRole, toggleTask,
  updateBudgetItem, updateEvent, updateTask,
} from "@/lib/actions";
import { CATEGORIES, STATUS_LABEL, type Member, type Phase, type Task } from "@/lib/types";
import { dueLabel, fmtDate, fmtTime, fmtWeekday, money, pct, shortName, timeAgo, todayISO } from "@/lib/format";
import { Avatar, AvatarStack, Icon, Progress } from "@/components/ui";
import { AutoInput, AutoSelect, SubmitButton } from "@/components/client";
import { WorkflowTrace } from "@/components/workflow-trace";
import { GuestsTab } from "@/components/guests-tab";
import { qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/site";

const TABS = [
  { key: "overview", label: "Overview & Itinerary", icon: "space_dashboard" },
  { key: "tasks", label: "Tasks & Checklist", icon: "checklist" },
  { key: "roles", label: "Roles & Commitments", icon: "badge" },
  { key: "budget", label: "Budget & Expenses", icon: "account_balance_wallet" },
  { key: "run", label: "Day-of Run of Show", icon: "schedule" },
  { key: "guests", label: "Guests & Check-in", icon: "how_to_reg" },
  { key: "workflow", label: "AI Workflow", icon: "hub" },
  { key: "details", label: "Details", icon: "tune" },
];
const BAR_COLORS = ["bg-primary", "bg-tertiary-container", "bg-secondary-container", "bg-emerald-500", "bg-sky-500", "bg-amber-500"];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; moved?: string; q?: string }> };

export async function generateMetadata({ params }: Props) {
  const { event } = await loadEvent((await params).id);
  return { title: event.title };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "overview";
  const data = await loadEvent(id);
  const { ctx, event, phases, tasks, budget, timeline, roles, members, memberById, rsvps } = data;
  const publicUrl = event.public_page && event.slug ? `${await siteUrl()}/e/${event.slug}` : null;
  const qr = tab === "guests" && publicUrl ? await qrSvg(publicUrl) : null;
  const today = todayISO();
  const work = tasks.filter((t) => t.kind === "task");
  const compliance = tasks.filter((t) => t.kind === "compliance");
  const done = tasks.filter((t) => t.done).length;
  const readiness = pct(done, tasks.length);
  const overdue = tasks.filter((t) => !t.done && t.due_date && t.due_date < today).length;
  const spent = budget.reduce((s, b) => s + b.spent, 0);
  const allocated = budget.reduce((s, b) => s + b.allocated, 0);
  const base = `/events/${event.id}`;
  const health = event.status === "completed" ? "Completed" : overdue ? "At Risk" : tasks.length && readiness === 100 ? "Ready" : "On Track";
  const team = [...new Set([...roles.map((r) => r.member_id), ...tasks.map((t) => t.assignee_id).filter(Boolean)] as string[])]
    .map((mid) => memberById.get(mid)?.full_name)
    .filter(Boolean) as string[];

  const budgetCard = (
    <section className="card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
          <Icon name="account_balance_wallet" className="text-[22px]" />
        </span>
        <h2 className="text-headline-sm">Budget Breakdown</h2>
      </div>
      <div className="rounded-xl bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-headline-lg font-extrabold">{money(spent)}</div>
            <div className="text-on-surface-variant">spent of {money(event.budget_total)}</div>
          </div>
          <span className={`chip ${event.budget_total - spent < 0 ? "chip-red" : "chip-green"}`}>
            <Icon name="savings" className="text-[14px]" />
            {event.budget_total - spent < 0 ? `${money(spent - event.budget_total)} over` : `${money(event.budget_total - spent)} remaining`}
          </span>
        </div>
        <div className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-container-high">
          {budget.map((b, i) => (
            <div key={b.id} className={BAR_COLORS[i % BAR_COLORS.length]} style={{ width: `${pct(b.spent, Math.max(event.budget_total, spent))}%` }} />
          ))}
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {budget.map((b, i) => (
          <li key={b.id}>
            <div className="mb-1 flex justify-between gap-2 text-label-md">
              <span className="flex items-center gap-2 font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                {b.category}
              </span>
              <span>
                <b>{money(b.spent)}</b> / {money(b.allocated)} <span className="text-primary">({pct(b.spent, b.allocated)}%)</span>
              </span>
            </div>
            <Progress value={pct(b.spent, b.allocated)} tone={b.spent > b.allocated ? "orange" : "primary"} />
          </li>
        ))}
        {budget.length === 0 && <li className="text-on-surface-variant">No budget lines yet.</li>}
      </ul>
      {event.budget_total - allocated !== 0 && budget.length > 0 && (
        <p className="mt-4 rounded-xl bg-tertiary-fixed/50 p-3 text-body-sm">
          <b>{money(Math.abs(event.budget_total - allocated))}</b>{" "}
          {event.budget_total > allocated ? "of the budget is not allocated to any line yet." : "more is allocated than the total budget."}
        </p>
      )}
      <Link href={`${base}?tab=budget`} className="btn btn-soft mt-4 w-full">
        Manage budget
      </Link>
    </section>
  );

  const timelineCard = (editable: boolean) => (
    <section className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
            <Icon name="schedule" className="text-[22px]" />
          </span>
          <div>
            <h2 className="text-headline-sm">Day-of Run of Show</h2>
            <p className="text-on-surface-variant">{fmtWeekday(event.event_date)}</p>
          </div>
        </div>
        {!editable && (
          <Link href={`${base}?tab=run`} className="flex items-center gap-1 text-label-md font-semibold text-primary">
            <Icon name="edit_calendar" className="text-[18px]" /> Edit
          </Link>
        )}
      </div>
      <ol className="relative ml-1.5 space-y-5 border-l-2 border-surface-container-high pl-5">
        {timeline.map((t, i) => (
          <li key={t.id} className="relative">
            <span className={`absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white ${BAR_COLORS[i % 3]}`} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-md font-bold text-primary">{fmtTime(t.start_time)}</span>
              <span className="flex items-center gap-1">
                {t.location && <span className="chip chip-slate">{t.location}</span>}
                {editable && (
                  <form action={deleteTimelineItem}>
                    <input type="hidden" name="id" value={t.id} />
                    <button aria-label={`Delete ${t.title}`} className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </form>
                )}
              </span>
            </div>
            <div className="font-semibold">{t.title}</div>
            {t.detail && <p className="text-body-sm text-on-surface-variant">{t.detail}</p>}
          </li>
        ))}
        {timeline.length === 0 && <li className="text-on-surface-variant">No timeslots yet.</li>}
      </ol>
      {editable && (
        <form action={addTimelineItem} className="mt-6 grid gap-2 rounded-xl bg-surface-container-low p-3 sm:grid-cols-[120px_1fr_1fr]">
          <input type="hidden" name="event_id" value={event.id} />
          <input className="input" type="time" name="start_time" aria-label="Start time" required />
          <input className="input" name="title" placeholder="What happens" required />
          <input className="input" name="location" placeholder="Where (optional)" />
          <input className="input sm:col-span-2" name="detail" placeholder="Who leads it, notes (optional)" />
          <SubmitButton className="btn btn-primary">Add timeslot</SubmitButton>
        </form>
      )}
      <Link href={`${base}/run-sheet`} className="btn btn-soft mt-4 w-full">
        <Icon name="print" className="text-[18px]" /> View printable run sheet
      </Link>
    </section>
  );

  return (
    <>
      <div className="flex flex-col justify-between gap-4 pt-6 pb-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <Image src={categoryImage(event.category)} alt="" priority placeholder="blur" sizes="128px" className="h-20 w-28 shrink-0 rounded-2xl object-cover shadow-card" />
          <div className="min-w-0">
            <h1 className="text-headline-lg tracking-tight">{event.title}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-on-surface-variant">
              Organised by <b className="text-on-surface">{ctx.club.name}</b>
              <span className={`chip ${event.plan_source?.startsWith("ai") ? "chip-violet" : "chip-slate"}`}>
                <Icon name="auto_awesome" className="text-[13px]" />
                {event.plan_source?.startsWith("ai") ? "Planned by AI agents" : event.plan_source === "template" ? "Generated plan" : "Manual plan"}
              </span>
              <span>Updated {timeAgo(event.updated_at)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`${base}/calendar`} className="btn btn-soft bg-white shadow-card">
            <Icon name="ios_share" className="text-[18px]" /> Export to Calendar
          </a>
          <form action={updateEvent}>
            <input type="hidden" name="id" value={event.id} />
            <AutoSelect name="status" defaultValue={event.status} aria-label="Event status" className="btn btn-soft bg-white pr-2 shadow-card">
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </AutoSelect>
          </form>
          <form action={rebalanceTasks}>
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="back" value={`${base}?tab=tasks`} />
            <SubmitButton className="btn btn-ai" pendingText="Balancing…">
              <Icon name="bolt" className="text-[18px]" /> Auto-balance Tasks
            </SubmitButton>
          </form>
        </div>
      </div>

      {sp.moved !== undefined && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-emerald-800">
          {Number(sp.moved) > 0 ? `Reassigned ${sp.moved} task${sp.moved === "1" ? "" : "s"} to even out the load.` : "Task loads are already balanced, so nothing was moved."}
        </p>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon="check_circle" box="bg-emerald-50 text-emerald-600" label="Status" value={health} extra={<span className={`chip ${overdue ? "chip-orange" : "chip-green"}`}>{overdue ? `${overdue} overdue` : `${readiness}% ready`}</span>} />
        <Tile icon="calendar_today" box="bg-primary-fixed text-primary" label="Date & Shift" value={fmtDate(event.event_date)} sub={event.time_window ?? event.venue ?? "Time TBD"} />
        <Tile icon="payments" box="bg-secondary-fixed text-secondary" label="Committed Budget" value={money(spent)} sub={`/ ${money(event.budget_total)}`} inline />
        <div className="card flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
            <Icon name="groups" className="text-[24px]" />
          </span>
{event.public_page || rsvps.length > 0 ? (
            <Link href={`${base}?tab=guests`} className="min-w-0 hover:text-primary">
              <div className="text-label-sm tracking-wider text-on-surface-variant uppercase">Confirmed RSVPs</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-headline-sm">{event.rsvp_count}</span>
                <span className="text-on-surface-variant">
                  / {event.capacity} cap · {rsvps.filter((r) => r.checked_in_at).length} checked in
                </span>
              </div>
            </Link>
          ) : (
                    <form action={updateEvent} className="min-w-0">
            <input type="hidden" name="id" value={event.id} />
            <label htmlFor="rsvp" className="text-label-sm tracking-wider text-on-surface-variant uppercase">
              Confirmed RSVPs
            </label>
            <div className="flex items-baseline gap-1">
              <input id="rsvp" name="rsvp_count" type="number" min={0} defaultValue={event.rsvp_count} className="w-16 rounded-md bg-transparent font-display text-headline-sm outline-none hover:bg-surface-container-low focus:bg-surface-container-low" />
              <span className="text-on-surface-variant">/ {event.capacity} cap ({pct(event.rsvp_count, event.capacity)}%)</span>
              <SubmitButton className="btn btn-sm btn-soft ml-1">Save</SubmitButton>
            </div>
          </form>
          )}
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-container p-1" aria-label="Event sections">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`${base}?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-label-md whitespace-nowrap ${tab === t.key ? "bg-white font-semibold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <Icon name={t.icon} className="text-[18px]" />
              {t.label}
              {t.key === "tasks" && <span className="chip chip-slate">{work.length}</span>}
              {t.key === "roles" && <span className="chip chip-slate">{roles.length}</span>}
              {t.key === "guests" && <span className="chip chip-slate">{rsvps.filter((r) => r.status === "going").length}</span>}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <AvatarStack names={team} />
          <Link href="/team" className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
            <Icon name="person_add" className="text-[18px]" /> Invite
          </Link>
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-3">
            {event.plan_summary && (
              <section className="flex gap-4 rounded-2xl bg-gradient-to-r from-tertiary-fixed to-primary-fixed p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Icon name="psychology" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-headline-sm">Plan summary</h2>
                  <p className="mt-1 text-on-surface-variant">{event.plan_summary}</p>
                </div>
              </section>
            )}
            <PhaseList base={base} phases={phases} tasks={work} members={members} memberById={memberById} eventId={event.id} editable={false} today={today} />
          </div>
          <div className="space-y-6 xl:col-span-2">
            {budgetCard}
            {timelineCard(false)}
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <PhaseList base={base} phases={phases} tasks={work} members={members} memberById={memberById} eventId={event.id} editable today={today} />
            <form action={addPhase} className="card flex flex-wrap items-end gap-3 p-4">
              <input type="hidden" name="event_id" value={event.id} />
              <label className="min-w-40 flex-1">
                <span className="field-label">New phase</span>
                <input className="input" name="name" placeholder="Phase 5: Follow-up" required />
              </label>
              <label className="min-w-40 flex-1">
                <span className="field-label">Subtitle</span>
                <input className="input" name="subtitle" placeholder="What this phase covers" />
              </label>
              <SubmitButton className="btn btn-soft">Add phase</SubmitButton>
            </form>
          </div>
          <section className="card h-fit p-6">
            <h2 className="mb-1 flex items-center gap-2 text-headline-sm">
              <Icon name="verified_user" className="text-[22px] text-emerald-600" /> Campus Compliance Checklist
            </h2>
            <p className="mb-4 text-body-sm text-on-surface-variant">Approvals to confirm with your own campus offices. Requirements differ between universities.</p>
            <ul className="space-y-2">
              {compliance.map((t) => (
                <TaskRow key={t.id} task={t} members={members} memberById={memberById} editable compact today={today} />
              ))}
              {compliance.length === 0 && <li className="text-on-surface-variant">Nothing listed yet.</li>}
            </ul>
            <form action={addTask} className="mt-4 space-y-2">
              <input type="hidden" name="event_id" value={event.id} />
              <input type="hidden" name="kind" value="compliance" />
              <input className="input" name="title" placeholder="e.g. Fire marshal sign-off" aria-label="New compliance item" required />
              <input className="input" name="tag" placeholder="Office that handles it (optional)" aria-label="Office" />
              <SubmitButton className="btn btn-soft w-full">Add compliance item</SubmitButton>
            </form>
          </section>
        </div>
      )}

      {tab === "roles" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="card p-6 xl:col-span-2">
            <h2 className="mb-4 text-headline-sm">Roles & Commitments</h2>
            <ul className="space-y-3">
              {roles.map((r) => {
                const m = memberById.get(r.member_id);
                if (!m) return null;
                const mine = work.filter((t) => t.assignee_id === m.id);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                    <Avatar name={m.full_name} size={40} />
                    <div className="min-w-40 flex-1">
                      <div className="font-semibold">{m.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">{m.title ?? "Member"}</div>
                    </div>
                    <form action={setEventRole} className="flex min-w-60 flex-[2] gap-2">
                      <input type="hidden" name="event_id" value={event.id} />
                      <input type="hidden" name="member_id" value={m.id} />
                      <input className="input" name="responsibility" defaultValue={r.responsibility} aria-label={`Responsibility for ${m.full_name}`} />
                      <SubmitButton className="btn btn-soft">Save</SubmitButton>
                    </form>
                    <span className="chip chip-indigo">
                      {mine.filter((t) => !t.done).length} open / {mine.length} tasks
                    </span>
                    <form action={removeEventRole}>
                      <input type="hidden" name="id" value={r.id} />
                      <button aria-label={`Remove ${m.full_name} from this event`} className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                        <Icon name="close" className="text-[18px]" />
                      </button>
                    </form>
                  </li>
                );
              })}
              {roles.length === 0 && <li className="text-on-surface-variant">Nobody has a role on this event yet.</li>}
            </ul>
          </section>
          <section className="card h-fit p-6">
            <h2 className="mb-4 text-headline-sm">Add someone to this event</h2>
            <form action={setEventRole} className="space-y-3">
              <input type="hidden" name="event_id" value={event.id} />
              <label className="block">
                <span className="field-label">Team member</span>
                <select className="input" name="member_id" required defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {members.filter((m) => !roles.some((r) => r.member_id === m.id)).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                      {m.title ? ` — ${m.title}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">What they own</span>
                <input className="input" name="responsibility" placeholder="AV setup and overnight power" required />
              </label>
              <SubmitButton className="btn btn-primary w-full">Add role</SubmitButton>
            </form>
            <Link href="/team" className="mt-3 block text-center text-label-md text-primary">
              Manage the full roster
            </Link>
          </section>
        </div>
      )}

      {tab === "budget" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="card p-6 xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-headline-sm">Budget lines</h2>
              <span className="text-on-surface-variant">
                {money(allocated)} allocated • {money(spent)} spent • {money(event.budget_total)} total
              </span>
            </div>
            <ul className="space-y-3">
              {budget.map((b, i) => (
                <li key={b.id} className="rounded-xl bg-surface-container-low p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                    <form action={updateBudgetItem} className="flex min-w-60 flex-1 flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <input className="input min-w-32 flex-1" name="category" defaultValue={b.category} aria-label="Category" />
                      <label className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                        Allocated $
                        <input className="input w-24" name="allocated" type="number" min={0} step="1" defaultValue={b.allocated} />
                      </label>
                      <label className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                        Spent $
                        <input className="input w-24" name="spent" type="number" min={0} step="0.01" defaultValue={b.spent} />
                      </label>
                      <SubmitButton className="btn btn-soft bg-white">Save</SubmitButton>
                    </form>
                    <form action={deleteBudgetItem}>
                      <input type="hidden" name="id" value={b.id} />
                      <button aria-label={`Delete ${b.category}`} className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </form>
                  </div>
                  <div className="mt-2">
                    <Progress value={pct(b.spent, b.allocated)} tone={b.spent > b.allocated ? "orange" : "primary"} />
                  </div>
                  <form action={logExpense} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input className="input input-sm w-28" name="amount" type="number" min={0} step="0.01" placeholder="Amount $" aria-label="Expense amount" required />
                    <input className="input input-sm min-w-32 flex-1" name="note" placeholder="What was it for? (optional)" aria-label="Expense note" />
                    <SubmitButton className="btn btn-sm btn-primary">Log expense</SubmitButton>
                  </form>
                </li>
              ))}
              {budget.length === 0 && <li className="text-on-surface-variant">No budget lines yet. Add the first one below.</li>}
            </ul>
            <form action={addBudgetItem} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="event_id" value={event.id} />
              <label className="min-w-40 flex-1">
                <span className="field-label">New line</span>
                <input className="input" name="category" placeholder="Photography" required />
              </label>
              <label>
                <span className="field-label">Allocated ($)</span>
                <input className="input w-32" name="allocated" type="number" min={0} defaultValue={0} />
              </label>
              <SubmitButton className="btn btn-primary">Add line</SubmitButton>
            </form>
          </section>
          <div className="space-y-6">
            <section className="card p-6">
              <h2 className="mb-4 text-headline-sm">Total budget</h2>
              <form action={updateEvent} className="flex items-end gap-2">
                <input type="hidden" name="id" value={event.id} />
                <label className="flex-1">
                  <span className="field-label">Total available ($)</span>
                  <input className="input" name="budget_total" type="number" min={0} defaultValue={event.budget_total} />
                </label>
                <SubmitButton className="btn btn-soft">Save</SubmitButton>
              </form>
            </section>
            <section className="card p-6">
              <h2 className="mb-4 text-headline-sm">Funding sources</h2>
              <ul className="space-y-2">
                {event.funding_sources.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                      {f.name}
                    </span>
                    <span className="flex items-center gap-2 font-semibold">
                      {money(f.amount)}
                      <form action={saveFunding}>
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="remove" value={i} />
                        <button aria-label={`Remove ${f.name}`} className="rounded p-0.5 text-on-surface-variant hover:text-error">
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
                {event.funding_sources.length === 0 && <li className="text-on-surface-variant">No sources recorded.</li>}
              </ul>
              <form action={saveFunding} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={event.id} />
                <input className="input" name="name" placeholder="Student union grant" aria-label="Source name" required />
                <input className="input w-24" name="amount" type="number" min={0} placeholder="$" aria-label="Source amount" />
                <SubmitButton className="btn btn-soft">Add</SubmitButton>
              </form>
            </section>
          </div>
        </div>
      )}

      {tab === "run" && <div className="mx-auto max-w-3xl">{timelineCard(true)}</div>}

      {tab === "workflow" && <WorkflowTrace trace={event.agent_trace} />}

      {tab === "guests" && <GuestsTab event={event} rsvps={rsvps} publicUrl={publicUrl} qr={qr} q={sp.q ?? ""} />}

      {tab === "details" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="card p-6 xl:col-span-2">
            <h2 className="mb-4 text-headline-sm">Event details</h2>
            <form action={updateEvent} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={event.id} />
              <label className="sm:col-span-2">
                <span className="field-label">Title</span>
                <input className="input" name="title" defaultValue={event.title} required minLength={2} />
              </label>
              <label>
                <span className="field-label">Category</span>
                <select className="input" name="category" defaultValue={event.category}>
                  {CATEGORIES.map((c) => (
                    <option key={c.key}>{c.key}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Date</span>
                <input className="input" type="date" name="event_date" defaultValue={event.event_date ?? ""} />
              </label>
              <label>
                <span className="field-label">Time window</span>
                <input className="input" name="time_window" defaultValue={event.time_window ?? ""} placeholder="6:00–9:00 PM" />
              </label>
              <label>
                <span className="field-label">Venue</span>
                <input className="input" name="venue" defaultValue={event.venue ?? ""} />
              </label>
              <label>
                <span className="field-label">City / campus location</span>
                <input className="input" name="location" defaultValue={event.location ?? ""} placeholder="Austin, TX" />
              </label>
              <label>
                <span className="field-label">Capacity</span>
                <input className="input" type="number" min={0} name="capacity" defaultValue={event.capacity} />
              </label>
              <label className="sm:col-span-2">
                <span className="field-label">Concept & constraints</span>
                <textarea className="input" name="concept" rows={4} defaultValue={event.concept ?? ""} />
              </label>
              <div className="sm:col-span-2">
                <SubmitButton pendingText="Saving…">Save details</SubmitButton>
              </div>
            </form>
            <p className="mt-3 text-body-sm text-on-surface-variant">Changing the date does not move task due dates; adjust those on the Tasks tab.</p>
          </section>
          <section className="card h-fit p-6">
            <h2 className="mb-2 text-headline-sm">Delete event</h2>
            <p className="mb-4 text-on-surface-variant">Removes the event with its tasks, budget and run of show. This cannot be undone.</p>
            <details>
              <summary className="btn btn-danger">Delete this event…</summary>
              <form action={deleteEvent} className="mt-3">
                <input type="hidden" name="id" value={event.id} />
                <SubmitButton className="btn btn-danger w-full" pendingText="Deleting…">
                  Yes, permanently delete “{event.title}”
                </SubmitButton>
              </form>
            </details>
          </section>
        </div>
      )}
    </>
  );
}

function Tile({ icon, box, label, value, sub, extra, inline }: { icon: string; box: string; label: string; value: string; sub?: string; extra?: React.ReactNode; inline?: boolean }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${box}`}>
        <Icon name={icon} className="text-[24px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-label-sm tracking-wider text-on-surface-variant uppercase">{label}</div>
        <div className={inline ? "flex items-baseline gap-1.5" : ""}>
          <div className="font-display text-headline-sm">{value}</div>
          {sub && <div className="truncate text-on-surface-variant">{sub}</div>}
        </div>
      </div>
      {extra}
    </div>
  );
}

type ListProps = { base: string; phases: Phase[]; tasks: Task[]; members: Member[]; memberById: Map<string, Member>; eventId: string; editable: boolean; today: string };

function PhaseList({ base, phases, tasks, members, memberById, eventId, editable, today }: ListProps) {
  const loose = tasks.filter((t) => !t.phase_id);
  const groups = [...phases.map((p) => ({ phase: p as Phase | null, items: tasks.filter((t) => t.phase_id === p.id) })), ...(loose.length || phases.length === 0 ? [{ phase: null, items: loose }] : [])];
  return (
    <>
      {groups.map(({ phase, items }) => {
        const done = items.filter((t) => t.done).length;
        const p = pct(done, items.length);
        const state = items.length === 0 ? "Empty" : p === 100 ? "Done" : done > 0 ? "In Progress" : "Pending";
        return (
          <section key={phase?.id ?? "loose"} className={`card p-6 ${state === "In Progress" ? "border-l-4 border-secondary-container" : ""}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${state === "Done" ? "bg-emerald-50 text-emerald-600" : state === "In Progress" ? "bg-secondary-fixed text-secondary" : "bg-surface-container-high text-on-surface-variant"}`}>
                  <Icon name={state === "Done" ? "done_all" : state === "In Progress" ? "sync" : "hourglass_empty"} className="text-[20px]" />
                </span>
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 text-headline-sm">
                    {phase?.name ?? "General tasks"}
                    <span className={`chip ${state === "Done" ? "chip-green" : state === "In Progress" ? "chip-orange" : "chip-slate"}`}>{state}</span>
                  </h2>
                  {phase?.subtitle && <p className="text-on-surface-variant">{phase.subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-label-md font-semibold ${state === "Done" ? "text-emerald-700" : "text-on-surface-variant"}`}>
                  {done} of {items.length} done
                </span>
                <div className="w-20">
                  <Progress value={p} tone={state === "Done" ? "green" : "orange"} />
                </div>
                {editable && phase && (
                  <form action={deletePhase}>
                    <input type="hidden" name="id" value={phase.id} />
                    <button aria-label={`Delete ${phase.name} and its tasks`} title="Delete phase and its tasks" className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </form>
                )}
              </div>
            </div>
            <ul className="space-y-2">
              {items.map((t) => (
                <TaskRow key={t.id} task={t} members={members} memberById={memberById} editable={editable} today={today} />
              ))}
              {items.length === 0 && <li className="text-on-surface-variant">No tasks here yet.</li>}
            </ul>
            {editable ? (
              <details className="mt-3">
                <summary className="btn btn-soft w-full text-primary">
                  <Icon name="add_circle" className="text-[18px]" /> Add checklist item{phase ? ` to ${phase.name.split(":")[0]}` : ""}
                </summary>
                <form action={addTask} className="mt-3 grid gap-2 rounded-xl bg-surface-container-low p-3 sm:grid-cols-2">
                  <input type="hidden" name="event_id" value={eventId} />
                  {phase && <input type="hidden" name="phase_id" value={phase.id} />}
                  <input className="input sm:col-span-2" name="title" placeholder="Task title" aria-label="Task title" required />
                  <input className="input sm:col-span-2" name="detail" placeholder="Details (optional)" aria-label="Details" />
                  <select className="input" name="assignee_id" aria-label="Assignee" defaultValue="">
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                  <input className="input" type="date" name="due_date" aria-label="Due date" />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="priority" className="h-4 w-4 accent-primary-container" /> High priority
                  </label>
                  <SubmitButton className="btn btn-primary">Add task</SubmitButton>
                </form>
              </details>
            ) : (
              <Link href={`${base}?tab=tasks`} className="mt-3 flex items-center justify-center gap-1 text-label-md text-primary">
                <Icon name="edit" className="text-[16px]" /> Edit, assign or add tasks
              </Link>
            )}
          </section>
        );
      })}
    </>
  );
}

function TaskRow({ task: t, members, memberById, editable, compact, today }: { task: Task; members: Member[]; memberById: Map<string, Member>; editable: boolean; compact?: boolean; today: string }) {
  const assignee = t.assignee_id ? memberById.get(t.assignee_id) : undefined;
  const late = !t.done && t.due_date && t.due_date < today;
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl bg-surface-container-low p-3">
      <form action={toggleTask} className="pt-0.5">
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="done" value={String(!t.done)} />
        <button
          role="checkbox"
          aria-checked={t.done}
          aria-label={`Mark "${t.title}" as ${t.done ? "not done" : "done"}`}
          className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors ${t.done ? "border-primary-container bg-primary-container text-white" : "border-slate-300 bg-white hover:border-primary-container"}`}
        >
          {t.done && <Icon name="check" className="text-[16px]" />}
        </button>
      </form>
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`font-semibold ${t.done ? "text-on-surface-variant line-through" : ""}`}>{t.title}</span>
          {t.priority && !t.done && <span className="chip chip-violet">Priority</span>}
          {t.tag && <span className="chip chip-slate">{t.tag}</span>}
          {t.due_date && !t.done && <span className={`chip ${late ? "chip-red" : "chip-slate"}`}>{dueLabel(t.due_date)}</span>}
        </div>
        {t.detail && <p className="text-body-sm text-on-surface-variant">{t.detail}</p>}
      </div>
      {editable ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {!compact && (
            <form action={updateTask} className="flex flex-wrap items-center gap-1.5">
              <input type="hidden" name="id" value={t.id} />
              <AutoSelect name="assignee_id" defaultValue={t.assignee_id ?? ""} aria-label={`Assignee for ${t.title}`} className="input input-sm w-36">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </AutoSelect>
              <AutoInput type="date" name="due_date" defaultValue={t.due_date ?? ""} aria-label={`Due date for ${t.title}`} className="input input-sm w-36" />
            </form>
          )}
          <form action={deleteTask}>
            <input type="hidden" name="id" value={t.id} />
            <button aria-label={`Delete ${t.title}`} className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
              <Icon name="delete" className="text-[18px]" />
            </button>
          </form>
        </div>
      ) : (
        <span className="flex items-center gap-1.5 rounded-full bg-white py-0.5 pr-2.5 pl-0.5 text-label-sm shadow-card">
          {assignee ? (
            <>
              <Avatar name={assignee.full_name} size={22} /> {shortName(assignee.full_name)}
            </>
          ) : (
            <span className="pl-2 text-on-surface-variant">Unassigned</span>
          )}
        </span>
      )}
    </li>
  );
}
