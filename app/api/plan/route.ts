import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { getContext, monthStartISO } from "@/lib/data";
import { isSameOrigin } from "@/lib/same-origin";
import { buildTemplatePlan } from "@/lib/plan/template";
import type { Plan, PlanMember } from "@/lib/plan/types";
import { MODEL, openaiKey, runPlanningWorkflow, sanitizePlan, type WorkflowInput } from "@/lib/agents/workflow";
import type { AgentTrace, StreamEvent } from "@/lib/agents/trace";
import { MONTHLY_AI_PLANS, type FundingSource, type Member } from "@/lib/types";

// The agents make 8-12 model calls; give the function room to finish.
export const maxDuration = 300;

type Body = {
  title?: string;
  category?: string;
  event_date?: string;
  time_window?: string;
  venue?: string;
  location?: string;
  attendees?: number | string;
  budget?: number | string;
  concept?: string;
  members?: { id: string; focus?: string }[];
  funding_sources?: FundingSource[];
};

const text = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const amount = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Runs the multi-agent planning workflow and streams its progress as NDJSON
 * (one StreamEvent per line), then saves the plan and reports the new event id.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ctx = await getContext();
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "The form could not be read. Please reload and try again." }, { status: 400 });
  }

  const title = text(body.title, 120);
  if (title.length < 2) return Response.json({ error: "Give the event a title." }, { status: 400 });
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(text(body.event_date)) ? text(body.event_date) : null;

  const ai = Boolean(openaiKey());
  if (ai) {
    const { count } = await ctx.supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("club_id", ctx.club.id)
      .eq("plan_source", "ai")
      .gte("created_at", monthStartISO());
    if ((count ?? 0) >= MONTHLY_AI_PLANS) {
      return Response.json({ error: `Your club has used all ${MONTHLY_AI_PLANS} AI plans for this month. They reset on the 1st.` }, { status: 429 });
    }
  }

  const { data: roster } = await ctx.supabase.from("members").select("*").eq("club_id", ctx.club.id).neq("tier", "prospect");
  const byId = new Map(((roster ?? []) as Member[]).map((m) => [m.id, m]));
  const members: PlanMember[] = (Array.isArray(body.members) ? body.members : [])
    .filter((p) => byId.has(p.id))
    .map((p) => {
      const m = byId.get(p.id)!;
      return { id: m.id, name: m.full_name, title: m.title ?? "", focus: text(p.focus, 80) };
    });
  const funding = (Array.isArray(body.funding_sources) ? body.funding_sources : [])
    .map((f) => ({ name: text(f.name, 80), amount: amount(f.amount) }))
    .filter((f) => f.name);

  const input: WorkflowInput = {
    title,
    category: text(body.category, 40) || "Social",
    eventDate,
    timeWindow: text(body.time_window, 80),
    venue: text(body.venue, 120),
    location: text(body.location, 120),
    attendees: Math.round(amount(body.attendees)),
    budget: amount(body.budget),
    concept: text(body.concept),
    members,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          // The browser went away; keep going so the plan is still saved.
        }
      };

      let plan: Plan;
      let trace: AgentTrace;
      let source: "ai" | "template" = "ai";
      const started = Date.now();
      if (ai) {
        try {
          const result = await runPlanningWorkflow(input, emit);
          plan = sanitizePlan(result.plan, input);
          trace = result.trace;
        } catch (error) {
          console.error("Planning workflow failed:", error);
          source = "template";
          plan = buildTemplatePlan(input);
          trace = {
            engine: "template",
            model: MODEL(),
            steps: [],
            branches: [],
            skipped: [],
            note: "The AI agents could not finish, so Evently's built-in generator wrote this plan instead. Try generating again later.",
            ms: Date.now() - started,
          };
          emit({ type: "error", message: "The AI agents could not finish; saving a plan from the built-in generator instead." });
        }
      } else {
        source = "template";
        emit({ type: "start", model: null, engine: "template" });
        plan = buildTemplatePlan(input);
        trace = {
          engine: "template",
          model: null,
          steps: [],
          branches: [],
          skipped: [],
          note: "No OpenAI key is configured, so Evently's built-in generator wrote this plan.",
          ms: Date.now() - started,
        };
      }

      emit({ type: "saving" });
      const payload = {
        title: input.title,
        category: input.category,
        concept: input.concept || null,
        event_date: eventDate,
        time_window: input.timeWindow || null,
        venue: input.venue || null,
        location: input.location || null,
        capacity: input.attendees,
        budget_total: input.budget,
        funding_sources: funding,
        ai_generated: source === "ai",
        plan_source: source,
        plan_summary: plan.summary,
        agent_trace: trace,
        roles: plan.roles,
        budget: plan.budget,
        phases: plan.phases,
        timeline: plan.timeline,
        compliance: plan.compliance,
      };
      const { data: eventId, error } = await ctx.supabase.rpc("create_event_plan", { p_club: ctx.club.id, p: payload });
      if (error) {
        emit({ type: "error", message: `The plan could not be saved: ${error.message}` });
      } else {
        await ctx.supabase.from("activity").insert({
          club_id: ctx.club.id,
          event_id: String(eventId),
          actor_name: ctx.me.full_name,
          message: source === "ai" ? `ran the AI planning agents for "${title}"` : `generated a plan for "${title}"`,
        });
        revalidatePath("/", "layout");
        emit({ type: "done", eventId: String(eventId) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
