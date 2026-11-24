import { aiEnabled, getContext, monthStartISO } from "@/lib/data";
import { deleteClub, updateClub, updateProfile } from "@/lib/actions";
import { MONTHLY_AI_PLANS } from "@/lib/types";
import { Icon, PageHeader, Progress } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, club, me, user } = await getContext();
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("club_id", club.id)
    .eq("plan_source", "ai")
    .gte("created_at", monthStartISO());
  const ai = aiEnabled();
  const used = count ?? 0;
  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, your club workspace and the AI planner." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-headline-sm">Your profile</h2>
          <StateForm action={updateProfile} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Name</span>
              <input className="input" name="full_name" defaultValue={me.full_name} required />
            </label>
            <label>
              <span className="field-label">Role in {club.name}</span>
              <input className="input" name="title" defaultValue={me.title ?? ""} />
            </label>
            <label>
              <span className="field-label">Year</span>
              <input className="input" name="year" defaultValue={me.year ?? ""} placeholder="Junior" />
            </label>
            <label>
              <span className="field-label">Major</span>
              <input className="input" name="major" defaultValue={me.major ?? ""} />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
              <span className="text-body-sm text-on-surface-variant">Signed in as {user.email}</span>
            </div>
          </StateForm>
          <form action="/auth/signout" method="post" className="mt-4 border-t border-slate-100 pt-4">
            <button className="btn btn-soft">
              <Icon name="logout" className="text-[18px]" /> Sign out
            </button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-headline-sm">Club workspace</h2>
          {me.is_admin ? (
            <StateForm action={updateClub} className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">Club name</span>
                <input className="input" name="name" defaultValue={club.name} required minLength={2} maxLength={80} />
              </label>
              <label>
                <span className="field-label">Full organisation name</span>
                <input className="input" name="full_name" defaultValue={club.full_name ?? ""} />
              </label>
              <label>
                <span className="field-label">Current term</span>
                <input className="input" name="term" defaultValue={club.term ?? ""} placeholder="Fall 2026" />
              </label>
              <label>
                <span className="field-label">Semester budget cap ($)</span>
                <input className="input" type="number" min={0} name="semester_budget" defaultValue={club.semester_budget} />
              </label>
              <div className="sm:col-span-2">
                <SubmitButton pendingText="Saving…">Save club settings</SubmitButton>
              </div>
            </StateForm>
          ) : (
            <p className="text-on-surface-variant">
              {club.name}
              {club.term ? ` • ${club.term}` : ""}. Only workspace admins can change club settings.
            </p>
          )}
        </section>

        <section id="ai" className="card scroll-mt-20 p-6">
          <h2 className="mb-1 flex items-center gap-2 text-headline-sm">
            <Icon name="auto_awesome" className="text-[22px] text-tertiary" /> AI planner
          </h2>
          {ai ? (
            <>
              <p className="mb-4 text-on-surface-variant">
                OpenAI is connected. Each plan runs seven agents (brief analysis, weather, holidays, budget, sponsorship, logistics and review). Each club can run {MONTHLY_AI_PLANS} AI plans per calendar month; the count resets on the 1st.
              </p>
              <div className="mb-1 flex justify-between text-label-md">
                <span>Used this month</span>
                <span className="font-semibold">
                  {used} / {MONTHLY_AI_PLANS}
                </span>
              </div>
              <Progress value={(used / MONTHLY_AI_PLANS) * 100} />
            </>
          ) : (
            <p className="text-on-surface-variant">
              No AI key is configured, so the planner uses Evently&apos;s built-in generator, which has no monthly limit. To turn on the AI
              planning agents, whoever hosts this app sets the <code className="rounded bg-surface-container-low px-1">OPENAI_API_KEY</code>{" "}
              environment variable and restarts it.
            </p>
          )}
        </section>

        {me.is_admin && (
          <section className="card p-6">
            <h2 className="mb-1 text-headline-sm">Delete workspace</h2>
            <p className="mb-4 text-on-surface-variant">
              Permanently deletes {club.name} with all of its events, tasks, budgets and roster. This cannot be undone.
            </p>
            <StateForm action={deleteClub} className="flex flex-wrap items-end gap-2">
              <label className="min-w-48 flex-1">
                <span className="field-label">Type the club name to confirm</span>
                <input className="input" name="confirm" placeholder={club.name} autoComplete="off" required />
              </label>
              <SubmitButton className="btn btn-danger" pendingText="Deleting…">
                Delete workspace
              </SubmitButton>
            </StateForm>
          </section>
        )}
      </div>
    </>
  );
}
