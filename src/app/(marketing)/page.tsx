import { Hero } from "@/components/marketing/sections/hero";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { Capabilities } from "@/components/marketing/sections/capabilities";
import { Industries } from "@/components/marketing/sections/industries";
import { KnowledgeToolsActions } from "@/components/marketing/sections/knowledge-tools-actions";
import { HumanHandoff } from "@/components/marketing/sections/human-handoff";
import { Security } from "@/components/marketing/sections/security";
import { Cta } from "@/components/marketing/sections/cta";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Capabilities />
      <Industries />
      <KnowledgeToolsActions />
      <HumanHandoff />
      <Security />
      <Cta />
    </>
  );
}
