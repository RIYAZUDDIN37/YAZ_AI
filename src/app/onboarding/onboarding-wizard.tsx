"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { TextField } from "@/components/form/text-field";
import { INDUSTRIES } from "@/config/industries";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validation/onboarding";
import { completeOnboardingAction } from "./actions";

const STEPS = ["Business", "AI employee", "Review"] as const;

export function OnboardingWizard({ organizationId }: { organizationId: string }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationId,
      businessName: "",
      industry: undefined as never,
      agentName: "",
      agentTitle: "",
    },
  });

  const industry = form.watch("industry");
  const selectedIndustry = INDUSTRIES.find((i) => i.value === industry);

  async function goNext() {
    const fieldsForStep: Record<number, (keyof OnboardingInput)[]> = {
      0: ["businessName", "industry"],
      1: ["agentName", "agentTitle"],
      2: [],
    };
    const valid = await form.trigger(fieldsForStep[step]);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit(values: OnboardingInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await completeOnboardingAction(values);
      if (result?.error) setFormError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                i < step
                  ? "bg-brand text-brand-foreground"
                  : i === step
                    ? "border-2 border-brand text-brand"
                    : "border border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                i === step ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {step === 0 && (
          <FieldGroup>
            <div>
              <h2 className="mb-1 font-medium">What&apos;s your business called?</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                This is the business your AI employee will represent.
              </p>
              <TextField
                control={form.control}
                name="businessName"
                label="Business name"
                placeholder="Urban Living"
                autoFocus
              />
            </div>

            <div>
              <h2 className="mb-1 font-medium">What kind of business is it?</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                This shapes what your AI employee handles day to day.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {INDUSTRIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      form.setValue("industry", option.value, { shouldValidate: true });
                      if (!form.getValues("agentName")) {
                        form.setValue("agentName", option.defaultAgentName);
                      }
                      if (!form.getValues("agentTitle")) {
                        form.setValue("agentTitle", option.defaultAgentTitle);
                      }
                    }}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      industry === option.value
                        ? "border-brand bg-accent"
                        : "border-border hover:bg-accent/50",
                    )}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground text-pretty">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
              {form.formState.errors.industry && (
                <p className="mt-2 text-sm text-destructive">
                  Pick an industry to continue.
                </p>
              )}
            </div>
          </FieldGroup>
        )}

        {step === 1 && (
          <FieldGroup>
            <div>
              <h2 className="mb-1 font-medium">Name your AI employee</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {selectedIndustry
                  ? `Suggested for ${selectedIndustry.label.toLowerCase()} businesses — change it if you like.`
                  : "You can change this any time later."}
              </p>
            </div>
            <TextField control={form.control} name="agentName" label="Name" placeholder="Maya" autoFocus />
            <TextField
              control={form.control}
              name="agentTitle"
              label="Role / title"
              placeholder="Customer & Sales Agent"
            />
          </FieldGroup>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium">Review</h2>
            <dl className="space-y-3 rounded-lg border border-border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Business</dt>
                <dd className="font-medium">{form.getValues("businessName")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Industry</dt>
                <dd className="font-medium">{selectedIndustry?.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">AI employee</dt>
                <dd className="font-medium">
                  {form.getValues("agentName")} · {form.getValues("agentTitle")}
                </dd>
              </div>
            </dl>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || pending}>
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create my AI employee
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
