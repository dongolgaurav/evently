import { Suspense } from "react";
import { getUser } from "@/lib/data";
import { createClub, createDemoClub } from "@/lib/actions";
import { StateForm, SubmitButton } from "@/components/client";
import { Icon, Logo } from "@/components/ui";

export const metadata = { title: "Set up your club" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-surface to-surface-container px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <Suspense fallback={<p className="text-on-surface-variant">Loading…</p>}>
          <Onboarding />
        </Suspense>
      </div>
    </div>
  );
}

async function Onboarding() {
  const { user } = await getUser();
  const name = String(user.user_metadata?.full_name ?? "");
  return (
    <>
      <h1 className="text-headline-md">Set up your club workspace</h1>
      <p className="mt-1 mb-6 text-on-surface-variant">
        This is where your events, roster and budgets live. You can invite the rest of your board afterwards.
      </p>
      <StateForm action={createClub} className="space-y-4">
        <label className="block">
          <span className="field-label">Club name</span>
          <input className="input" name="name" placeholder="ACM Student Chapter" required minLength={2} maxLength={80} />
        </label>
        <label className="block">
          <span className="field-label">Full organisation name (optional)</span>
          <input className="input" name="full_name" placeholder="Association for Computing Machinery" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Current term</span>
            <input className="input" name="term" placeholder="Fall 2026" />
          </label>
          <label className="block">
            <span className="field-label">Your role</span>
            <input className="input" name="title" placeholder="Club President" />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Your name</span>
          <input className="input" name="member_name" defaultValue={name} required />
        </label>
        <SubmitButton className="btn btn-primary w-full" pendingText="Creating workspace…">
          Create workspace
        </SubmitButton>
      </StateForm>
      <div className="my-5 flex items-center gap-3 text-body-sm text-on-surface-variant">
        <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
      </div>
      <StateForm action={createDemoClub} className="space-y-2">
        <SubmitButton className="btn btn-soft w-full" pendingText="Setting up the demo club…">
          <Icon name="rocket_launch" className="text-[18px] text-tertiary" /> Explore with a demo club
        </SubmitButton>
        <p className="text-center text-body-sm text-on-surface-variant">A sample board, three planned events (two by the AI agents) and live RSVPs.</p>
      </StateForm>
      <form action="/auth/signout" method="post" className="mt-4 text-center">
        <button className="text-body-sm text-on-surface-variant underline">Sign out ({user.email})</button>
      </form>
    </>
  );
}
