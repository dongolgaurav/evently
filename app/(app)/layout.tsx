import Link from "next/link";
import { Suspense } from "react";
import { aiEnabled, getContext, monthStartISO } from "@/lib/data";
import { MONTHLY_AI_PLANS } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { Avatar, Icon, Logo, Progress } from "@/components/ui";
import { NavLinks } from "@/components/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center text-on-surface-variant">
      <Icon name="progress_activity" className="animate-spin text-[28px] text-primary" />
    </div>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { supabase, club, clubs, me } = await getContext();
  const [events, aiPlans, urgent] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("club_id", club.id).neq("status", "completed"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("club_id", club.id).eq("plan_source", "claude").gte("created_at", monthStartISO()),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("club_id", club.id).eq("done", false).lte("due_date", todayISO()),
  ]);
  const used = aiPlans.count ?? 0;
  const ai = aiEnabled();

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed top-0 left-0 z-50 hidden h-screen w-64 flex-col justify-between overflow-y-auto bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:flex">
        <div>
          <div className="flex h-16 items-center justify-between px-4">
            <Logo href="/dashboard" />
            <span className="chip chip-indigo uppercase">Beta</span>
          </div>
          <details className="relative px-4 py-1">
            <summary className="flex items-center justify-between rounded-lg bg-surface-container-low px-2 py-1.5 hover:bg-surface-container">
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="school" className="text-[18px] text-primary" />
                <span className="truncate text-label-md font-semibold">{club.name}</span>
              </span>
              <Icon name="arrow_drop_down" className="text-[18px] text-on-surface-variant" />
            </summary>
            <div className="absolute right-4 left-4 z-10 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
              {clubs.map((c) => (
                <form key={c.id} action="/club/switch" method="post">
                  <input type="hidden" name="club_id" value={c.id} />
                  <button className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-label-md hover:bg-surface-container-low">
                    <span className="truncate">{c.name}</span>
                    {c.id === club.id && <Icon name="check" className="text-[16px] text-primary" />}
                  </button>
                </form>
              ))}
              <Link href="/onboarding" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-label-md text-primary hover:bg-surface-container-low">
                <Icon name="add" className="text-[16px]" /> New club workspace
              </Link>
            </div>
          </details>
          <div className="px-5 pt-4 pb-1 text-label-sm tracking-wider text-on-surface-variant uppercase">Workspace</div>
          <NavLinks eventCount={events.count ?? 0} />
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="rounded-xl bg-surface-container-low p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-label-sm">
                <Icon name="bolt" className="text-[16px] text-primary" /> AI plans
              </span>
              <span className="text-label-sm text-on-surface-variant">{ai ? `${used}/${MONTHLY_AI_PLANS}` : "Off"}</span>
            </div>
            <Progress value={ai ? (used / MONTHLY_AI_PLANS) * 100 : 0} />
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-body-sm text-on-surface-variant">{ai ? "Used this month" : "Built-in generator"}</span>
              <Link href="/settings#ai" className="text-label-sm text-primary">
                Details
              </Link>
            </div>
          </div>
          <details className="relative">
            <summary className="flex items-center justify-between">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={me.full_name} />
                <span className="min-w-0">
                  <span className="block truncate text-label-md leading-tight font-semibold">{me.full_name}</span>
                  <span className="block truncate text-body-sm text-on-surface-variant">{me.title ?? "Member"}</span>
                </span>
              </span>
              <Icon name="unfold_more" className="text-[18px] text-on-surface-variant" />
            </summary>
            <div className="absolute right-0 bottom-full left-0 mb-2 rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
              <Link href="/settings" className="block rounded-lg px-2 py-1.5 text-label-md hover:bg-surface-container-low">
                Profile & settings
              </Link>
              <form action="/auth/signout" method="post">
                <button className="w-full rounded-lg px-2 py-1.5 text-left text-label-md hover:bg-surface-container-low">Sign out</button>
              </form>
            </div>
          </details>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-40 flex h-16 items-center justify-between gap-3 bg-surface/80 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <details className="relative lg:hidden">
              <summary className="rounded-lg p-2 hover:bg-surface-container-low" aria-label="Menu">
                <Icon name="menu" className="text-[22px]" />
              </summary>
              <div className="absolute top-full left-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-2 shadow-lift">
                <NavLinks eventCount={events.count ?? 0} />
                <form action="/auth/signout" method="post" className="mt-1 border-t border-slate-100 px-2 pt-1">
                  <button className="w-full rounded-lg px-2 py-2 text-left text-label-md text-on-surface-variant hover:bg-surface-container-low">Sign out</button>
                </form>
              </div>
            </details>
            <span className="hidden truncate text-label-md text-on-surface-variant sm:inline">{club.name}</span>
            <Icon name="chevron_right" className="hidden text-[16px] text-outline-variant sm:inline" />
            <span className="text-label-md font-semibold">Workspace</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <form action="/events" className="relative hidden items-center md:flex">
              <Icon name="search" className="absolute left-3 text-[18px] text-on-surface-variant" />
              <input
                name="q"
                aria-label="Search events and tasks"
                placeholder="Search events and tasks…"
                className="h-10 w-64 rounded-lg bg-white pr-3 pl-9 text-body-sm shadow-card outline-none placeholder:text-outline focus:ring-2 focus:ring-primary xl:w-80"
              />
            </form>
            <Link
              href="/dashboard#deadlines"
              aria-label={`${urgent.count ?? 0} tasks due or overdue`}
              className="relative rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            >
              <Icon name="notifications" className="text-[22px]" />
              {(urgent.count ?? 0) > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-secondary-container" />}
            </Link>
            <Link href="/planner" className="btn btn-primary">
              <Icon name="add" className="text-[18px]" />
              <span className="hidden sm:inline">Plan New Event</span>
            </Link>
            <Link href="/settings" className="hidden sm:block">
              <Avatar name={me.full_name} />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-8">
          <Suspense fallback={<ShellSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
