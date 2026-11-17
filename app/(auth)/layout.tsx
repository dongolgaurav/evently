import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-surface to-surface-container px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
    </div>
  );
}
