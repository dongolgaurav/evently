import Link from "next/link";
import { signUp } from "@/lib/actions";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-headline-md">Create your account</h1>
      <p className="mt-1 mb-6 text-on-surface-variant">
        Free for student organisers. If a club admin already added your email to their roster, you&apos;ll join that
        workspace automatically.
      </p>
      <StateForm action={signUp} className="space-y-4">
        <label className="block">
          <span className="field-label">Your name</span>
          <input className="input" name="full_name" autoComplete="name" required />
        </label>
        <label className="block">
          <span className="field-label">Email</span>
          <input className="input" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required />
          <span className="mt-1 block text-body-sm text-on-surface-variant">At least 8 characters.</span>
        </label>
        <SubmitButton className="btn btn-primary w-full" pendingText="Creating account…">
          Create account
        </SubmitButton>
      </StateForm>
      <p className="mt-6 text-center text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </>
  );
}
