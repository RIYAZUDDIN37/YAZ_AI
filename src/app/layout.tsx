import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProviders } from "@/components/providers/root-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "YAZ AI — AI employees that actually work",
    template: "%s · YAZ AI",
  },
  description:
    "YAZ AI gives businesses AI employees that talk to customers, answer questions, qualify leads, book appointments, recommend products, and get real work done — backed by real tools, not just chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
