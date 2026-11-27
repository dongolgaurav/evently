import Image from "next/image";
import Link from "next/link";
import { categoryImage } from "@/lib/images";
import { getContext } from "@/lib/data";
import { TEMPLATES } from "@/lib/templates";
import { money } from "@/lib/format";
import { Icon, PageHeader } from "@/components/ui";
import { categoryStyle } from "@/components/event-card";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  await getContext();
  return (
    <>
      <PageHeader title="Templates" subtitle="Start from a common campus event. Each template pre-fills the planner; you adjust the details before generating." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((t) => {
          const style = categoryStyle(t.category);
          return (
            <article key={t.key} className="card flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
              <Image src={categoryImage(t.category)} alt="" placeholder="blur" sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw" className="aspect-[16/9] h-auto w-full object-cover" />
              <div className="flex flex-1 flex-col p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.box}`}>
                  <Icon name={t.icon} className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-headline-sm">{t.name}</h2>
                  <span className="chip chip-slate">{t.category}</span>
                </div>
              </div>
              <p className="flex-1 text-on-surface-variant">{t.blurb}</p>
              <dl className="my-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-container-low p-3 text-center">
                {[
                  ["Attendees", `~${t.attendees}`],
                  ["Budget", money(t.budget)],
                  ["Window", t.timeWindow],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-body-sm text-on-surface-variant">{k}</dt>
                    <dd className="text-label-sm">{v}</dd>
                  </div>
                ))}
              </dl>
              <Link href={`/planner?template=${t.key}`} className="btn btn-primary w-full">
                Use this template <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
