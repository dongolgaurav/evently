import "server-only";
import { notFound } from "next/navigation";
import { getContext } from "./data";
import type { BudgetItem, EventRole, EventRow, Member, Phase, Task, TimelineItem } from "./types";

/** One event with its whole plan. RLS guarantees it belongs to one of the user's clubs. */
export async function loadEvent(id: string) {
  const ctx = await getContext();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, club } = ctx;
  const [event, phases, tasks, budget, timeline, roles, members] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).eq("club_id", club.id).maybeSingle(),
    supabase.from("phases").select("*").eq("event_id", id).order("position"),
    supabase.from("tasks").select("*").eq("event_id", id).order("position").order("created_at"),
    supabase.from("budget_items").select("*").eq("event_id", id).order("position"),
    supabase.from("timeline_items").select("*").eq("event_id", id).order("start_time"),
    supabase.from("event_roles").select("*").eq("event_id", id),
    supabase.from("members").select("*").eq("club_id", club.id).neq("tier", "prospect").order("created_at"),
  ]);
  if (!event.data) notFound();
  const e = event.data as EventRow;
  const allMembers = (members.data ?? []) as Member[];
  return {
    ctx,
    event: { ...e, budget_total: Number(e.budget_total), funding_sources: e.funding_sources ?? [] },
    phases: (phases.data ?? []) as Phase[],
    tasks: (tasks.data ?? []) as Task[],
    budget: ((budget.data ?? []) as BudgetItem[]).map((b) => ({ ...b, allocated: Number(b.allocated), spent: Number(b.spent) })),
    timeline: (timeline.data ?? []) as TimelineItem[],
    roles: (roles.data ?? []) as EventRole[],
    members: allMembers,
    memberById: new Map(allMembers.map((m) => [m.id, m])),
  };
}
