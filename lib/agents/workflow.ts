import "server-only";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { PlanSchema, type Plan, type PlanInput } from "@/lib/plan/types";
import { geocode, geocodeTool, holidaysNear, weatherTool, type Holiday, type Place, type WeatherReport } from "./tools";
import { AGENTS, type AgentKey, type AgentTrace, type BranchDecision, type SponsorPitch, type StreamEvent, type ToolCallRecord, type TraceStep } from "./trace";

export const openaiKey = () => process.env.OPENAI_API_KEY || process.env.OPENAI_API_SECRET_KEY || "";
export const MODEL = () => process.env.OPENAI_MODEL || "gpt-5.4-mini";

const llm = (effort: "low" | "medium" = "low") =>
  // The Responses API supports tool calling together with reasoning effort.
  new ChatOpenAI({ model: MODEL(), apiKey: openaiKey(), useResponsesApi: true, reasoning: { effort }, maxRetries: 2, timeout: 90_000 });

export type WorkflowInput = PlanInput & { location: string };

// ---------------------------------------------------------------- agent output schemas
const BriefSchema = z.object({
  setting: z.enum(["indoor", "outdoor", "hybrid"]).describe("Where most of the event happens"),
  overnight: z.boolean(),
  serves_food: z.boolean(),
  audience: z.string().describe("Who it is for, in a few words"),
  goals: z.array(z.string()).describe("2-4 concrete goals"),
  must_haves: z.array(z.string()).describe("Specific requirements stated or clearly implied by the brief"),
  open_questions: z.array(z.string()).describe("Up to 3 things the organisers still need to decide"),
});
type Brief = z.infer<typeof BriefSchema>;

const WeatherSchema = z.object({
  risk: z.enum(["low", "medium", "high"]).describe("Risk that weather disrupts an outdoor event"),
  conditions: z.string().describe("One sentence with the actual numbers, e.g. temperatures and chance of rain"),
  backup_plan_needed: z.boolean(),
  recommendations: z.array(z.string()).describe("2-4 concrete, weather-specific actions"),
});
type WeatherAssessment = z.infer<typeof WeatherSchema>;

const CalendarSchema = z.object({
  risk: z.enum(["low", "medium", "high"]).describe("Risk that the date hurts attendance"),
  conflicts: z.array(z.string()).describe("Each holiday or date issue and why it matters"),
  advice: z.string().describe("One or two sentences of advice about the date"),
});
type CalendarAssessment = z.infer<typeof CalendarSchema>;

const BudgetSchema = z.object({
  verdict: z.enum(["lean", "comfortable"]).describe("lean = the budget is too thin for this event without outside funding"),
  reasoning: z.string().describe("Two sentences citing the cost per attendee and the benchmark"),
  allocation: z.array(z.object({ category: z.string(), amount: z.number() })).describe("Whole dollars that sum to the total budget, including a contingency line"),
  savings_ideas: z.array(z.string()).describe("2-3 ways to stretch the budget"),
});
type BudgetAssessment = z.infer<typeof BudgetSchema>;

const SponsorSchema = z.object({
  funding_gap_usd: z.number().describe("Extra money needed for a comfortable event, whole dollars"),
  targets: z
    .array(z.object({ type: z.string(), example: z.string().describe("A kind of local business or organisation, not a made-up company name"), why: z.string(), ask_usd: z.number() }))
    .describe("3 sponsor targets"),
  email_subject: z.string(),
  email_body: z.string().describe("A short, ready-to-send outreach email with [Sponsor name] and [Your name] placeholders"),
});

const ScheduleSchema = PlanSchema.omit({ budget: true, summary: true });
type Schedule = z.infer<typeof ScheduleSchema>;

const ReviewSchema = z.object({
  approved: z.boolean(),
  score: z.number().describe("Overall plan quality from 1 to 10"),
  issues: z.array(z.string()).describe("Specific problems the planner must fix; empty when approved"),
  summary: z.string().describe("Two sentences for the organisers: the shape of the plan and its main risk"),
});
type Review = z.infer<typeof ReviewSchema>;

// ---------------------------------------------------------------- graph state
const last = <T>(init: T) => Annotation<T>({ reducer: (_a, b) => b, default: () => init });

const State = Annotation.Root({
  input: Annotation<WorkflowInput>(),
  briefing: last<Brief | null>(null),
  place: last<Place | null>(null),
  weatherInfo: last<(WeatherAssessment & { data: WeatherReport | null }) | null>(null),
  calendarInfo: last<(CalendarAssessment & { holidays: Holiday[] }) | null>(null),
  budgetInfo: last<(BudgetAssessment & { per_head: number; benchmark: number }) | null>(null),
  sponsorInfo: last<SponsorPitch | null>(null),
  schedule: last<Schedule | null>(null),
  review: last<Review | null>(null),
  passes: last<number>(0),
});
type S = typeof State.State;

/** Per-attendee spend that typically covers a decent version of each kind of event (USD). */
const BENCHMARK: Record<string, number> = { "Academic/Tech": 15, Social: 8, Career: 6, Workshop: 7, Fundraiser: 3 };

const ctx = (s: S) => {
  const i = s.input;
  return JSON.stringify(
    {
      event: { title: i.title, category: i.category, date: i.eventDate ?? "not set", time_window: i.timeWindow || "not set", venue: i.venue || "not set", location: i.location || "not set", expected_attendees: i.attendees, total_budget_usd: Math.round(i.budget), concept: i.concept },
      team: i.members,
      brief: s.briefing,
      weather: s.weatherInfo,
      calendar: s.calendarInfo,
      budget: s.budgetInfo && { verdict: s.budgetInfo.verdict, per_head: s.budgetInfo.per_head, allocation: s.budgetInfo.allocation },
      sponsorship: s.sponsorInfo && { funding_gap_usd: s.sponsorInfo.funding_gap_usd, targets: s.sponsorInfo.targets.map((t) => t.type) },
    },
    null,
    2,
  );
};

// ---------------------------------------------------------------- run
export async function runPlanningWorkflow(input: WorkflowInput, emit: (e: StreamEvent) => void) {
  const steps: TraceStep[] = [];
  const branches: BranchDecision[] = [];
  const started = Date.now();

  const step = async <T>(agent: AgentKey, fn: () => Promise<{ update: Partial<S>; summary: string; details?: Record<string, unknown>; tools?: ToolCallRecord[] }>, pass?: number) => {
    emit({ type: "agent_start", agent, pass });
    const t = Date.now();
    const r = await fn();
    const s: TraceStep = { agent, summary: r.summary, details: r.details, tools: r.tools, ms: Date.now() - t, ...(pass ? { pass } : {}) };
    steps.push(s);
    emit({ type: "agent_done", step: s });
    return r.update as T;
  };
  const branch = (b: BranchDecision) => {
    branches.push(b);
    emit({ type: "branch", branch: b });
    return b.to === "end" ? END : b.to;
  };

  // 1. Brief Analyst
  const briefNode = (s: S) =>
    step<Partial<S>>("brief", async () => {
      const brief = await llm()
        .withStructuredOutput(BriefSchema, { name: "brief" })
        .invoke([
          new SystemMessage("You are the Brief Analyst for a student club event planner. Extract structured requirements from the organisers' description. Infer the setting from words like quad, lawn, park, outdoor, rooftop, field. Do not invent details that are not implied."),
          new HumanMessage(ctx(s)),
        ]);
      return {
        update: { briefing: brief },
        summary: `${brief.setting[0]!.toUpperCase() + brief.setting.slice(1)} event for ${brief.audience}${brief.overnight ? ", overnight" : ""}${brief.serves_food ? ", with food" : ""}.`,
        details: { goals: brief.goals, must_haves: brief.must_haves, open_questions: brief.open_questions },
      };
    });

  // 2. Weather Scout: a tool-calling agent that decides which lookups to make.
  const weatherNode = (s: S) =>
    step<Partial<S>>("weather", async () => {
      const tools: ToolCallRecord[] = [];
      let place: Place | null = null;
      let data: WeatherReport | null = null;
      const model = llm().bindTools([geocodeTool, weatherTool]);
      const messages: BaseMessage[] = [
        new SystemMessage(
          "You are the Weather Scout. Use the tools to find the event location's coordinates, then the weather for the event date. Call geocode_location first, then get_weather with the returned latitude and longitude. When you have the data, reply with a short plain-text note.",
        ),
        new HumanMessage(`Location: ${s.input.location}\nEvent date: ${s.input.eventDate}`),
      ];
      for (let i = 0; i < 4; i++) {
        const ai = await model.invoke(messages);
        messages.push(ai);
        if (!ai.tool_calls?.length) break;
        for (const call of ai.tool_calls) {
          let output: unknown;
          let ok = true;
          try {
            const args = call.args as Record<string, unknown>;
            const raw =
              call.name === "geocode_location"
                ? await geocodeTool.invoke(args as { query: string })
                : await weatherTool.invoke(args as { latitude: number; longitude: number; date: string });
            output = JSON.parse(String(raw));
            if (call.name === "geocode_location" && output && !(output as { error?: string }).error) place = output as Place;
            if (call.name === "get_weather") data = output as WeatherReport;
          } catch (e) {
            ok = false;
            output = { error: e instanceof Error ? e.message : String(e) };
          }
          // Every tool call gets an answer, including failures, so the model can react.
          messages.push(new ToolMessage({ tool_call_id: call.id ?? "", name: call.name, content: JSON.stringify(output) }));
          tools.push({ name: call.name, input: call.args, output, ok });
        }
      }
      const assessment = await llm()
        .withStructuredOutput(WeatherSchema, { name: "weather_assessment" })
        .invoke([
          new SystemMessage(
            `You are the Weather Scout. Assess weather risk for a ${s.briefing?.setting} event using ONLY the tool results given. If there is no weather data, say so and rate risk medium. Rain chance above 40% or a rainy-day share above 35%, heat above 32°C, cold below 5°C or wind above 40 km/h make a backup plan necessary.`,
          ),
          new HumanMessage(
            JSON.stringify({ location: s.input.location, date: s.input.eventDate, tool_results: tools.map((t) => ({ tool: t.name, ok: t.ok, result: t.output })) }),
          ),
        ]);
      return {
        update: { place, weatherInfo: { ...assessment, data } },
        summary: `${assessment.conditions} Risk: ${assessment.risk}${assessment.backup_plan_needed ? "; backup plan needed" : ""}.`,
        details: { recommendations: assessment.recommendations, place: place && `${(place as Place).name}, ${(place as Place).region ?? (place as Place).country}`, data },
        tools,
      };
    });

  // 3. Calendar Scout
  const calendarNode = (s: S) =>
    step<Partial<S>>("calendar", async () => {
      const tools: ToolCallRecord[] = [];
      let place = s.place;
      if (!place && s.input.location) {
        place = await geocode(s.input.location).catch(() => null);
        tools.push({ name: "geocode_location", input: { query: s.input.location }, output: place ?? { error: "Place not found" }, ok: Boolean(place) });
      }
      let holidays: Holiday[] = [];
      if (place && s.input.eventDate) {
        try {
          holidays = await holidaysNear(place.country_code, s.input.eventDate);
          tools.push({ name: "get_public_holidays", input: { country: place.country_code, date: s.input.eventDate }, output: holidays, ok: true });
        } catch (e) {
          tools.push({ name: "get_public_holidays", input: { country: place.country_code }, output: { error: String(e) }, ok: false });
        }
      }
      const weekday = s.input.eventDate ? new Date(s.input.eventDate + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : null;
      const assessment = await llm()
        .withStructuredOutput(CalendarSchema, { name: "calendar_assessment" })
        .invoke([
          new SystemMessage(
            "You are the Calendar Scout for student events. Judge whether the date will hurt attendance: public holidays and long weekends (students travel home), Friday nights for daytime-only campus buildings, and typical semester pressure points (finals in early-to-mid December and late April to May, midterms in mid-October and early March). Use only the holiday data given; do not invent holidays.",
          ),
          new HumanMessage(JSON.stringify({ date: s.input.eventDate ?? "not set", weekday, country: place?.country ?? "unknown", holidays_within_7_days: holidays, audience: s.briefing?.audience })),
        ]);
      return {
        update: { place, calendarInfo: { ...assessment, holidays } },
        summary: `${weekday ? `${weekday} ${s.input.eventDate}` : "No date set"}: ${holidays.length ? `${holidays.length} public holiday${holidays.length === 1 ? "" : "s"} within a week` : "no public holidays within a week"}. Risk: ${assessment.risk}.`,
        details: { conflicts: assessment.conflicts, advice: assessment.advice, holidays },
        tools,
      };
    });

  // 4. Budget Strategist
  const budgetNode = (s: S) =>
    step<Partial<S>>("budget", async () => {
      const total = Math.max(0, Math.round(s.input.budget));
      const people = Math.max(1, s.input.attendees || 1);
      const per_head = Math.round((total / people) * 100) / 100;
      const benchmark = (BENCHMARK[s.input.category] ?? 8) + (s.briefing?.overnight ? 6 : 0) + (s.briefing?.serves_food ? 2 : 0);
      const a = await llm()
        .withStructuredOutput(BudgetSchema, { name: "budget_plan" })
        .invoke([
          new SystemMessage(
            `You are the Budget Strategist. The budget is $${total} for about ${people} attendees: $${per_head} per person. A comfortable ${s.input.category} event like this typically needs about $${benchmark} per person. Call it "lean" when it is clearly below that and outside funding would materially improve the event. Allocation amounts must be whole dollars summing exactly to ${total}; include a contingency line. Account for the weather and calendar findings (for example a tent or indoor backup).`,
          ),
          new HumanMessage(ctx(s)),
        ]);
      // Make the allocation add up exactly.
      const allocation = a.allocation.map((x) => ({ category: x.category, amount: Math.max(0, Math.round(x.amount)) }));
      const drift = total - allocation.reduce((n, x) => n + x.amount, 0);
      if (allocation.length && drift) allocation[allocation.length - 1]!.amount = Math.max(0, allocation[allocation.length - 1]!.amount + drift);
      return {
        update: { budgetInfo: { ...a, allocation, per_head, benchmark } },
        summary: `$${per_head}/attendee vs ~$${benchmark} benchmark → ${a.verdict}. ${a.reasoning}`,
        details: { allocation, savings_ideas: a.savings_ideas },
      };
    });

  // 5. Sponsorship Agent (only on the lean branch)
  const sponsorNode = (s: S) =>
    step<Partial<S>>("sponsor", async () => {
      const gapGuess = Math.max(0, Math.round((s.budgetInfo!.benchmark - s.budgetInfo!.per_head) * Math.max(1, s.input.attendees)));
      const p = await llm()
        .withStructuredOutput(SponsorSchema, { name: "sponsorship" })
        .invoke([
          new SystemMessage(
            `You are the Sponsorship Agent for a student club. The event is about $${gapGuess} short of a comfortable budget. Suggest 3 realistic sponsor types near a university (local businesses, campus departments, alumni groups, student government funds) with a sensible ask each, and write a short, warm outreach email. Do not invent specific company names; describe the kind of sponsor instead.`,
          ),
          new HumanMessage(ctx(s)),
        ]);
      const pitch: SponsorPitch = { ...p, funding_gap_usd: Math.round(p.funding_gap_usd || gapGuess) };
      return {
        update: { sponsorInfo: pitch },
        summary: `Funding gap ≈ $${pitch.funding_gap_usd}. Targets: ${pitch.targets.map((t) => t.type).join(", ")}. Outreach email drafted.`,
        details: { targets: pitch.targets },
      };
    });

  // 6. Logistics Planner (runs again if the reviewer rejects the plan)
  const schedulerNode = (s: S) => {
    const pass = s.passes + 1;
    return step<Partial<S>>(
      "scheduler",
      async () => {
        const fixes = s.review && !s.review.approved ? `\n\nThe Risk Reviewer rejected your previous draft. Fix every issue:\n- ${s.review.issues.join("\n- ")}` : "";
        const plan = await llm("medium")
          .withStructuredOutput(ScheduleSchema, { name: "event_plan" })
          .invoke([
            new SystemMessage(
              `You are the Logistics Planner for a student club event. Using everything the other agents found, write the execution plan.
- Assign tasks only to team members in the input, by their exact id, matching each person's title and focus and spreading the load. Use null when nobody fits.
- 3-5 phases working back from the event date ("Phase 1: 4 Weeks Out" ...), plus a wrap-up phase with negative days_before. 14-22 tasks.
- Turn findings into tasks: weather backup plan or rain venue when the Weather Scout says one is needed, date conflicts from the Calendar Scout, and sponsorship outreach tasks when a sponsorship plan exists.
- timeline is the day-of run of show in 24-hour HH:MM, 6-10 entries, starting with setup and ending with clean-up.
- compliance lists approvals student events commonly need; describe what to check and which office usually handles it. Never invent form numbers or policies.
- Be specific to this event; no generic filler.`,
            ),
            new HumanMessage(ctx(s) + fixes),
          ]);
        const tasks = plan.phases.reduce((n, p) => n + p.tasks.length, 0);
        return {
          update: { schedule: plan, passes: pass },
          summary: `${pass > 1 ? "Revised draft: " : ""}${tasks} tasks in ${plan.phases.length} phases, ${plan.timeline.length}-slot run of show, ${plan.compliance.length} approvals, ${plan.roles.length} roles.`,
          details: { phases: plan.phases.map((p) => `${p.name} (${p.tasks.length})`) },
        };
      },
      pass,
    );
  };

  // 7. Risk Reviewer
  const reviewerNode = (s: S) =>
    step<Partial<S>>(
      "reviewer",
      async () => {
        const r = await llm()
          .withStructuredOutput(ReviewSchema, { name: "review" })
          .invoke([
            new SystemMessage(
              `You are the Risk Reviewer. Audit the draft plan against the findings. Reject it (approved=false) only for real gaps: a backup plan missing when the Weather Scout said one is needed; a date conflict that is ignored; no sponsorship tasks when a sponsorship plan exists; tasks left unassigned when team members fit; no setup or clean-up in the run of show; food served without a food-safety or dietary task. Otherwise approve. Be concise and specific.`,
            ),
            new HumanMessage(`${ctx(s)}\n\nDRAFT PLAN:\n${JSON.stringify(s.schedule)}`),
          ]);
        return {
          update: { review: r },
          summary: `${r.approved ? "Approved" : "Sent back"} (score ${r.score}/10). ${r.approved ? r.summary : r.issues.slice(0, 2).join(" ")}`,
          details: { issues: r.issues },
        };
      },
      s.passes,
    );

  const graph = new StateGraph(State)
    .addNode("brief", briefNode)
    .addNode("weather", weatherNode)
    .addNode("calendar", calendarNode)
    .addNode("budget", budgetNode)
    .addNode("sponsor", sponsorNode)
    .addNode("scheduler", schedulerNode)
    .addNode("reviewer", reviewerNode)
    .addEdge(START, "brief")
    // Branch 1: only events held outdoors (with a known place and date) get a weather check.
    .addConditionalEdges(
      "brief",
      (s: S) => {
        const outdoor = s.briefing!.setting !== "indoor";
        const can = Boolean(s.input.location && s.input.eventDate);
        return branch(
          outdoor && can
            ? { at: "brief", to: "weather", label: `${s.briefing!.setting} event`, reason: "Held outside, so weather could disrupt it. Checking the forecast." }
            : { at: "brief", to: "calendar", label: outdoor ? "weather check not possible" : "indoor event", reason: outdoor ? "Outdoor event, but no location or date yet, so the weather check is skipped." : "Held indoors, so the weather check is skipped." },
        );
      },
      ["weather", "calendar"],
    )
    .addEdge("weather", "calendar")
    .addEdge("calendar", "budget")
    // Branch 2: a thin budget brings in the Sponsorship Agent.
    .addConditionalEdges(
      "budget",
      (s: S) =>
        branch(
          s.budgetInfo!.verdict === "lean"
            ? { at: "budget", to: "sponsor", label: "lean budget", reason: `$${s.budgetInfo!.per_head} per attendee is below the ~$${s.budgetInfo!.benchmark} benchmark, so a sponsorship plan is added.` }
            : { at: "budget", to: "scheduler", label: "budget covers it", reason: `$${s.budgetInfo!.per_head} per attendee meets the ~$${s.budgetInfo!.benchmark} benchmark, so no sponsorship plan is needed.` },
        ),
      ["sponsor", "scheduler"],
    )
    .addEdge("sponsor", "scheduler")
    .addEdge("scheduler", "reviewer")
    // Branch 3: the reviewer can send the plan back once.
    .addConditionalEdges(
      "reviewer",
      (s: S) =>
        branch(
          !s.review!.approved && s.passes < 2
            ? { at: "reviewer", to: "scheduler", label: "revision requested", reason: s.review!.issues.slice(0, 3).join(" ") || "The reviewer found gaps." }
            : { at: "reviewer", to: "end", label: s.review!.approved ? "approved" : "accepted after revision", reason: s.review!.approved ? "The plan covers the risks the other agents found." : "Revision limit reached; remaining notes are in the summary." },
        ),
      ["scheduler", END],
    )
    .compile();

  emit({ type: "start", model: MODEL(), engine: "langgraph" });
  const final = (await graph.invoke({ input }, { recursionLimit: 25 })) as S;

  const ran = new Set(steps.map((x) => x.agent));
  const trace: AgentTrace = {
    engine: "langgraph",
    model: MODEL(),
    steps,
    branches,
    skipped: (Object.keys(AGENTS) as AgentKey[]).filter((k) => !ran.has(k)),
    sponsorship: final.sponsorInfo,
    ms: Date.now() - started,
  };
  const plan: Plan = {
    summary: final.review?.summary ?? "",
    budget: final.budgetInfo!.allocation,
    roles: final.schedule!.roles,
    phases: final.schedule!.phases,
    timeline: final.schedule!.timeline,
    compliance: final.schedule!.compliance,
  };
  return { plan, trace };
}

/** Make a plan safe to store: valid member ids, whole numbers, valid times. */
export function sanitizePlan(plan: Plan, input: PlanInput): Plan {
  const ids = new Set(input.members.map((m) => m.id));
  const seen = new Set<string>();
  return {
    ...plan,
    roles: plan.roles.filter((r) => ids.has(r.member_id) && !seen.has(r.member_id) && seen.add(r.member_id)),
    phases: plan.phases.map((p) => ({
      ...p,
      tasks: p.tasks.map((t) => ({
        ...t,
        title: t.title.slice(0, 200),
        days_before: Math.round(t.days_before),
        assignee_id: t.assignee_id && ids.has(t.assignee_id) ? t.assignee_id : null,
      })),
    })),
    timeline: plan.timeline.filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)),
  };
}
