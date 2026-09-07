import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPreviewCard } from "@/components/marketing/sections/hero-preview-card";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Now onboarding furniture, restaurant, salon, dental &amp; electronics businesses
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Your business has a new employee.
          </h1>

          <p className="mt-6 max-w-lg text-lg text-muted-foreground text-pretty">
            YAZ AI gives businesses AI employees that talk to customers,
            answer questions, qualify leads, book appointments, recommend
            products, and actually get work done — backed by real tools, a
            real knowledge base, and a human who can step in any time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              render={
                <Link href="/sign-up">
                  Build your AI employee
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="outline"
              render={
                <a href="#how-it-works">
                  <Play className="size-4" />
                  See how it works
                </a>
              }
            />
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            No credit card. Set up a working AI employee in minutes, not weeks.
          </p>
        </div>

        <HeroPreviewCard />
      </div>
    </section>
  );
}
