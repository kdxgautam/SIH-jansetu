import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header, Footer } from "@/components/shell";
import { ChatAssistant } from "@/components/chat-assistant";
import { SITE_URL } from "@/lib/server";
import "./globals.css";

const DESCRIPTION = "Connect community challenges with university expertise and industry support across Jharkhand.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "JanSetu · Jharkhand Innovation Portal", template: "%s · JanSetu" },
  description: DESCRIPTION,
  applicationName: "JanSetu",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "JanSetu", locale: "en_IN", alternateLocale: "hi_IN", url: "/", title: "JanSetu · Jharkhand Innovation Portal", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "JanSetu · Jharkhand Innovation Portal", description: DESCRIPTION },
  robots: { index: true, follow: true },
};
export const viewport = { themeColor: "#15803d" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><body><Providers><Header />{children}<Footer /><ChatAssistant /></Providers></body></html>; }
