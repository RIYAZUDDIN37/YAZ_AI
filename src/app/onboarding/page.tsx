import type { Metadata } from "next";
import { requireMembership } from "@/server/authorization/require-session";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const { membership } = await requireMembership();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Let&apos;s set up your AI employee
      </h1>
      <p className="mt-1 text-muted-foreground">
        Three quick steps — you can refine everything else afterwards.
      </p>

      <div className="mt-8">
        <OnboardingWizard organizationId={membership.organizationId} />
      </div>
    </div>
  );
}
