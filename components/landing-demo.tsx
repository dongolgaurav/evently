"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TEMPLATES } from "@/lib/templates";
import { buildTemplatePlan } from "@/lib/plan/template";
import { money } from "@/lib/format";
import { Icon } from "./ui";

const DEMO_TEAM = [
  { id: "a", name: "President", title: "Club President", focus: "Overall lead" },
  { id: "b", name: "Logistics", title: "VP Logistics", focus: "Venue & equipment" },
  { id: "c", name: "Treasurer", title: "Treasurer", focus: "Budget & sponsorship" },
  { id: "d", name: "Marketing", title: "Marketing Lead", focus: "Outreach & socials" },
];

/** Runs the real built-in generator in the browser on a sample event. */
export function LandingDemo() {
  const [key, setKey] = useState(TEMPLATES[0]!.key);
  const t = TEMPLATES.find((x) => x.key === key)!;
  const plan = useMemo(
    () =>
      buildTemplatePlan({
        title: t.title, category: t.category, eventDate: null, timeWindow: t.timeWindow, venue: "",
        attendees: t.attendees, budget: t.budget, concept: t.concept, members: DEMO_TEAM,
      }),
    [t],
  );
  const picks = plan.phases.flatMap((p) => p.tasks.filter((x) => x.priority)).slice(0, 3);
  return (
    <div className="card p-6 text-left sm:p-8">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Sample events">
        {TEMPLATES.slice(0, 4).map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={x.key === key}
            onClick={() => setKey(x.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md ${x.key === key ? "bg-primary font-semibold text-white" : "bg-surface-container-low hover:bg-surface-container"}`}
          >
            <Icon name={x.icon} className="text-[16px]" /> {x.name}
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-surface-container-low p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-headline-sm">{t.title}</h3>
            <p className="text-body-sm text-on-surface-variant">
              {t.timeWindow} • ~{t.attendees} attendees • {plan.phases.reduce((n, p) => n + p.tasks.length, 0)} tasks in {plan.phases.length} phases
            </p>
          </div>
          <span className="chip chip-indigo">{money(t.budget)} budget</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {picks.map((task) => (
            <div key={task.title} className="rounded-lg bg-white p-3 shadow-card">
              <div className="text-badge-xs text-on-surface-variant uppercase">{DEMO_TEAM.find((m) => m.id === task.assignee_id)?.name ?? "Unassigned"}</div>
              <div className="mt-1 text-label-md font-semibold">{task.title}</div>
              <div className="mt-1 text-body-sm text-secondary">Due {task.days_before} days before</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {plan.budget.map((b) => (
            <span key={b.category} className="chip chip-slate">
              {b.category}: {money(b.amount)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-on-surface-variant">Ready to put in your own team and budget?</span>
        <Link href="/signup" className="flex items-center gap-1 font-semibold text-primary">
          Use this template <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </div>
    </div>
  );
}
