export const money = (n: number | string | null | undefined) =>
  "$" + Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const moneyExact = (n: number | string | null | undefined) =>
  "$" + Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Parse a YYYY-MM-DD string as a calendar day (UTC, so it never shifts). */
export const parseDay = (d: string) => new Date(d + "T00:00:00Z");

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!d) return "Date TBD";
  return parseDay(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

export const fmtShort = (d: string | null | undefined) =>
  d ? parseDay(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "No date";

export const fmtWeekday = (d: string | null | undefined) =>
  d
    ? parseDay(d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
    : "Date TBD";

export function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.round((parseDay(d).getTime() - parseDay(todayISO()).getTime()) / 86400000);
}

export function dueLabel(d: string | null | undefined) {
  const n = daysUntil(d);
  if (n === null) return "No due date";
  if (n < 0) return `Overdue ${-n}d`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n < 7) return `Due in ${n}d`;
  return fmtShort(d);
}

/** "13:30:00" -> "1:30 PM" */
export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : name;
};
