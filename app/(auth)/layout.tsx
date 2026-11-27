import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src={IMAGES.auth} alt="Students stargazing at a rooftop club event" fill priority placeholder="blur" sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/85 via-indigo-950/20 to-transparent" />
        <div className="absolute right-10 bottom-10 left-10 text-white">
          <p className="font-display text-headline-md font-bold">Plan the event, not the spreadsheet.</p>
          <p className="mt-2 text-white/80">Evently turns your idea, team and budget into a plan your whole board can run with.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-surface to-surface-container px-4 py-10">
        <div className="mb-6">
          <Logo />
        </div>
        <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
