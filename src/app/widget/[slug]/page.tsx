import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWidgetBusinessInfo } from "@/services/conversations/widget-message";
import { WidgetChat } from "./widget-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const info = await getWidgetBusinessInfo(slug);
  return { title: info ? `Chat with ${info.name}` : "Chat" };
}

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const info = await getWidgetBusinessInfo(slug);
  if (!info) notFound();

  return (
    <div className="flex h-screen flex-col bg-background">
      <WidgetChat slug={slug} businessName={info.name} agentName={info.agentName} />
    </div>
  );
}
