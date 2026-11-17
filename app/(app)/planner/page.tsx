import { aiEnabled, getContext } from "@/lib/data";
import { TEMPLATES } from "@/lib/templates";
import type { Member } from "@/lib/types";
import { Icon, PageHeader } from "@/components/ui";
import { PlannerForm } from "./planner-form";

export const metadata = { title: "AI Planner" };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ template?: string; concept?: string }> }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { data } = await ctx.supabase.from("members").select("*").eq("club_id", ctx.club.id).neq("tier", "prospect").order("created_at");
  const roster = ((data ?? []) as Member[]).map((m) => ({ id: m.id, name: m.full_name, title: m.title ?? "" }));
  const t = TEMPLATES.find((x) => x.key === sp.template);
  const ai = aiEnabled();
  const initial = {
    title: t?.title ?? "",
    category: t?.category ?? "Academic/Tech",
    timeWindow: t?.timeWindow ?? "",
    attendees: t?.attendees ?? 0,
    budget: t?.budget ?? 0,
    concept: t?.concept ?? (sp.concept ?? "").slice(0, 500),
  };
  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="chip chip-violet">{ai ? "AI Copilot" : "Plan generator"}</span>
            {t ? `Template: ${t.name}` : "Instant plan"}
          </>
        }
        title="Generate Your Event Plan"
        subtitle="Tell Evently about your team, goals and budget. You get an end-to-end plan with tasks, commitments, a budget split and a day-of schedule that your team can edit."
      >
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-card">
          <span className={`h-2.5 w-2.5 rounded-full ${ai ? "bg-tertiary-container" : "bg-slate-400"}`} />
          <div>
            <div className="text-label-sm">{ai ? "Claude is connected" : "Built-in generator"}</div>
            <div className="text-body-sm text-on-surface-variant">{ai ? "Plans are written for your brief" : "Add an API key in Settings for AI plans"}</div>
          </div>
          <Icon name={ai ? "auto_awesome" : "tune"} className="text-[20px] text-on-surface-variant" />
        </div>
      </PageHeader>
      <PlannerForm key={sp.template ?? "blank"} roster={roster} initial={initial} ai={ai} />
    </>
  );
}
