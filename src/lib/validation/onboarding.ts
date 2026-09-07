import { z } from "zod";
import { INDUSTRIES } from "@/config/industries";

const industryValues = INDUSTRIES.map((industry) => industry.value) as [
  string,
  ...string[],
];

export const onboardingSchema = z.object({
  organizationId: z.string().min(1),
  businessName: z.string().trim().min(2, "Enter a business name").max(80),
  industry: z.enum(industryValues),
  agentName: z.string().trim().min(2, "Give your AI employee a name").max(40),
  agentTitle: z.string().trim().min(2, "Give your AI employee a role").max(60),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
