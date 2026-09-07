import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Give your business its first AI employee.
        </h2>
        <p className="mt-4 text-muted-foreground text-pretty">
          Pick an industry, name your employee, upload what it should know —
          and watch it work.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            render={
              <Link href="/sign-up">
                Build your AI employee
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
