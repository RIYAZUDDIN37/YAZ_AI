"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WidgetPanel({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const widgetUrl = origin ? `${origin}/widget/${slug}` : "";
  const snippet = widgetUrl
    ? `<iframe src="${widgetUrl}" style="width:380px;height:560px;border:none;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12)" title="Chat with us"></iframe>`
    : "";

  function copy() {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground text-pretty">
        Paste this on your website to let real customers chat with your AI employee directly — the
        exact same orchestrator that handles Inbox conversations, running against a real
        (anonymous) customer and conversation. Rate-limited per visitor so it can&apos;t be
        hammered.
      </p>

      <div className="relative rounded-lg border border-border bg-muted/40 p-3">
        <pre className="overflow-x-auto text-xs whitespace-pre-wrap">{snippet || "Loading…"}</pre>
        <Button
          size="icon-sm"
          variant="outline"
          className="absolute top-2 right-2"
          onClick={copy}
          disabled={!snippet}
          aria-label="Copy embed code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>

      {widgetUrl ? (
        <a
          href={widgetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
        >
          Open a live preview <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
