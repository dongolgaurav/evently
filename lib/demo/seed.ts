import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import runs from "./agent-runs.json";
import { buildTemplatePlan } from "@/lib/plan/template";
import { todayISO } from "@/lib/format";

/** A believable club board for the demo. "Maya Lin" in the saved runs is the signed-in user. */
const TEAM = [
  { name: "Jordan Reed", title: "VP Logistics & Operations", tier: "exec", year: "Junior", major: "Electrical Engineering" },
  { name: "Chloe Vance", title: "Treasurer & Finance Lead", tier: "exec", year: "Sophomore", major: "Economics" },
  { name: "Liam Zhang", title: "Marketing & Social Media Chair", tier: "lead", year: "Junior", major: "Design & Media" },
  { name: "Samira Khan", title: "Hospitality Coordinator", tier: "member", year: "Freshman", major: "Information Systems" },
  { name: "Devon Taylor", title: "Volunteer Lead", tier: "volunteer", year: "Sophomore", major: "Computer Science" },
];
const PROSPECTS = [
  { name: "Anika Kapoor", year: "Freshman", major: "Data Science", notes: "Interested in hackathon check-in" },
  { name: "Mateo Rios", year: "Freshman", major: "Mechanical Engineering", notes: "Audio setup and venue logistics" },
];
const GUESTS = [
  "Ava Thompson", "Noah Patel", "Sofia Garcia", "Ethan Kim", "Zara Ahmed", "Lucas Nguyen", "Mia Robinson", "Omar Hassan",
  "Chloe Martin", "Kai Wong", "Isabella Rossi", "Jamal Brooks", "Priya Raman", "Leo Fischer", "Hana Sato", "Diego Morales",
  "Grace Okafor", "Ben Carter", "Amara Diallo", "Ryan O'Neill", "Lily Chen", "Mohammed Ali", "Ella Johansson",
];

type Run = (typeof runs)[number];

/**
 * Fills a club with a sample board, two plans written by the real agent workflow
 * (saved runs, so no AI calls or waiting), one template-built plan, RSVPs and activity.
 * Runs as the signed-in admin, so row-level security still applies.
 */
export async function seedDemo(supabase: SupabaseClient, clubId: string, me: { id: string; full_name: string }) {
  const check = <T extends { error: { message: string } | null }>(r: T) => {
    if (r.error) throw new Error(r.error.message);
    return r;
  };

  const { data: inserted } = check(
    await supabase
      .from("members")
      .insert([
        ...TEAM.map((m) => ({ club_id: clubId, full_name: m.name, title: m.title, tier: m.tier, year: m.year, major: m.major })),
        ...PROSPECTS.map((p) => ({ club_id: clubId, full_name: p.name, tier: "prospect", year: p.year, major: p.major, notes: p.notes })),
      ])
      .select("id, full_name"),
  );
  const idOf = new Map<string, string>((inserted ?? []).map((m: { id: string; full_name: string }) => [m.full_name, m.id]));
  idOf.set("Maya Lin", me.id);
  const id = (name: string | null) => (name ? (idOf.get(name) ?? null) : null);

  const fromRun = (r: Run) => ({
    title: r.title,
    category: r.category,
    concept: r.concept,
    event_date: r.event_date,
    time_window: r.time_window,
    venue: r.venue,
    location: r.location,
    capacity: r.capacity,
    budget_total: r.budget_total,
    funding_sources: r.funding_sources,
    ai_generated: true,
    // Saved runs don't count toward the club's monthly AI plan allowance.
    plan_source: "ai_demo",
    plan_summary: r.plan_summary,
    agent_trace: { ...r.agent_trace, note: "Demo club: this is a real run of the planning agents, saved so you can explore it instantly." },
    roles: r.roles.filter((x) => id(x.member)).map((x) => ({ member_id: id(x.member), responsibility: x.responsibility })),
    budget: r.budget,
    timeline: r.timeline,
    phases: r.phases.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t, assignee_id: id(t.member) })) })),
    compliance: r.compliance,
  });

  const panelInput = {
    title: "Alumni Industry Panel & Portfolio Roast",
    category: "Career",
    eventDate: "2027-02-18",
    timeWindow: "6:00–8:30 PM",
    venue: "Auditorium 2",
    attendees: 100,
    budget: 400,
    concept: "Four alumni from local tech companies share how they got their first roles, then review student portfolios in small groups.",
    members: [
      { id: me.id, name: me.full_name, title: "Club President", focus: "Overall lead" },
      ...TEAM.slice(0, 4).map((m) => ({ id: idOf.get(m.name)!, name: m.name, title: m.title, focus: m.title })),
    ],
  };
  const panel = buildTemplatePlan(panelInput);

  const payloads = [
    ...runs.map(fromRun),
    {
      title: panelInput.title,
      category: panelInput.category,
      concept: panelInput.concept,
      event_date: panelInput.eventDate,
      time_window: panelInput.timeWindow,
      venue: panelInput.venue,
      location: "Austin, TX",
      capacity: panelInput.attendees,
      budget_total: panelInput.budget,
      funding_sources: [{ name: "Career Services co-sponsorship", amount: 400 }],
      ai_generated: false,
      plan_source: "template",
      plan_summary: panel.summary,
      agent_trace: { engine: "template", model: null, steps: [], branches: [], skipped: [], ms: 0, note: "Demo club: this plan came from Evently's built-in generator. Generate a new event to watch the AI agents work." },
      ...panel,
    },
  ];

  const eventIds: Record<string, string> = {};
  for (const p of payloads) {
    const { data } = check(await supabase.rpc("create_event_plan", { p_club: clubId, p }));
    eventIds[p.title] = String(data);
  }

  // Make it look mid-semester: past-due tasks are done, some money is spent.
  const today = todayISO();
  const ids = Object.values(eventIds);
  check(await supabase.from("tasks").update({ done: true }).in("event_id", ids).lt("due_date", today));
  const movie = eventIds["Outdoor Movie Night on the Quad"];
  const hack = eventIds["Fall Hackathon 2026"];
  if (movie) {
    const { data: lines } = await supabase.from("budget_items").select("id, allocated, category").eq("event_id", movie);
    for (const l of (lines ?? []) as { id: string; allocated: number; category: string }[]) {
      if (/screen|blanket|marketing/i.test(l.category)) await supabase.from("budget_items").update({ spent: Number(l.allocated) }).eq("id", l.id);
    }
    check(await supabase.from("events").update({ status: "locked", public_page: true, slug: `movie-night-${Math.random().toString(36).slice(2, 6)}` }).eq("id", movie));
    check(
      await supabase.from("rsvps").insert(
        GUESTS.map((name) => ({
          club_id: clubId,
          event_id: movie,
          name,
          email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.edu`,
          status: "going",
          source: "public",
        })),
      ),
    );
  }
  if (hack) {
    const { data: lines } = await supabase.from("budget_items").select("id, allocated, category").eq("event_id", hack);
    for (const l of (lines ?? []) as { id: string; allocated: number; category: string }[]) {
      if (/marketing|workshop/i.test(l.category)) await supabase.from("budget_items").update({ spent: Math.round(Number(l.allocated) * 0.6) }).eq("id", l.id);
    }
  }
  check(await supabase.from("clubs").update({ semester_budget: 5000 }).eq("id", clubId));

  const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  await supabase.from("activity").insert([
    { club_id: clubId, event_id: hack, actor_name: me.full_name, message: 'ran the AI planning agents for "Fall Hackathon 2026"', created_at: ago(30) },
    { club_id: clubId, event_id: movie, actor_name: "Chloe Vance", message: "logged a $120 expense under Inflatable screen rental", created_at: ago(20) },
    { club_id: clubId, event_id: movie, actor_name: "Liam Zhang", message: 'opened public RSVPs for "Outdoor Movie Night on the Quad"', created_at: ago(9) },
    { club_id: clubId, event_id: movie, actor_name: "Jordan Reed", message: 'completed "Reserve Main Quad and confirm power access"', created_at: ago(3) },
  ]);
}
