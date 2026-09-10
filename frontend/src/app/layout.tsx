import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header, Footer } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = { title: "JanSetu · Jharkhand Innovation Portal", description: "Connect community challenges with university expertise and industry support across Jharkhand." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Providers><Header />{children}<Footer /></Providers></body></html>; }
