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
| `ANTHROPIC_API_KEY` | no | Enables Claude-written plans. Without it the built-in generator is used. |
| `ANTHROPIC_MODEL` | no | Overrides the Claude model (default `claude-opus-5-5`). |

## Database

SQL migrations live in `supabase/migrations/` and are already applied to the `evently` Supabase project. To set up a new project, run them in order in the Supabase SQL editor.

In Supabase → Authentication → URL Configuration, set the Site URL to your deployed domain so confirmation emails link back to the app.
