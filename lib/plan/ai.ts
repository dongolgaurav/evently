import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PlanSchema, type Plan, type PlanInput } from "./types";
import { buildTemplatePlan } from "./template";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const SYSTEM = `You plan events for university student clubs. Given the event details and the team, write a practical, specific plan the students can execute.

Rules:
- Assign tasks only to the team members provided, using their exact ids. Match tasks to each person's title and focus, and spread the load so nobody carries far more than the others. Use null when no one fits.
- Budget amounts are whole dollars and must sum exactly to the total budget. Include a contingency line.
- Group tasks into 3-5 phases working back from the event date (for example "Phase 1: 4 Weeks Out"), and include a wrap-up phase with negative days_before for work after the event. 14-22 tasks in total.
- The timeline is the day-of run of show in 24-hour HH:MM, 6-10 entries, starting with setup.
- Compliance items are approvals student events commonly need (room booking, event registration, food service, after-hours access). You do not know this campus's actual rules or form numbers, so describe what to check and which office usually handles it; never invent form numbers, policies or contact names.
- Reflect the specifics in the event concept. Do not pad with generic filler.`;

/** Fix up anything the model got slightly wrong so the plan is safe to store. */
function sanitize(plan: Plan, input: PlanInput): Plan {
  const ids = new Set(input.members.map((m) => m.id));
  const total = Math.max(0, Math.round(input.budget));
  const budget = plan.budget.map((b) => ({ category: b.category, amount: Math.max(0, Math.round(b.amount)) }));
  const drift = total - budget.reduce((s, b) => s + b.amount, 0);
  if (budget.length && drift !== 0) {
    const last = budget[budget.length - 1]!;
    if (last.amount + drift >= 0) last.amount += drift;
    else return { ...plan, budget: buildTemplatePlan(input).budget };
  }
  const seen = new Set<string>();
  return {
    ...plan,
    budget,
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

/**
 * Generate a plan with Claude when an API key is configured; otherwise (or if the
 * request fails or is declined) fall back to the built-in generator.
 */
export async function generatePlan(input: PlanInput): Promise<{ plan: Plan; source: "claude" | "template"; note?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { plan: buildTemplatePlan(input), source: "template" };
  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Plan this event.\n\n${JSON.stringify(
            {
              title: input.title,
              category: input.category,
              event_date: input.eventDate ?? "not set",
              time_window: input.timeWindow || "not set",
              venue: input.venue || "not set",
              expected_attendees: input.attendees,
              total_budget_usd: Math.round(input.budget),
              concept_and_constraints: input.concept,
              team: input.members,
            },
            null,
            2,
          )}`,
        },
      ],
      output_config: { format: zodOutputFormat(PlanSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { plan: buildTemplatePlan(input), source: "template", note: "The AI model did not return a plan, so the built-in generator was used." };
    }
    return { plan: sanitize(response.parsed_output, input), source: "claude" };
  } catch (error) {
    const reason =
      error instanceof Anthropic.AuthenticationError
        ? "The Anthropic API key was rejected"
        : error instanceof Anthropic.RateLimitError
          ? "The AI service is rate limited right now"
          : "The AI service could not be reached";
    console.error("Plan generation failed:", error);
    return { plan: buildTemplatePlan(input), source: "template", note: `${reason}, so the built-in generator was used.` };
  }
}
