import Link from "next/link";
import { Logo } from "./ui";

/** Frame for pages that guests see without signing in. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-surface to-surface-container-low">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link href="/signup" className="text-label-md text-on-surface-variant hover:text-primary">
          Plan your own event →
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">{children}</main>
      <footer className="py-6 text-center text-body-sm text-on-surface-variant">
        Event pages by <Link href="/" className="font-semibold text-primary">Evently</Link>, the planner for student clubs.
      </footer>
    </div>
  );
}
