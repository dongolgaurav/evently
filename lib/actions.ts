"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { CLUB_COOKIE, getContext, getUser } from "./data";
import { TASK_CAP, type FundingSource, type Member, type Task } from "./types";

/**
 * `redirect` asks the client to do a full page load. Used whenever the signed-in user
 * or the current club changes, so no cached layout from the previous context is reused.
 */
export type FormState = { error?: string; message?: string; redirect?: string } | undefined;
type Ctx = Awaited<ReturnType<typeof getContext>>;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const opt = (fd: FormData, key: string) => str(fd, key) || null;
const num = (fd: FormData, key: string) => {
  const n = Number(str(fd, key).replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const refresh = () => revalidatePath("/", "layout");
const check = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

async function log(ctx: Ctx, message: string, eventId?: string | null) {
  await ctx.supabase
    .from("activity")
    .insert({ club_id: ctx.club.id, event_id: eventId ?? null, actor_name: ctx.me.full_name, message });
}

const COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const, httpOnly: true };

// ---------------------------------------------------------------- auth
export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd, "email"), password: str(fd, "password") });
  if (error) {
    return {
      error: /confirm/i.test(error.message)
        ? "Please confirm your email first — check your inbox for the link."
        : "That email and password don't match an account.",
    };
  }
  return { redirect: "/dashboard" };
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "full_name");
  const email = str(fd, "email");
  const password = str(fd, "password");
  if (name.length < 2) return { error: "Please enter your name." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.session) return { redirect: "/dashboard" };
  return { message: `We sent a confirmation link to ${email}. Open it to finish creating your account.` };
}

// ---------------------------------------------------------------- clubs
export async function createClub(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  const name = str(fd, "name");
  if (name.length < 2) return { error: "Give your club a name." };
  const { data, error } = await supabase.rpc("create_club", {
    p_name: name,
    p_full_name: str(fd, "full_name"),
    p_term: str(fd, "term"),
    p_title: str(fd, "title"),
    p_member_name: str(fd, "member_name") || String(user.user_metadata?.full_name ?? ""),
  });
  if (error) return { error: error.message };
  (await cookies()).set(CLUB_COOKIE, String(data), COOKIE_OPTS);
  return { redirect: "/dashboard?welcome=1" };
}

export async function updateClub(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  if (!ctx.me.is_admin) return { error: "Only club admins can change club settings." };
  const name = str(fd, "name");
  if (name.length < 2) return { error: "Give your club a name." };
  const { error } = await ctx.supabase
    .from("clubs")
    .update({ name, full_name: opt(fd, "full_name"), term: opt(fd, "term"), semester_budget: num(fd, "semester_budget") })
    .eq("id", ctx.club.id);
  if (error) return { error: error.message };
  refresh();
  return { message: "Club settings saved." };
}

export async function deleteClub(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  if (!ctx.me.is_admin) return { error: "Only club admins can delete the workspace." };
  if (str(fd, "confirm") !== ctx.club.name) return { error: `Type “${ctx.club.name}” exactly to confirm.` };
  const { error } = await ctx.supabase.from("clubs").delete().eq("id", ctx.club.id);
  if (error) return { error: error.message };
  (await cookies()).delete(CLUB_COOKIE);
  return { redirect: "/dashboard" };
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  const full_name = str(fd, "full_name");
  if (!full_name) return { error: "Please enter your name." };
  const { error } = await ctx.supabase
    .from("members")
    .update({ full_name, title: opt(fd, "title"), major: opt(fd, "major"), year: opt(fd, "year") })
    .eq("id", ctx.me.id);
  if (error) return { error: error.message };
  await ctx.supabase.auth.updateUser({ data: { full_name } });
  refresh();
  return { message: "Profile saved." };
}

// ---------------------------------------------------------------- planner
/** Creates an empty event. Generated plans go through the agent workflow in /api/plan. */
export async function createPlan(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  const title = str(fd, "title");
  if (title.length < 2) return { error: "Give the event a title." };
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "event_date")) ? str(fd, "event_date") : null;
  let funding: FundingSource[] = [];
  try {
    funding = (JSON.parse(str(fd, "funding_sources") || "[]") as FundingSource[])
      .map((f) => ({ name: String(f.name ?? "").trim(), amount: Number(f.amount) || 0 }))
      .filter((f) => f.name);
  } catch {
    return { error: "The form could not be read. Please reload and try again." };
  }
  const payload = {
    title,
    category: str(fd, "category") || "Social",
    concept: opt(fd, "concept"),
    event_date: eventDate,
    time_window: opt(fd, "time_window"),
    venue: opt(fd, "venue"),
    location: opt(fd, "location"),
    capacity: Math.round(num(fd, "attendees")),
    budget_total: num(fd, "budget"),
    funding_sources: funding,
    ai_generated: false,
    plan_source: "blank",
  };
  const { data: eventId, error } = await ctx.supabase.rpc("create_event_plan", { p_club: ctx.club.id, p: payload });
  if (error) return { error: `The event could not be saved: ${error.message}` };
  await log(ctx, `created the event "${title}"`, String(eventId));
  refresh();
  redirect(`/events/${eventId}`);
}

// ---------------------------------------------------------------- events
export async function updateEvent(fd: FormData) {
  const ctx = await getContext();
  const id = str(fd, "id");
  const patch: Record<string, unknown> = {};
  if (fd.has("title") && str(fd, "title").length >= 2) patch.title = str(fd, "title");
  if (fd.has("category")) patch.category = str(fd, "category");
  if (fd.has("event_date")) patch.event_date = opt(fd, "event_date");
  if (fd.has("time_window")) patch.time_window = opt(fd, "time_window");
  if (fd.has("venue")) patch.venue = opt(fd, "venue");
  if (fd.has("location")) patch.location = opt(fd, "location");
  if (fd.has("concept")) patch.concept = opt(fd, "concept");
  if (fd.has("capacity")) patch.capacity = Math.round(num(fd, "capacity"));
  if (fd.has("rsvp_count")) patch.rsvp_count = Math.round(num(fd, "rsvp_count"));
  if (fd.has("budget_total")) patch.budget_total = num(fd, "budget_total");
  if (fd.has("status") && ["draft", "planning", "locked", "completed"].includes(str(fd, "status"))) patch.status = str(fd, "status");
  if (Object.keys(patch).length === 0) return;
  check((await ctx.supabase.from("events").update(patch).eq("id", id).eq("club_id", ctx.club.id)).error);
  if (patch.status) await log(ctx, `moved an event to "${patch.status}"`, id);
  refresh();
}

export async function deleteEvent(fd: FormData) {
  const ctx = await getContext();
  const id = str(fd, "id");
  const { data } = await ctx.supabase.from("events").select("title").eq("id", id).maybeSingle();
  check((await ctx.supabase.from("events").delete().eq("id", id).eq("club_id", ctx.club.id)).error);
  if (data) await log(ctx, `deleted the event "${data.title}"`);
  refresh();
  redirect("/events");
}

export async function saveFunding(fd: FormData) {
  const ctx = await getContext();
  const id = str(fd, "id");
  const { data } = await ctx.supabase.from("events").select("funding_sources").eq("id", id).single();
  let list = ((data?.funding_sources ?? []) as FundingSource[]).slice();
  if (fd.has("remove")) list = list.filter((_, i) => i !== Number(str(fd, "remove")));
  else if (str(fd, "name")) list.push({ name: str(fd, "name"), amount: num(fd, "amount") });
  check((await ctx.supabase.from("events").update({ funding_sources: list }).eq("id", id)).error);
  refresh();
}

// ---------------------------------------------------------------- tasks
export async function addPhase(fd: FormData) {
  const ctx = await getContext();
  const event_id = str(fd, "event_id");
  if (!str(fd, "name")) return;
  const { count } = await ctx.supabase.from("phases").select("id", { count: "exact", head: true }).eq("event_id", event_id);
  check(
    (
      await ctx.supabase
        .from("phases")
        .insert({ club_id: ctx.club.id, event_id, name: str(fd, "name"), subtitle: opt(fd, "subtitle"), position: count ?? 0 })
    ).error,
  );
  refresh();
}

export async function deletePhase(fd: FormData) {
  const ctx = await getContext();
  check((await ctx.supabase.from("phases").delete().eq("id", str(fd, "id"))).error);
  refresh();
}

export async function addTask(fd: FormData) {
  const ctx = await getContext();
  const title = str(fd, "title");
  if (!title) return;
  const event_id = str(fd, "event_id");
  check(
    (
      await ctx.supabase.from("tasks").insert({
        club_id: ctx.club.id,
        event_id,
        phase_id: opt(fd, "phase_id"),
        kind: str(fd, "kind") === "compliance" ? "compliance" : "task",
        title,
        detail: opt(fd, "detail"),
        tag: opt(fd, "tag"),
        assignee_id: opt(fd, "assignee_id"),
        due_date: opt(fd, "due_date"),
        priority: fd.get("priority") === "on",
        position: 1000,
      })
    ).error,
  );
  await log(ctx, `added the task "${title}"`, event_id);
  refresh();
}

export async function toggleTask(fd: FormData) {
  const ctx = await getContext();
  const done = str(fd, "done") === "true";
  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({ done })
    .eq("id", str(fd, "id"))
    .select("title, event_id")
    .maybeSingle();
  check(error);
  if (data && done) await log(ctx, `completed "${data.title}"`, data.event_id);
  refresh();
}

export async function updateTask(fd: FormData) {
  const ctx = await getContext();
  const patch: Record<string, unknown> = {};
  if (fd.has("title") && str(fd, "title")) patch.title = str(fd, "title");
  if (fd.has("detail")) patch.detail = opt(fd, "detail");
  if (fd.has("tag")) patch.tag = opt(fd, "tag");
  if (fd.has("assignee_id")) patch.assignee_id = opt(fd, "assignee_id");
  if (fd.has("due_date")) patch.due_date = opt(fd, "due_date");
  if (fd.has("priority_set")) patch.priority = fd.get("priority") === "on";
  check((await ctx.supabase.from("tasks").update(patch).eq("id", str(fd, "id"))).error);
  refresh();
}

export async function deleteTask(fd: FormData) {
  const ctx = await getContext();
  check((await ctx.supabase.from("tasks").delete().eq("id", str(fd, "id"))).error);
  refresh();
}

/**
 * Even out open tasks: hand unassigned tasks to whoever has the fewest, then move
 * tasks off anyone above the cap. Loads are counted across the whole club.
 */
async function rebalance(ctx: Ctx, opts: { eventId?: string; fromMember?: string }) {
  const [{ data: memberRows }, { data: taskRows }] = await Promise.all([
    ctx.supabase.from("members").select("*").eq("club_id", ctx.club.id).neq("tier", "prospect"),
    ctx.supabase.from("tasks").select("*").eq("club_id", ctx.club.id).eq("kind", "task").eq("done", false),
  ]);
  const members = (memberRows ?? []) as Member[];
  const tasks = (taskRows ?? []) as Task[];
  if (members.length < 2) return 0;

  let pool = members.map((m) => m.id);
  if (opts.eventId) {
    const { data: roles } = await ctx.supabase.from("event_roles").select("member_id").eq("event_id", opts.eventId);
    if (roles && roles.length >= 2) pool = roles.map((r) => r.member_id as string);
  }
  const load = new Map(members.map((m) => [m.id, 0]));
  tasks.forEach((t) => t.assignee_id && load.set(t.assignee_id, (load.get(t.assignee_id) ?? 0) + 1));
  const lightest = (exclude?: string) =>
    pool.filter((id) => id !== exclude).reduce((a, b) => (load.get(b)! < load.get(a)! ? b : a), pool.find((id) => id !== exclude)!);
  const movable = tasks
    .filter((t) => !opts.eventId || t.event_id === opts.eventId)
    .sort((a, b) => (b.due_date ?? "9999").localeCompare(a.due_date ?? "9999"));
  const moves = new Map<string, string>();

  for (const t of movable) {
    if (t.assignee_id || opts.fromMember) continue;
    const to = lightest();
    moves.set(t.id, to);
    load.set(to, load.get(to)! + 1);
    t.assignee_id = to;
  }
  for (let i = 0; i < 200; i++) {
    const from = opts.fromMember ?? pool.reduce((a, b) => (load.get(b)! > load.get(a)! ? b : a));
    const to = lightest(from);
    if (!to || load.get(from)! <= TASK_CAP || load.get(from)! - load.get(to)! < 2) break;
    const task = movable.find((t) => t.assignee_id === from);
    if (!task) break;
    task.assignee_id = to;
    moves.set(task.id, to);
    load.set(from, load.get(from)! - 1);
    load.set(to, load.get(to)! + 1);
  }
  await Promise.all([...moves].map(([id, to]) => ctx.supabase.from("tasks").update({ assignee_id: to }).eq("id", id)));
  return moves.size;
}

export async function rebalanceTasks(fd: FormData) {
  const ctx = await getContext();
  const eventId = opt(fd, "event_id") ?? undefined;
  const fromMember = opt(fd, "member_id") ?? undefined;
  const moved = await rebalance(ctx, { eventId, fromMember });
  if (moved) await log(ctx, `rebalanced ${moved} task${moved === 1 ? "" : "s"} across the team`, eventId);
  refresh();
  const back = str(fd, "back");
  if (back.startsWith("/")) redirect(`${back}${back.includes("?") ? "&" : "?"}moved=${moved}`);
}

// ---------------------------------------------------------------- budget
export async function addBudgetItem(fd: FormData) {
  const ctx = await getContext();
  if (!str(fd, "category")) return;
  check(
    (
      await ctx.supabase.from("budget_items").insert({
        club_id: ctx.club.id,
        event_id: str(fd, "event_id"),
        category: str(fd, "category"),
        allocated: num(fd, "allocated"),
        position: 1000,
      })
    ).error,
  );
  refresh();
}

export async function updateBudgetItem(fd: FormData) {
  const ctx = await getContext();
  const patch: Record<string, unknown> = {};
  if (str(fd, "category")) patch.category = str(fd, "category");
  if (fd.has("allocated")) patch.allocated = num(fd, "allocated");
  if (fd.has("spent")) patch.spent = num(fd, "spent");
  check((await ctx.supabase.from("budget_items").update(patch).eq("id", str(fd, "id"))).error);
  refresh();
}

export async function logExpense(fd: FormData) {
  const ctx = await getContext();
  const amount = num(fd, "amount");
  if (!amount) return;
  const { data, error } = await ctx.supabase.from("budget_items").select("*").eq("id", str(fd, "id")).single();
  check(error);
  check((await ctx.supabase.from("budget_items").update({ spent: Number(data.spent) + amount }).eq("id", data.id)).error);
  const note = str(fd, "note");
  await log(ctx, `logged a $${amount.toLocaleString("en-US")} expense under ${data.category}${note ? ` (${note})` : ""}`, data.event_id);
  refresh();
}

export async function deleteBudgetItem(fd: FormData) {
  const ctx = await getContext();
  check((await ctx.supabase.from("budget_items").delete().eq("id", str(fd, "id"))).error);
  refresh();
}

// ---------------------------------------------------------------- run of show
export async function addTimelineItem(fd: FormData) {
  const ctx = await getContext();
  if (!str(fd, "title") || !/^\d{2}:\d{2}/.test(str(fd, "start_time"))) return;
  check(
    (
      await ctx.supabase.from("timeline_items").insert({
        club_id: ctx.club.id,
        event_id: str(fd, "event_id"),
        start_time: str(fd, "start_time"),
        title: str(fd, "title"),
        detail: opt(fd, "detail"),
        location: opt(fd, "location"),
      })
    ).error,
  );
  refresh();
}

export async function deleteTimelineItem(fd: FormData) {
  const ctx = await getContext();
  check((await ctx.supabase.from("timeline_items").delete().eq("id", str(fd, "id"))).error);
  refresh();
}

// ---------------------------------------------------------------- roles
export async function setEventRole(fd: FormData) {
  const ctx = await getContext();
  if (!str(fd, "member_id") || !str(fd, "responsibility")) return;
  check(
    (
      await ctx.supabase.from("event_roles").upsert(
        {
          club_id: ctx.club.id,
          event_id: str(fd, "event_id"),
          member_id: str(fd, "member_id"),
          responsibility: str(fd, "responsibility"),
        },
        { onConflict: "event_id,member_id" },
      )
    ).error,
  );
  refresh();
}

export async function removeEventRole(fd: FormData) {
  const ctx = await getContext();
  check((await ctx.supabase.from("event_roles").delete().eq("id", str(fd, "id"))).error);
  refresh();
}

// ---------------------------------------------------------------- roster
const TIERS = ["exec", "lead", "member", "volunteer", "prospect"];

export async function addMember(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  if (!ctx.me.is_admin) return { error: "Only club admins can add people to the roster." };
  const full_name = str(fd, "full_name");
  const tier = TIERS.includes(str(fd, "tier")) ? str(fd, "tier") : "member";
  const email = opt(fd, "email")?.toLowerCase() ?? null;
  if (!full_name) return { error: "Enter a name." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "That email address doesn't look right." };
  const { error } = await ctx.supabase.from("members").insert({
    club_id: ctx.club.id,
    full_name,
    email,
    title: opt(fd, "title"),
    tier,
    major: opt(fd, "major"),
    year: opt(fd, "year"),
    notes: opt(fd, "notes"),
  });
  if (error) return { error: error.message };
  await log(ctx, tier === "prospect" ? `added ${full_name} to the volunteer sign-up pool` : `added ${full_name} to the roster`);
  refresh();
  return {
    message:
      email && tier !== "prospect"
        ? `${full_name} added. When they sign up with ${email}, they'll join this workspace automatically.`
        : `${full_name} added.`,
  };
}

export async function updateMember(fd: FormData) {
  const ctx = await getContext();
  const id = str(fd, "id");
  const patch: Record<string, unknown> = {};
  if (str(fd, "full_name")) patch.full_name = str(fd, "full_name");
  for (const key of ["title", "major", "year", "notes"]) if (fd.has(key)) patch[key] = opt(fd, key);
  if (ctx.me.is_admin) {
    if (fd.has("email")) patch.email = opt(fd, "email")?.toLowerCase() ?? null;
    if (TIERS.includes(str(fd, "tier"))) patch.tier = str(fd, "tier");
    if (fd.has("admin_set") && id !== ctx.me.id) patch.is_admin = fd.get("is_admin") === "on";
  }
  check((await ctx.supabase.from("members").update(patch).eq("id", id).eq("club_id", ctx.club.id)).error);
  refresh();
}

export async function removeMember(fd: FormData) {
  const ctx = await getContext();
  const id = str(fd, "id");
  if (!ctx.me.is_admin || id === ctx.me.id) return;
  const { data } = await ctx.supabase.from("members").select("full_name").eq("id", id).maybeSingle();
  check((await ctx.supabase.from("members").delete().eq("id", id).eq("club_id", ctx.club.id)).error);
  if (data) await log(ctx, `removed ${data.full_name} from the roster`);
  refresh();
}
