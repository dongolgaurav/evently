import Link from "next/link";
import { getContext } from "@/lib/data";
import { loadClubData } from "@/lib/queries";
import { addMember, rebalanceTasks, removeMember, updateMember } from "@/lib/actions";
import { TASK_CAP, TIER_LABEL, type Member, type Tier } from "@/lib/types";
import { daysUntil } from "@/lib/format";
import { Avatar, Icon, PageHeader, Progress } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Team & Roster" };

const FILTERS: { key: string; label: string; tiers: Tier[] }[] = [
  { key: "all", label: "All", tiers: ["exec", "lead", "member", "volunteer"] },
  { key: "exec", label: "Exec Board", tiers: ["exec"] },
  { key: "lead", label: "Chairs & Leads", tiers: ["lead", "member"] },
  { key: "volunteer", label: "Volunteers", tiers: ["volunteer"] },
];
const GUIDELINES = [
  { icon: "rule", title: `The ${TASK_CAP}-Task Cap`, body: `Midterm weeks need slack. Keep each organiser at ${TASK_CAP} or fewer open tasks so deadlines don't slip and nobody's grades pay for the event.` },
  { icon: "diversity_3", title: "Buddy Pairing on Critical Ops", body: "Pair a newer member with an experienced lead on heavy lifts like AV and food approvals. It builds the club's memory for next year." },
  { icon: "favorite", title: "Recognise Unseen Work", body: "Chat moderation and replying to sponsors are real commitments. Give them an owner and credit them like any other task." },
];

function MemberFields({ m, admin }: { m?: Member; admin: boolean }) {
  return (
    <>
      <label>
        <span className="field-label">Name</span>
        <input className="input" name="full_name" defaultValue={m?.full_name} required />
      </label>
      <label>
        <span className="field-label">Role / title</span>
        <input className="input" name="title" defaultValue={m?.title ?? ""} placeholder="VP Logistics" />
      </label>
      {admin && (
        <>
          <label>
            <span className="field-label">Email (for joining the workspace)</span>
            <input className="input" type="email" name="email" defaultValue={m?.email ?? ""} placeholder="name@university.edu" />
          </label>
          <label>
            <span className="field-label">Group</span>
            <select className="input" name="tier" defaultValue={m?.tier ?? "member"}>
              {(["exec", "lead", "member", "volunteer"] as Tier[]).map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label>
        <span className="field-label">Year</span>
        <input className="input" name="year" defaultValue={m?.year ?? ""} placeholder="Junior" />
      </label>
      <label>
        <span className="field-label">Major</span>
        <input className="input" name="major" defaultValue={m?.major ?? ""} placeholder="Computer Science" />
      </label>
    </>
  );
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ q?: string; tier?: string; moved?: string }> }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const admin = ctx.me.is_admin;
  const [{ events, tasks, members }, rolesRes] = await Promise.all([
    loadClubData(ctx),
    ctx.supabase.from("event_roles").select("member_id, responsibility, event_id").eq("club_id", ctx.club.id),
  ]);
  const activeEvents = new Set(events.filter((e) => e.status !== "completed").map((e) => e.id));
  const open = tasks.filter((t) => t.kind === "task" && !t.done && activeEvents.has(t.event_id));
  const roster = members.filter((m) => m.tier !== "prospect");
  const prospects = members.filter((m) => m.tier === "prospect");
  const stats = new Map(
    roster.map((m) => {
      const mine = open.filter((t) => t.assignee_id === m.id);
      const roles = (rolesRes.data ?? []).filter((r) => r.member_id === m.id && activeEvents.has(r.event_id as string));
      return [m.id, {
        open: mine.length,
        dueSoon: mine.filter((t) => (daysUntil(t.due_date) ?? 99) <= 7).length,
        events: new Set([...mine.map((t) => t.event_id), ...roles.map((r) => r.event_id as string)]).size,
        roles: roles.map((r) => r.responsibility as string),
      }];
    }),
  );
  const avg = roster.length ? open.filter((t) => t.assignee_id).length / roster.length : 0;
  const strained = roster.filter((m) => stats.get(m.id)!.open > TASK_CAP).sort((a, b) => stats.get(b.id)!.open - stats.get(a.id)!.open);
  const filter = FILTERS.find((f) => f.key === sp.tier) ?? FILTERS[0]!;
  const q = (sp.q ?? "").trim().toLowerCase();
  const shown = roster
    .filter((m) => filter.tiers.includes(m.tier))
    .filter((m) => !q || [m.full_name, m.title, m.major, m.year].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => stats.get(b.id)!.open - stats.get(a.id)!.open);
  const count = (tiers: Tier[]) => roster.filter((m) => tiers.includes(m.tier)).length;
  const unassigned = open.filter((t) => !t.assignee_id).length;

  return (
    <>
      <PageHeader
        eyebrow={ctx.club.term ? <span className="chip chip-indigo normal-case">{ctx.club.term}</span> : undefined}
        title="Executive Board & Committee Roster"
        subtitle={`${ctx.club.full_name ?? ctx.club.name} • ${roster.length} active organiser${roster.length === 1 ? "" : "s"} • ${unassigned} unassigned task${unassigned === 1 ? "" : "s"}`}
      >
        <a href="/team/export" className="btn btn-soft bg-white shadow-card">
          <Icon name="download" className="text-[18px]" /> Export CSV
        </a>
        <form action={rebalanceTasks}>
          <input type="hidden" name="back" value="/team" />
          <SubmitButton className="btn btn-ai" pendingText="Balancing…">
            <Icon name="auto_awesome" className="text-[18px]" /> Auto-balance Task Loads
          </SubmitButton>
        </form>
        {admin && (
          <a href="#invite" className="btn btn-primary">
            <Icon name="person_add" className="text-[18px]" /> Invite Student
          </a>
        )}
      </PageHeader>

      {sp.moved !== undefined && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-emerald-800">
          {Number(sp.moved) > 0 ? `Reassigned ${sp.moved} task${sp.moved === "1" ? "" : "s"} to even out the load.` : "Task loads are already balanced, so nothing was moved."}
        </p>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center justify-between text-label-sm tracking-wider text-on-surface-variant uppercase">
            Organisers on duty <Icon name="groups" className="text-[20px] text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-display-lg">{roster.length}</span>
            <span className="text-on-surface-variant">students</span>
          </div>
          <p className="mt-2 text-on-surface-variant">
            {count(["exec"])} Executive Board • {count(["lead", "member"])} Committee • {count(["volunteer"])} Volunteers
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between text-label-sm tracking-wider text-on-surface-variant uppercase">
            Average task load
            <span className={`chip normal-case ${avg <= TASK_CAP ? "chip-green" : "chip-orange"}`}>{avg <= TASK_CAP ? "Healthy tempo" : "Over target"}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-display-lg">{avg.toFixed(1)}</span>
            <span className="text-on-surface-variant">open tasks / organiser</span>
          </div>
          <p className="mt-2 text-on-surface-variant">Target threshold: ≤ {TASK_CAP}.0</p>
        </div>
        {strained[0] ? (
          <div className="rounded-2xl bg-gradient-to-br from-secondary-fixed to-white p-6 shadow-card">
            <div className="flex items-center justify-between text-label-sm tracking-wider text-secondary uppercase">
              <span className="flex items-center gap-1">
                <Icon name="warning" className="text-[18px]" /> Strain alert
              </span>
              <span className="chip bg-secondary-container text-white">High load</span>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-display text-headline-lg">{strained[0].full_name}</span>
              <span className="font-semibold text-secondary">{stats.get(strained[0].id)!.open} open tasks</span>
            </div>
            <form action={rebalanceTasks} className="mt-2 flex items-center justify-between gap-2">
              <span className="text-on-surface-variant">{strained.length > 1 ? `and ${strained.length - 1} more over the cap` : `Cap is ${TASK_CAP} open tasks`}</span>
              <input type="hidden" name="member_id" value={strained[0].id} />
              <input type="hidden" name="back" value="/team" />
              <SubmitButton className="btn btn-sm btn-accent" pendingText="Moving…">
                Delegate <Icon name="arrow_forward" className="text-[16px]" />
              </SubmitButton>
            </form>
          </div>
        ) : (
          <div className="card p-6">
            <div className="flex items-center gap-1 text-label-sm tracking-wider text-emerald-700 uppercase">
              <Icon name="verified" className="text-[18px]" /> No strain alerts
            </div>
            <p className="mt-3 font-display text-headline-sm">Nobody is over the {TASK_CAP}-task cap.</p>
            <p className="mt-1 text-on-surface-variant">Workload is spread sustainably right now.</p>
          </div>
        )}
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="relative flex items-center">
          {sp.tier && <input type="hidden" name="tier" value={sp.tier} />}
          <Icon name="search" className="absolute left-3 text-[18px] text-on-surface-variant" />
          <input name="q" defaultValue={sp.q} aria-label="Filter roster" placeholder="Filter by name, major, role…" className="input w-64 pl-9" />
        </form>
        <div className="flex max-w-full overflow-x-auto rounded-xl bg-surface-container p-1">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/team?tier=${f.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={`rounded-lg px-3 py-1 text-label-md whitespace-nowrap ${filter.key === f.key ? "bg-white font-semibold shadow-sm" : "text-on-surface-variant"}`}>
              {f.label} ({count(f.tiers)})
            </Link>
          ))}
        </div>
        <span className="ml-auto text-body-sm text-on-surface-variant">Sorted by task load</span>
      </div>

      <ul className="space-y-4">
        {shown.map((m) => {
          const s = stats.get(m.id)!;
          const load = Math.round((s.open / TASK_CAP) * 100);
          const high = s.open > TASK_CAP;
          const canEdit = admin || m.id === ctx.me.id;
          return (
            <li key={m.id} className={`card p-5 ${high ? "border-l-4 border-secondary-container" : ""}`}>
              <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative">
                    <Avatar name={m.full_name} size={52} />
                    <span title={m.user_id ? "Has an account" : "Not signed up yet"} className={`absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full ring-2 ring-white ${m.user_id ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-display text-headline-sm">{m.full_name}</span>
                      {m.is_admin && <Icon name="verified" className="text-[18px] text-primary" />}
                      {high && <span className="chip bg-secondary-container text-white uppercase">Needs co-lead</span>}
                    </div>
                    <div className="truncate text-primary">{m.title ?? "Member"}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="chip chip-indigo">{TIER_LABEL[m.tier]}</span>
                      {(m.year || m.major) && <span className="chip chip-slate">{[m.year, m.major].filter(Boolean).join(" • ")}</span>}
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Icon name="event" className="text-[18px] text-primary" /> {s.events} active event{s.events === 1 ? "" : "s"}
                    </span>
                    <span className={`flex items-center gap-1 ${s.dueSoon ? "text-secondary" : ""}`}>
                      <Icon name="task_alt" className="text-[18px]" /> {s.open} open task{s.open === 1 ? "" : "s"}
                      {s.dueSoon ? `, ${s.dueSoon} due this week` : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.roles.slice(0, 3).map((r, i) => (
                      <span key={i} className="max-w-full truncate rounded-lg bg-surface-container-low px-2 py-1 text-body-sm">
                        {r}
                      </span>
                    ))}
                    {s.roles.length > 3 && <span className="chip chip-slate">+{s.roles.length - 3} more</span>}
                    {s.roles.length === 0 && <span className="text-body-sm text-on-surface-variant">No event roles yet</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-label-sm">
                    <span className="text-on-surface-variant">Capacity load</span>
                    <span className={high ? "text-secondary" : load >= 75 ? "text-emerald-700" : "text-primary"}>
                      {load}% ({high ? "Critical" : load >= 75 ? "Full" : load >= 50 ? "Optimal" : "Available"})
                    </span>
                  </div>
                  <Progress value={load} tone={high ? "orange" : load >= 50 ? "green" : "primary"} />
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {high && (
                      <form action={rebalanceTasks}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <input type="hidden" name="back" value="/team" />
                        <SubmitButton className="btn btn-sm btn-accent" pendingText="Moving…">
                          <Icon name="swap_horiz" className="text-[16px]" /> Reassign {s.open - TASK_CAP} task{s.open - TASK_CAP === 1 ? "" : "s"}
                        </SubmitButton>
                      </form>
                    )}
                    <Link href={`/events?q=${encodeURIComponent(m.full_name)}`} className="btn btn-sm btn-soft">
                      View tasks
                    </Link>
                  </div>
                </div>
              </div>
              {canEdit && (
                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
                    <Icon name="edit" className="text-[16px]" /> Edit {m.id === ctx.me.id ? "your details" : "details"}
                  </summary>
                  <form action={updateMember} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input type="hidden" name="id" value={m.id} />
                    <MemberFields m={m} admin={admin} />
                    {admin && m.id !== ctx.me.id && (
                      <label className="flex items-center gap-2 self-end pb-2">
                        <input type="hidden" name="admin_set" value="1" />
                        <input type="checkbox" name="is_admin" defaultChecked={m.is_admin} className="h-4 w-4 accent-primary-container" />
                        Workspace admin
                      </label>
                    )}
                    <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                      <SubmitButton pendingText="Saving…">Save</SubmitButton>
                      {!m.user_id && m.email && <span className="text-body-sm text-on-surface-variant">Joins automatically when they sign up with {m.email}.</span>}
                    </div>
                  </form>
                  {admin && m.id !== ctx.me.id && !m.is_admin && (
                    <form action={removeMember} className="mt-2">
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton className="btn btn-sm btn-danger" pendingText="Removing…">
                        Remove from roster
                      </SubmitButton>
                      <span className="ml-2 text-body-sm text-on-surface-variant">Their tasks become unassigned.</span>
                    </form>
                  )}
                </details>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="card p-6 text-on-surface-variant">Nobody matches that filter.</li>}
      </ul>

      <div className="mt-8 grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          {admin && (
            <section id="invite" className="card scroll-mt-20 p-6">
              <h2 className="text-headline-sm">Invite a student</h2>
              <p className="mb-4 text-on-surface-variant">
                Add them to the roster so you can assign tasks now. If you include their email, they join this workspace
                automatically when they create an Evently account with it. Evently does not send the invitation email for you.
              </p>
              <StateForm action={addMember} className="grid gap-3 sm:grid-cols-2">
                <MemberFields admin />
                <div className="sm:col-span-2">
                  <SubmitButton pendingText="Adding…">
                    <Icon name="person_add" className="text-[18px]" /> Add to roster
                  </SubmitButton>
                </div>
              </StateForm>
            </section>
          )}
          <section className="card p-6">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                  <Icon name="volunteer_activism" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-headline-sm">Volunteer Sign-Up Pool</h2>
                  <p className="text-on-surface-variant">Students who want to get involved but don&apos;t have a role yet.</p>
                </div>
              </div>
              <span className="chip chip-green">{prospects.length} lead{prospects.length === 1 ? "" : "s"}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {prospects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={p.full_name} size={40} />
                  <div className="min-w-40 flex-1">
                    <div className="font-semibold">{p.full_name}</div>
                    <div className="text-body-sm text-on-surface-variant">{[p.year, p.major, p.notes].filter(Boolean).join(" • ") || "No details"}</div>
                  </div>
                  {admin && (
                    <>
                      <form action={updateMember} className="flex gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="tier" value="volunteer" />
                        <input className="input input-sm w-40" name="title" placeholder="Role, e.g. Check-in desk" aria-label={`Role for ${p.full_name}`} required />
                        <SubmitButton className="btn btn-sm btn-soft text-primary">Draft Role</SubmitButton>
                      </form>
                      <form action={removeMember}>
                        <input type="hidden" name="id" value={p.id} />
                        <button aria-label={`Remove ${p.full_name}`} className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                          <Icon name="close" className="text-[18px]" />
                        </button>
                      </form>
                    </>
                  )}
                </li>
              ))}
              {prospects.length === 0 && <li className="py-3 text-on-surface-variant">No sign-ups waiting. Add people here after your next recruitment table or form.</li>}
            </ul>
            {admin && (
              <StateForm action={addMember} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
                <input type="hidden" name="tier" value="prospect" />
                <input className="input" name="full_name" placeholder="Name" aria-label="Name" required />
                <input className="input" name="year" placeholder="Year" aria-label="Year" />
                <input className="input" name="major" placeholder="Major" aria-label="Major" />
                <input className="input" name="notes" placeholder="Interested in…" aria-label="Interests" />
                <div className="sm:col-span-4">
                  <SubmitButton className="btn btn-soft">Add sign-up</SubmitButton>
                </div>
              </StateForm>
            )}
          </section>
        </div>

        <section className="card h-fit p-6 xl:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
              <Icon name="psychology_alt" className="text-[22px]" />
            </span>
            <div>
              <h2 className="text-headline-sm">Role Delegation Guidelines</h2>
              <p className="text-on-surface-variant">A short playbook to prevent executive burnout.</p>
            </div>
          </div>
          <ul className="space-y-3">
            {GUIDELINES.map((g) => (
              <li key={g.title} className="flex gap-3 rounded-xl bg-surface-container-low p-4">
                <Icon name={g.icon} className="text-[22px] text-primary" />
                <div>
                  <div className="font-semibold">{g.title}</div>
                  <p className="text-body-sm text-on-surface-variant">{g.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
