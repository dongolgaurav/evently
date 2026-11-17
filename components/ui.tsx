import Link from "next/link";
import { initials } from "@/lib/format";

export function Icon({ name, className = "", fill = false }: { name: string; className?: string; fill?: boolean }) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined ${className}`}
      style={fill ? { fontVariationSettings: '"FILL" 1' } : undefined}
    >
      {name}
    </span>
  );
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
];

export function Avatar({ name, size = 32, className = "" }: { name: string; size?: number; className?: string }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) return null;
  return (
    <div className="flex items-center -space-x-2">
      {names.slice(0, max).map((n, i) => (
        <Avatar key={i} name={n} size={28} className="ring-2 ring-white" />
      ))}
      {names.length > max && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-high text-badge-xs ring-2 ring-white">
          +{names.length - max}
        </span>
      )}
    </div>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-white">
        <Icon name="event_available" className="text-[20px]" fill />
      </span>
      <span className="font-display text-headline-sm tracking-tight">Evently</span>
    </Link>
  );
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "green" | "orange" | "violet" }) {
  const color = { primary: "bg-primary", green: "bg-emerald-600", orange: "bg-secondary-container", violet: "bg-tertiary-container" }[tone];
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
        <Icon name={icon} className="text-[28px]" />
      </span>
      <h3 className="text-headline-sm">{title}</h3>
      <p className="mt-1 max-w-sm text-body-md text-on-surface-variant">{body}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 pt-6 pb-6 md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 flex items-center gap-2 text-label-sm tracking-wider text-on-surface-variant uppercase">{eyebrow}</div>}
        <h1 className="text-headline-lg tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
