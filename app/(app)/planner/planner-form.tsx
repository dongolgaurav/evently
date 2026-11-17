"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createPlan } from "@/lib/actions";
import { buildTemplatePlan } from "@/lib/plan/template";
import { CATEGORIES, type FundingSource } from "@/lib/types";
import { money, shortName } from "@/lib/format";
import { Avatar, Icon } from "@/components/ui";
import { FormMessage } from "@/components/client";

type RosterMember = { id: string; name: string; title: string };
export type PlannerInitial = { title: string; category: string; timeWindow: string; attendees: number; budget: number; concept: string };

const DONUT = ["#3525cd", "#fd651e", "#6f3dd9", "#10b981", "#0ea5e9", "#f59e0b"];

export function PlannerForm({ roster, initial, ai }: { roster: RosterMember[]; initial: PlannerInitial; ai: boolean }) {
  const [state, action, pending] = useActionState(createPlan, undefined);
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  const [eventDate, setEventDate] = useState("");
  const [timeWindow, setTimeWindow] = useState(initial.timeWindow);
  const [venue, setVenue] = useState("");
  const [attendees, setAttendees] = useState(String(initial.attendees || ""));
  const [budget, setBudget] = useState(String(initial.budget || ""));
  const [concept, setConcept] = useState(initial.concept);
  const [funding, setFunding] = useState<FundingSource[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    Object.fromEntries(roster.slice(0, 6).map((m) => [m.id, m.title])),
  );

  const members = useMemo(
    () => roster.filter((m) => m.id in picked).map((m) => ({ ...m, focus: picked[m.id] ?? "" })),
    [roster, picked],
  );
  const budgetNum = Number(budget) || 0;
  const plan = useMemo(
    () =>
      buildTemplatePlan({
        title, category, eventDate: eventDate || null, timeWindow, venue,
        attendees: Number(attendees) || 0, budget: budgetNum, concept, members,
      }),
    [title, category, eventDate, timeWindow, venue, attendees, budgetNum, concept, members],
  );

  const filled = [title.trim().length >= 2, Boolean(eventDate), members.length > 0, budgetNum > 0, concept.trim().length > 20];
  const step = filled.filter(Boolean).length;
  const taskCount = (id: string) => plan.phases.reduce((n, p) => n + p.tasks.filter((t) => t.assignee_id === id).length, 0);
  const fundingTotal = funding.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const donut = plan.budget
    .map((b, i) => {
      const before = plan.budget.slice(0, i).reduce((s, x) => s + x.amount, 0);
      const share = (n: number) => (budgetNum ? (n / budgetNum) * 100 : 0);
      return `${DONUT[i % DONUT.length]} ${share(before)}% ${share(before + b.amount)}%`;
    })
    .join(", ");

  return (
    <form action={action} className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <input type="hidden" name="members" value={JSON.stringify(members.map((m) => ({ id: m.id, focus: m.focus })))} />
      <input type="hidden" name="funding_sources" value={JSON.stringify(funding)} />
      <input type="hidden" name="category" value={category} />

      <div className="space-y-6 xl:col-span-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-label-md">
            <span className="flex items-center gap-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-badge-xs text-white">{step}</span>
              {step} of 5 sections filled in
            </span>
            <span className="text-on-surface-variant">{step === 5 ? "Ready to generate" : "Only a title is required"}</span>
          </div>
          <div className="bar">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step * 20}%` }} />
          </div>
        </div>

        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-headline-sm">
            <Icon name="event_note" className="text-[22px] text-primary" /> Event Overview
          </h2>
          <label className="mb-4 block">
            <span className="field-label">Event title</span>
            <input className="input" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Annual 24-Hour Fall Hackathon & Tech Expo" required minLength={2} maxLength={120} />
          </label>
          <span className="field-label">Event category</span>
          <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Event category">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={category === c.key}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md ${category === c.key ? "bg-primary font-semibold text-white" : "bg-surface-container-low hover:bg-surface-container"}`}
              >
                <Icon name={c.icon} className="text-[16px]" /> {c.key}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Target date</span>
              <input className="input" type="date" name="event_date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </label>
            <label>
              <span className="field-label">Time window</span>
              <input className="input" name="time_window" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} placeholder="24h overnight, or 6:00–9:00 PM" />
            </label>
            <label>
              <span className="field-label">Venue</span>
              <input className="input" name="venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Student Union Ballroom" />
            </label>
            <label>
              <span className="field-label">Expected attendees</span>
              <input className="input" type="number" min={0} name="attendees" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="180" />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-headline-sm">
              <Icon name="group_add" className="text-[22px] text-primary" /> Team & Assigned Roles
            </h2>
            <span className="chip chip-indigo">{members.length} selected</span>
          </div>
          <p className="mb-4 text-on-surface-variant">Tasks are distributed according to each person&apos;s focus area.</p>
          <ul className="space-y-2">
            {roster.map((m) => {
              const on = m.id in picked;
              return (
                <li key={m.id} className={`flex flex-wrap items-center gap-3 rounded-xl p-3 ${on ? "bg-surface-container-low" : "opacity-70"}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    aria-label={`Include ${m.name}`}
                    className="h-4 w-4 accent-primary-container"
                    onChange={() =>
                      setPicked((p) => {
                        const next = { ...p };
                        if (on) delete next[m.id];
                        else next[m.id] = m.title;
                        return next;
                      })
                    }
                  />
                  <Avatar name={m.name} size={36} />
                  <div className="min-w-32 flex-1">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-body-sm text-on-surface-variant">{m.title || "Member"}</div>
                  </div>
                  {on && (
                    <input
                      className="input input-sm w-full sm:w-56"
                      value={picked[m.id]}
                      aria-label={`Focus area for ${m.name}`}
                      placeholder="Focus, e.g. Venue & equipment"
                      onChange={(e) => setPicked((p) => ({ ...p, [m.id]: e.target.value }))}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <Link href="/team" className="btn btn-soft mt-3 w-full text-primary">
            <Icon name="person_add" className="text-[18px]" /> Add committee member or volunteer
          </Link>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-headline-sm">
            <Icon name="account_balance_wallet" className="text-[22px] text-primary" /> Budget & Funding
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="field-label">Total available ($)</span>
              <input className="input font-display text-headline-sm" type="number" min={0} name="budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="2500" />
            </label>
            <div className="sm:col-span-2">
              <span className="field-label">Funding sources (optional)</span>
              <ul className="space-y-2">
                {funding.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <input className="input" value={f.name} aria-label="Source name" placeholder="Student Union Grant" onChange={(e) => setFunding((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input className="input w-28" type="number" min={0} value={f.amount || ""} aria-label="Source amount" placeholder="$" onChange={(e) => setFunding((l) => l.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} />
                    <button type="button" aria-label="Remove source" className="rounded-lg px-2 text-on-surface-variant hover:bg-surface-container-low" onClick={() => setFunding((l) => l.filter((_, j) => j !== i))}>
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-sm btn-soft mt-2" onClick={() => setFunding((l) => [...l, { name: "", amount: 0 }])}>
                <Icon name="add" className="text-[16px]" /> Add source
              </button>
              {funding.length > 0 && budgetNum > 0 && fundingTotal !== budgetNum && (
                <p className="mt-2 text-body-sm text-secondary">
                  Sources add up to {money(fundingTotal)}, but the total is {money(budgetNum)}.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-headline-sm">
            <Icon name="psychology" className="text-[22px] text-primary" /> Event Concept & Special Constraints
          </h2>
          <textarea
            className="input"
            name="concept"
            rows={5}
            maxLength={500}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            aria-label="Event concept"
            placeholder="We want a 24-hour hackathon with 3 keynote workshops, a midnight pizza run, a project demo session and sponsor booths."
          />
          <div className="mt-1 flex justify-between text-body-sm text-on-surface-variant">
            <span>Mention room types, food and anything overnight so the right approvals are listed.</span>
            <span>{concept.length} / 500</span>
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-headline-sm">Ready to generate your plan?</h2>
            <p className="text-on-surface-variant">
              {ai
                ? "Claude writes the tasks, schedule, budget split and approvals. It usually takes under a minute."
                : "Creates the tasks, schedule, budget split and approvals shown in the preview. Everything stays editable."}
            </p>
            <div className="mt-2">
              <FormMessage state={state} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button type="submit" name="mode" value="plan" disabled={pending} className="btn btn-accent h-12 px-6 text-body-lg">
              <Icon name="auto_awesome" className="text-[20px]" /> {pending ? "Generating plan…" : "Generate Complete Event Plan"}
            </button>
            <button type="submit" name="mode" value="blank" disabled={pending} className="btn btn-sm btn-ghost">
              Or create a blank event
            </button>
          </div>
        </section>
      </div>

      <aside className="space-y-4 xl:col-span-2" aria-label="Plan preview">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-tertiary-fixed to-primary-fixed p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary text-white">
              <Icon name="architecture" className="text-[22px]" />
            </span>
            <div>
              <div className="font-display text-headline-sm">Plan Blueprint</div>
              <div className="text-label-sm tracking-wider text-on-surface-variant uppercase">Live draft preview</div>
            </div>
          </div>
          <span className="chip chip-violet">{ai ? "Claude refines on generate" : "Updates as you type"}</span>
        </div>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center justify-between gap-2 text-label-md font-semibold">
            <span className="flex items-center gap-2">
              <Icon name="assignment_ind" className="text-[20px] text-primary" /> 1. Role Breakdown
            </span>
            <span className="chip chip-green">{members.length} assigned</span>
          </h3>
          <ul className="space-y-2">
            {plan.roles.map((r) => {
              const m = members.find((x) => x.id === r.member_id);
              return (
                <li key={r.member_id} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-2">
                  <span className="w-20 shrink-0 font-semibold">{shortName(m?.name ?? "")}</span>
                  <span className="flex-1 text-body-sm text-on-surface-variant">{r.responsibility}</span>
                  <span className="chip chip-indigo">{taskCount(r.member_id)} tasks</span>
                </li>
              );
            })}
            {members.length === 0 && <li className="text-on-surface-variant">Select team members to see who gets what.</li>}
          </ul>
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-label-md font-semibold">
            <Icon name="donut_small" className="text-[20px] text-secondary" /> 2. Budget Allocation ({money(budgetNum)})
          </h3>
          {budgetNum > 0 ? (
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(${donut})` }} role="img" aria-label="Budget split chart">
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="font-display font-bold">100%</span>
                  <span className="text-badge-xs text-on-surface-variant">allocated</span>
                </div>
              </div>
              <ul className="flex-1 space-y-1.5">
                {plan.budget.map((b, i) => (
                  <li key={b.category} className="flex items-center justify-between gap-2 text-body-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT[i % DONUT.length] }} />
                      {b.category}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {Math.round((b.amount / budgetNum) * 100)}% ({money(b.amount)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-on-surface-variant">Enter a total budget to see the split.</p>
          )}
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-label-md font-semibold">
            <Icon name="schedule" className="text-[20px] text-primary" /> 3. Timeline & Run of Show
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-container-low p-3">
              <div className="mb-2 flex items-center gap-1 text-label-sm">
                <Icon name="flag" className="text-[16px] text-primary" /> Countdown
              </div>
              <ul className="space-y-1.5 text-body-sm text-on-surface-variant">
                {plan.phases.map((p) => (
                  <li key={p.name} className="border-l-2 border-primary pl-2">
                    {p.name.replace(/^Phase \d+: /, "")}: {p.tasks.length} tasks
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3">
              <div className="mb-2 flex items-center gap-1 text-label-sm">
                <Icon name="alarm" className="text-[16px] text-secondary" /> Day-of flow
              </div>
              <ul className="space-y-1.5 text-body-sm text-on-surface-variant">
                {plan.timeline.slice(0, 4).map((t) => (
                  <li key={t.time + t.title} className="border-l-2 border-secondary-container pl-2">
                    {t.time} {t.title}
                  </li>
                ))}
                {plan.timeline.length > 4 && <li className="pl-2">+{plan.timeline.length - 4} more</li>}
              </ul>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-label-md font-semibold">
            <Icon name="verified_user" className="text-[20px] text-emerald-600" /> 4. Campus Compliance Checklist
          </h3>
          <ul className="space-y-2">
            {plan.compliance.map((c) => (
              <li key={c.title} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2 text-body-sm">
                <span className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-[18px] text-emerald-600" /> {c.title}
                </span>
                <span className="shrink-0 text-right text-badge-xs text-on-surface-variant">{c.reference}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-body-sm text-on-surface-variant">A starting list. Check the exact requirements with your own campus offices.</p>
        </section>
      </aside>
    </form>
  );
}
