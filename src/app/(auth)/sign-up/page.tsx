import Link from "next/link";
import type { Metadata } from "next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">
        Build your AI employee
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your workspace — takes about a minute.
      </p>

      <div className="mt-6">
        <SignUpForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
