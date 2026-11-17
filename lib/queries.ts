import "server-only";
import type { getContext } from "./data";
import type { BudgetItem, EventRow, Member, Task } from "./types";
import { todayISO } from "./format";

type Ctx = Awaited<ReturnType<typeof getContext>>;

export type EventSummary = EventRow & {
  tasksTotal: number;
  tasksDone: number;
  overdue: number;
  allocated: number;
  spent: number;
  readiness: number;
  team: Member[];
};

/** Everything the dashboard-style pages need about the current club, in four queries. */
export async function loadClubData(ctx: Ctx) {
  const { supabase, club } = ctx;
  const [events, tasks, budget, members, roles] = await Promise.all([
    supabase.from("events").select("*").eq("club_id", club.id).order("event_date", { ascending: true, nullsFirst: false }),
    supabase.from("tasks").select("*").eq("club_id", club.id),
    supabase.from("budget_items").select("*").eq("club_id", club.id),
    supabase.from("members").select("*").eq("club_id", club.id).order("created_at"),
    supabase.from("event_roles").select("event_id, member_id").eq("club_id", club.id),
  ]);
  for (const r of [events, tasks, budget, members, roles]) if (r.error) throw new Error(r.error.message);

  const allTasks = (tasks.data ?? []) as Task[];
  const allBudget = ((budget.data ?? []) as BudgetItem[]).map((b) => ({ ...b, allocated: Number(b.allocated), spent: Number(b.spent) }));
  const allMembers = (members.data ?? []) as Member[];
  const memberById = new Map(allMembers.map((m) => [m.id, m]));
  const today = todayISO();

  const summaries: EventSummary[] = ((events.data ?? []) as EventRow[]).map((e) => {
    const t = allTasks.filter((x) => x.event_id === e.id);
    const b = allBudget.filter((x) => x.event_id === e.id);
    const done = t.filter((x) => x.done).length;
    const teamIds = new Set([
      ...(roles.data ?? []).filter((r) => r.event_id === e.id).map((r) => r.member_id as string),
      ...t.map((x) => x.assignee_id).filter(Boolean),
    ] as string[]);
    return {
      ...e,
      budget_total: Number(e.budget_total),
      tasksTotal: t.length,
      tasksDone: done,
      overdue: t.filter((x) => !x.done && x.due_date && x.due_date < today).length,
      allocated: b.reduce((s, x) => s + x.allocated, 0),
      spent: b.reduce((s, x) => s + x.spent, 0),
      readiness: t.length ? Math.round((done / t.length) * 100) : 0,
      team: [...teamIds].map((id) => memberById.get(id)).filter(Boolean) as Member[],
    };
  });

  return { events: summaries, tasks: allTasks, budget: allBudget, members: allMembers, memberById };
}
