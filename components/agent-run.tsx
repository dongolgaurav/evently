"use client";

import { useEffect, useState } from "react";
import { AGENTS, type AgentKey, type BranchDecision, type StreamEvent, type TraceStep } from "@/lib/agents/trace";
import { Icon } from "./ui";

const ORDER: AgentKey[] = ["brief", "weather", "calendar", "budget", "sponsor", "scheduler", "reviewer"];

export type RunState = {
  running: AgentKey | null;
  steps: TraceStep[];
  branches: BranchDecision[];
  model: string | null;
  engine: "langgraph" | "template" | null;
  phase: "running" | "saving" | "done" | "error";
  error?: string;
  startedAt: number;
};

export const initialRun = (): RunState => ({ running: null, steps: [], branches: [], model: null, engine: null, phase: "running", startedAt: Date.now() });

export function reduceRun(s: RunState, e: StreamEvent): RunState {
  switch (e.type) {
    case "start":
      return { ...s, model: e.model, engine: e.engine };
    case "agent_start":
      return { ...s, running: e.agent };
    case "agent_done":
      return { ...s, running: null, steps: [...s.steps, e.step] };
    case "branch":
      return { ...s, branches: [...s.branches, e.branch] };
    case "saving":
      return { ...s, running: null, phase: "saving" };
    case "done":
      return { ...s, phase: "done" };
    case "error":
      return { ...s, error: e.message };
  }
}

/** Live view of the planning agents while they work. */
export function AgentRunPanel({ run, onClose }: { run: RunState; onClose?: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (run.phase === "done") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [run.phase]);
  const elapsed = Math.max(0, Math.round((now - run.startedAt) / 1000));
  const ranKeys = new Set(run.steps.map((s) => s.agent));
  const finished = run.phase === "saving" || run.phase === "done";
  // Timeline entries in the order they happened: steps interleaved with branch decisions.
  const branchAfter = (agent: AgentKey, pass?: number) =>
    run.branches.filter((b, i) => b.at === agent && run.branches.slice(0, i).filter((x) => x.at === agent).length === (pass ?? 1) - 1);

  return (
    <div role="dialog" aria-modal="true" aria-label="AI planning agents at work" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden shadow-xl">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-primary-container to-tertiary-container p-5 text-white">
          <div>
            <div className="flex items-center gap-2 font-display text-headline-sm">
              <Icon name="hub" className="text-[22px]" /> {run.engine === "template" ? "Generating your plan" : "Planning agents at work"}
            </div>
            <div className="text-body-sm text-on-primary-container">
              {run.engine === "template" ? "Built-in generator" : `LangGraph workflow · ${run.model ?? "OpenAI"}`} · {elapsed}s
            </div>
          </div>
          {run.error && onClose && (
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/15" aria-label="Close">
              <Icon name="close" className="text-[22px]" />
            </button>
          )}
        </div>
        <ol className="flex-1 space-y-2 overflow-y-auto p-5" aria-live="polite">
          {ORDER.map((key) => {
            const meta = AGENTS[key];
            const passes = run.steps.filter((s) => s.agent === key);
            const isRunning = run.running === key;
            const skipped = !isRunning && passes.length === 0 && (finished || ranKeysAfter(key, ranKeys));
            const state = isRunning ? "running" : passes.length ? "done" : skipped ? "skipped" : "waiting";
            return (
              <li key={key}>
                <div className={`flex gap-3 rounded-xl p-3 ${state === "running" ? "bg-primary-fixed" : state === "done" ? "bg-surface-container-low" : ""} ${state === "skipped" ? "opacity-50" : ""}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${state === "done" ? "bg-emerald-100 text-emerald-700" : state === "running" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
                    <Icon name={state === "done" ? "check" : state === "running" ? "progress_activity" : meta.icon} className={`text-[20px] ${state === "running" ? "animate-spin" : ""}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{meta.name}</span>
                      {passes.length > 1 && <span className="chip chip-violet">{passes.length} passes</span>}
                      {state === "skipped" && <span className="chip chip-slate">Skipped by branch</span>}
                      {state === "running" && <span className="text-body-sm text-primary">working…</span>}
                    </div>
                    <p className="text-body-sm text-on-surface-variant">{passes.length ? passes[passes.length - 1]!.summary : meta.role}</p>
                    {passes.flatMap((p) => p.tools ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {passes.flatMap((p) => p.tools ?? []).map((t, i) => (
                          <span key={i} className={`chip ${t.ok ? "chip-indigo" : "chip-red"}`}>
                            <Icon name="api" className="text-[13px]" /> {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {passes.map((p, i) =>
                  branchAfter(key, p.pass ?? i + 1).map((b, j) => (
                    <div key={`${i}-${j}`} className="my-1 ml-7 flex items-start gap-2 border-l-2 border-dashed border-tertiary-container pl-4 text-body-sm">
                      <Icon name="call_split" className="text-[16px] text-tertiary" />
                      <span>
                        <b className="text-tertiary">Branch: {b.label}</b> → {b.to === "end" ? "finish" : AGENTS[b.to].name}. <span className="text-on-surface-variant">{b.reason}</span>
                      </span>
                    </div>
                  )),
                )}
              </li>
            );
          })}
        </ol>
        <div className="border-t border-slate-100 p-4 text-body-sm">
          {run.error ? (
            <p className="text-on-error-container">{run.error}</p>
          ) : run.phase === "saving" ? (
            <p className="flex items-center gap-2"><Icon name="progress_activity" className="animate-spin text-[18px] text-primary" /> Saving your plan…</p>
          ) : run.phase === "done" ? (
            <p className="flex items-center gap-2 text-emerald-700"><Icon name="check_circle" className="text-[18px]" /> Plan ready. Opening it…</p>
          ) : (
            <p className="text-on-surface-variant">This usually takes about a minute. You can watch each agent hand off to the next.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** An agent counts as skipped once an agent later in the order has run. */
function ranKeysAfter(key: AgentKey, ran: Set<AgentKey>) {
  return ORDER.slice(ORDER.indexOf(key) + 1).some((k) => ran.has(k));
}
