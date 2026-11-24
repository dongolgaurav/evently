export type Tier = "exec" | "lead" | "member" | "volunteer" | "prospect";

export type Club = {
  id: string;
  name: string;
  full_name: string | null;
  term: string | null;
  semester_budget: number;
};

export type Member = {
  id: string;
  club_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  title: string | null;
  tier: Tier;
  major: string | null;
  year: string | null;
  notes: string | null;
  is_admin: boolean;
};

export type FundingSource = { name: string; amount: number };

export type EventRow = {
  id: string;
  club_id: string;
  title: string;
  category: string;
  concept: string | null;
  event_date: string | null;
  time_window: string | null;
  venue: string | null;
  capacity: number;
  rsvp_count: number;
  budget_total: number;
  funding_sources: FundingSource[];
  status: "draft" | "planning" | "locked" | "completed";
  ai_generated: boolean;
  plan_source: string | null;
  plan_summary: string | null;
  plan_version: number;
  location: string | null;
  agent_trace: import("./agents/trace").AgentTrace | null;
  slug: string | null;
  public_page: boolean;
  created_at: string;
  updated_at: string;
};

export type Phase = { id: string; event_id: string; name: string; subtitle: string | null; position: number };

export type Task = {
  id: string;
  club_id: string;
  event_id: string;
  phase_id: string | null;
  kind: "task" | "compliance";
  title: string;
  detail: string | null;
  tag: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: boolean;
  done: boolean;
  position: number;
};

export type BudgetItem = {
  id: string;
  event_id: string;
  category: string;
  allocated: number;
  spent: number;
  position: number;
};

export type TimelineItem = {
  id: string;
  event_id: string;
  start_time: string;
  title: string;
  detail: string | null;
  location: string | null;
  position: number;
};

export type EventRole = { id: string; event_id: string; member_id: string; responsibility: string };

export type Activity = {
  id: string;
  event_id: string | null;
  actor_name: string;
  message: string;
  created_at: string;
};

export const TIER_LABEL: Record<Tier, string> = {
  exec: "Executive Board",
  lead: "Chair / Lead",
  member: "Committee Member",
  volunteer: "Volunteer",
  prospect: "Sign-up",
};

export const CATEGORIES = [
  { key: "Academic/Tech", icon: "code" },
  { key: "Social", icon: "celebration" },
  { key: "Career", icon: "work" },
  { key: "Workshop", icon: "school" },
  { key: "Fundraiser", icon: "volunteer_activism" },
] as const;

export const STATUS_LABEL: Record<EventRow["status"], string> = {
  draft: "Drafting",
  planning: "Planning phase",
  locked: "Logistics locked",
  completed: "Completed",
};

/** Open tasks per organizer above which the roster flags someone as overloaded. */
export const TASK_CAP = 4;
/** AI-generated plans allowed per club per calendar month. */
export const MONTHLY_AI_PLANS = 10;

export type Rsvp = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  status: "going" | "waitlist" | "cancelled";
  source: "public" | "manual";
  check_in_code: string;
  checked_in_at: string | null;
  created_at: string;
};
