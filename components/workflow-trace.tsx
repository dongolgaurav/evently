import { AGENTS, type AgentKey, type AgentTrace, type BranchDecision, type ToolCallRecord, type TraceStep } from "@/lib/agents/trace";
import { money } from "@/lib/format";
import { CopyButton } from "./copy-button";
import { Icon } from "./ui";

const TOOL_LABEL: Record<string, { label: string; source: string }> = {
  geocode_location: { label: "Find location", source: "Open-Meteo Geocoding" },
  get_weather: { label: "Weather lookup", source: "Open-Meteo" },
  get_public_holidays: { label: "Public holidays", source: "Nager.Date" },
};

const list = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String) : []);

function ToolResult({ t }: { t: ToolCallRecord }) {
  const meta = TOOL_LABEL[t.name] ?? { label: t.name, source: "External API" };
  const o = (t.output ?? {}) as Record<string, unknown>;
  let body: React.ReactNode = null;
  if (!t.ok || o.error) body = <span className="text-on-error-container">Failed: {String(o.error ?? "unknown error")}</span>;
  else if (t.name === "geocode_location") body = `${o.name}, ${o.region ?? o.country} (${Number(o.latitude).toFixed(2)}, ${Number(o.longitude).toFixed(2)})`;
  else if (t.name === "get_weather")
    body =
      o.mode === "forecast"
        ? `Live forecast for ${o.date}: ${o.temp_min_c}–${o.temp_max_c}°C, ${o.precip_probability_pct}% chance of rain, wind up to ${o.wind_max_kmh} km/h`
        : `Historical, same week in ${list(o.years).join(", ")}: ${o.avg_temp_min_c}–${o.avg_temp_max_c}°C, rain on ${o.rainy_day_share_pct}% of days, wind up to ${o.avg_wind_max_kmh} km/h`;
  else if (t.name === "get_public_holidays") {
    const hs = (Array.isArray(t.output) ? t.output : []) as { date: string; name: string; days_from_event: number }[];
    body = hs.length ? hs.map((h) => `${h.name} (${h.date}, ${h.days_from_event === 0 ? "same day" : `${Math.abs(h.days_from_event)} days ${h.days_from_event < 0 ? "before" : "after"}`})`).join("; ") : "No public holidays within a week of the date";
  }
  return (
    <li className="flex gap-2 rounded-lg bg-white p-2 text-body-sm shadow-card">
      <Icon name="api" className={`text-[18px] ${t.ok ? "text-primary" : "text-error"}`} />
      <div>
        <span className="font-semibold">{meta.label}</span> <span className="text-on-surface-variant">· {meta.source}</span>
        <div>{body}</div>
      </div>
    </li>
  );
}

function StepCard({ step, index }: { step: TraceStep; index: number }) {
  const meta = AGENTS[step.agent];
  const d = (step.details ?? {}) as Record<string, unknown>;
  const bullets: [string, string[]][] = [
    ["Goals", list(d.goals)],
    ["Must-haves", list(d.must_haves)],
    ["Open questions", list(d.open_questions)],
    ["Recommendations", list(d.recommendations)],
    ["Date conflicts", list(d.conflicts)],
    ["Ways to stretch the budget", list(d.savings_ideas)],
    ["Issues found", list(d.issues)],
    ["Phases", list(d.phases)],
  ];
  const allocation = (Array.isArray(d.allocation) ? d.allocation : []) as { category: string; amount: number }[];
  return (
    <li className="card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
          <Icon name={meta.icon} className="text-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-sm text-on-surface-variant">Step {index + 1}</span>
            <h3 className="text-headline-sm">{meta.name}</h3>
            {step.pass && step.pass > 1 && <span className="chip chip-violet">Pass {step.pass}</span>}
            <span className="chip chip-slate">{(step.ms / 1000).toFixed(1)}s</span>
          </div>
          <p className="text-body-sm text-on-surface-variant">{meta.role}</p>
          <p className="mt-2">{step.summary}</p>
          {typeof d.advice === "string" && <p className="mt-1 text-on-surface-variant">{d.advice}</p>}
          {step.tools && step.tools.length > 0 && <ul className="mt-3 space-y-1.5">{step.tools.map((t, i) => <ToolResult key={i} t={t} />)}</ul>}
          {allocation.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {allocation.map((a) => (
                <span key={a.category} className="chip chip-indigo">
                  {a.category}: {money(a.amount)}
                </span>
              ))}
            </div>
          )}
          {bullets
            .filter(([, xs]) => xs.length)
            .map(([label, xs]) => (
              <div key={label} className="mt-3">
                <div className="text-label-sm tracking-wider text-on-surface-variant uppercase">{label}</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-body-sm">
                  {xs.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </li>
  );
}

function BranchRow({ b }: { b: BranchDecision }) {
  return (
    <li className="ml-5 flex items-start gap-2 border-l-2 border-dashed border-tertiary-container py-1 pl-5 text-body-sm">
      <Icon name="call_split" className="text-[18px] text-tertiary" />
      <span>
        <b className="text-tertiary">Branch after {AGENTS[b.at].name}: {b.label}</b> → {b.to === "end" ? "finish" : AGENTS[b.to].name}.{" "}
        <span className="text-on-surface-variant">{b.reason}</span>
      </span>
    </li>
  );
}

/** "How this plan was made": every agent step, tool call and branch decision, in order. */
export function WorkflowTrace({ trace }: { trace: AgentTrace | null }) {
  if (!trace || trace.engine === "template") {
    return (
      <div className="card p-6">
        <h2 className="text-headline-sm">How this plan was made</h2>
        <p className="mt-1 text-on-surface-variant">
          {trace?.note ?? "This event was created by hand or before the AI agents were added, so there is no agent run to show."}
        </p>
      </div>
    );
  }
  // Interleave branch decisions after the step that made them.
  const seen: Record<string, number> = {};
  const items: React.ReactNode[] = [];
  trace.steps.forEach((s, i) => {
    items.push(<StepCard key={`s${i}`} step={s} index={i} />);
    seen[s.agent] = (seen[s.agent] ?? 0) + 1;
    const nth = seen[s.agent]!;
    const bs = trace.branches.filter((b) => b.at === s.agent);
    if (bs[nth - 1]) items.push(<BranchRow key={`b${i}`} b={bs[nth - 1]!} />);
  });
  const toolCalls = trace.steps.flatMap((s) => s.tools ?? []);
  const sponsor = trace.sponsorship;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <ol className="space-y-3">{items}</ol>
      </div>
      <aside className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-headline-sm">
            <Icon name="hub" className="text-[22px] text-tertiary" /> Workflow at a glance
          </h2>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Agents run", String(new Set(trace.steps.map((s) => s.agent)).size)],
              ["Branch decisions", String(trace.branches.length)],
              ["API calls", String(toolCalls.length)],
              ["Total time", `${Math.round(trace.ms / 1000)}s`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-container-low p-3">
                <dt className="text-body-sm text-on-surface-variant">{k}</dt>
                <dd className="font-display text-headline-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Orchestrated with LangGraph · model {trace.model}. Data from Open-Meteo and Nager.Date.
          </p>
          {trace.skipped.length > 0 && (
            <p className="mt-2 text-body-sm">
              <b>Skipped by a branch:</b> {trace.skipped.map((k: AgentKey) => AGENTS[k].name).join(", ")}
            </p>
          )}
        </section>
        {sponsor && (
          <section className="card p-6">
            <h2 className="mb-1 flex items-center gap-2 text-headline-sm">
              <Icon name="handshake" className="text-[22px] text-secondary" /> Sponsorship plan
            </h2>
            <p className="mb-3 text-on-surface-variant">Estimated funding gap: {money(sponsor.funding_gap_usd)}</p>
            <ul className="space-y-2">
              {sponsor.targets.map((t, i) => (
                <li key={i} className="rounded-xl bg-surface-container-low p-3 text-body-sm">
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>{t.type}</span>
                    <span className="text-primary">{money(t.ask_usd)}</span>
                  </div>
                  <div className="text-on-surface-variant">{t.example}</div>
                  <div>{t.why}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-label-sm tracking-wider text-on-surface-variant uppercase">Outreach email</span>
                <CopyButton text={`Subject: ${sponsor.email_subject}\n\n${sponsor.email_body}`} />
              </div>
              <p className="font-semibold">{sponsor.email_subject}</p>
              <p className="mt-1 text-body-sm whitespace-pre-line">{sponsor.email_body}</p>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
