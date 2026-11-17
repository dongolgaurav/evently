"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions";
import { Icon } from "./ui";

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-body-sm ${state.error ? "bg-error-container text-on-error-container" : "bg-emerald-50 text-emerald-800"}`}
    >
      {state.error ?? state.message}
    </p>
  );
}

/** A <form> wired to a Server Action that reports {error, message}. */
export function StateForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  useEffect(() => {
    if (state?.redirect) window.location.assign(state.redirect);
  }, [state]);
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/events", label: "My Events", icon: "calendar_today" },
  { href: "/planner", label: "AI Planner", icon: "auto_awesome" },
  { href: "/templates", label: "Templates", icon: "content_copy" },
  { href: "/team", label: "Team & Roster", icon: "groups" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function NavLinks({ eventCount }: { eventCount: number }) {
  const path = usePathname();
  return (
    <nav className="space-y-1 px-2">
      {NAV.map((item) => {
        const active = path === item.href || path.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between rounded-lg px-2 py-2 text-label-md transition-colors ${
              active
                ? "bg-primary-container font-semibold text-white"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name={item.icon} className={`text-[20px] ${!active && item.href === "/planner" ? "text-tertiary" : ""}`} />
              {item.label}
            </span>
            {item.href === "/events" && eventCount > 0 && (
              <span className={`chip ${active ? "bg-white/20 text-white" : "chip-slate"}`}>{eventCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Auto-submits its form when the value changes (assignee pickers, date inputs). */
export function AutoSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

export function AutoInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
      <Icon name="print" className="text-[18px]" /> Print / save as PDF
    </button>
  );
}
