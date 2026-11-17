import Link from "next/link";
import { signIn } from "@/lib/actions";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-headline-md">Welcome back</h1>
      <p className="mt-1 mb-6 text-on-surface-variant">Sign in to your club workspace.</p>
      <StateForm action={signIn} className="space-y-4">
        <label className="block">
          <span className="field-label">Email</span>
          <input className="input" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input className="input" type="password" name="password" autoComplete="current-password" required />
        </label>
        <SubmitButton className="btn btn-primary w-full" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </StateForm>
      <p className="mt-6 text-center text-on-surface-variant">
        New to Evently?{" "}
        <Link href="/signup" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </>
  );
}
