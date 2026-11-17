import { z } from "zod";

export type PlanMember = { id: string; name: string; title: string; focus: string };

export type PlanInput = {
  title: string;
  category: string;
  eventDate: string | null;
  timeWindow: string;
  venue: string;
  attendees: number;
  budget: number;
  concept: string;
  members: PlanMember[];
};

export const PlanSchema = z.object({
  summary: z.string().describe("Two sentences on the shape of the plan and its biggest risk."),
  roles: z.array(
    z.object({
      member_id: z.string().describe("id of a team member from the input"),
      responsibility: z.string().describe("What this person owns for the event, under 80 characters"),
    }),
  ),
  budget: z.array(
    z.object({
      category: z.string(),
      amount: z.number().describe("Whole dollars. All amounts must sum to the total budget."),
    }),
  ),
  phases: z.array(
    z.object({
      name: z.string().describe('e.g. "Phase 1: 4 Weeks Out"'),
      subtitle: z.string(),
      tasks: z.array(
        z.object({
          title: z.string(),
          detail: z.string(),
          assignee_id: z.string().nullable().describe("id of a team member from the input, or null"),
          days_before: z.number().describe("Days before the event date this is due; 0 = event day"),
          priority: z.boolean(),
        }),
      ),
    }),
  ),
  timeline: z.array(
    z.object({
      time: z.string().describe("24-hour HH:MM"),
      title: z.string(),
      detail: z.string(),
      location: z.string(),
    }),
  ),
  compliance: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      reference: z.string().describe("Which campus office usually handles this, e.g. Facilities"),
    }),
  ),
});

export type Plan = z.infer<typeof PlanSchema>;
