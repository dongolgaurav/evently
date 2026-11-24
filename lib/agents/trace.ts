/** Shared shape of an agent run, stored on the event and streamed to the browser. */

export const AGENTS = {
  brief: { name: "Brief Analyst", icon: "psychology", role: "Turns your description into structured requirements" },
  weather: { name: "Weather Scout", icon: "partly_cloudy_day", role: "Looks up the location and the weather for the date (Open-Meteo)" },
  calendar: { name: "Calendar Scout", icon: "event_busy", role: "Checks public holidays around the date (Nager.Date)" },
  budget: { name: "Budget Strategist", icon: "savings", role: "Tests cost per attendee and splits the budget" },
  sponsor: { name: "Sponsorship Agent", icon: "handshake", role: "Finds sponsor targets and drafts the outreach email" },
  scheduler: { name: "Logistics Planner", icon: "view_timeline", role: "Builds roles, the phased checklist and the run of show" },
  reviewer: { name: "Risk Reviewer", icon: "verified_user", role: "Audits the plan and can send it back for revision" },
} as const;

export type AgentKey = keyof typeof AGENTS;

export type ToolCallRecord = { name: string; input: Record<string, unknown>; output: unknown; ok: boolean };

export type TraceStep = {
  agent: AgentKey;
  summary: string;
  details?: Record<string, unknown>;
  tools?: ToolCallRecord[];
  ms: number;
  pass?: number;
};

export type BranchDecision = { at: AgentKey; to: AgentKey | "end"; label: string; reason: string };

export type AgentTrace = {
  engine: "langgraph" | "template";
  model: string | null;
  steps: TraceStep[];
  branches: BranchDecision[];
  skipped: AgentKey[];
  sponsorship?: SponsorPitch | null;
  note?: string;
  ms: number;
};

export type SponsorPitch = {
  funding_gap_usd: number;
  targets: { type: string; example: string; why: string; ask_usd: number }[];
  email_subject: string;
  email_body: string;
};

export type StreamEvent =
  | { type: "start"; model: string | null; engine: AgentTrace["engine"] }
  | { type: "agent_start"; agent: AgentKey; pass?: number }
  | { type: "agent_done"; step: TraceStep }
  | { type: "branch"; branch: BranchDecision }
  | { type: "saving" }
  | { type: "done"; eventId: string }
  | { type: "error"; message: string };
