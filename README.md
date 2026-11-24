# Evently

Event planning for student clubs: describe an event, add your team and budget, and get an editable plan with roles, a phased checklist, a budget split and a day-of run of show.

Built with Next.js (App Router) and Supabase (Postgres, Auth, row-level security).

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable (anon) key |
| `OPENAI_API_KEY` (or `OPENAI_API_SECRET_KEY`) | no | Turns on the AI planning agents. Without it the built-in generator is used. |
| `OPENAI_MODEL` | no | Model for the agents (default `gpt-5.4-mini`). |

## AI planning workflow

`lib/agents/workflow.ts` is a LangGraph state graph with seven agents:

1. **Brief Analyst** turns the description into structured requirements.
2. **Weather Scout** is a tool-calling agent that geocodes the location and gets the forecast, or historical averages for dates more than 15 days out (Open-Meteo).
3. **Calendar Scout** checks public holidays around the date (Nager.Date).
4. **Budget Strategist** compares cost per attendee with a benchmark and splits the budget.
5. **Sponsorship Agent** proposes sponsor targets and drafts an outreach email.
6. **Logistics Planner** writes roles, the phased checklist, the run of show and approvals.
7. **Risk Reviewer** audits the plan.

Three conditional branches: outdoor events go to the Weather Scout, indoor events skip it; a lean budget brings in the Sponsorship Agent; the reviewer can send the plan back to the Logistics Planner once. Progress streams to the browser from `app/api/plan/route.ts`, and each event's **AI Workflow** tab shows every step, tool call and branch decision.

## Database

SQL migrations live in `supabase/migrations/` and are already applied to the `evently` Supabase project. To set up a new project, run them in order in the Supabase SQL editor.

In Supabase → Authentication → URL Configuration, set the Site URL to your deployed domain so confirmation emails link back to the app.
